"""
Metrics service — expanded dashboard KPIs for the admin panel.

Calculates:
- Revenue by period (today, week, month)
- Order counts by period and status
- Low-stock presentations (with product image)
- Top/bottom selling products (by confirmed order quantity)
- Sales breakdown by gender with optional date range
- Abandoned cart product frequency (from checkout_iniciado JSONB)
- Promotion performance stats (active and all)
"""

import json
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import EstadoPedidoEnum, Pedido, PedidoItem
from app.modules.products.models import GeneroEnum, Perfume, Presentacion, Imagen
from app.modules.orders.models import CheckoutIniciado
from app.modules.promotions.models import Promocion

DEFAULT_LOW_STOCK_THRESHOLD = 15   # Above this → STOCK BAJO (yellow)
DEFAULT_CRITICAL_THRESHOLD = 5    # At or below this → STOCK CRÍTICO/AGOTADO (red)


async def get_dashboard_metrics(db: AsyncSession) -> dict:
    """Return aggregated KPIs for the admin dashboard."""
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    # ── Revenue from confirmed orders ──────────────────────────────────────
    confirmed_filter = Pedido.estado == EstadoPedidoEnum.CONFIRMADO

    async def revenue_in(start: datetime) -> float:
        result = await db.execute(
            select(func.coalesce(func.sum(Pedido.total), 0)).where(
                confirmed_filter,
                Pedido.created_at >= start,
            )
        )
        return float(result.scalar_one())

    async def orders_count_in(start: datetime) -> int:
        result = await db.execute(
            select(func.count()).where(Pedido.created_at >= start)
        )
        return int(result.scalar_one())

    revenue_today = await revenue_in(today_start)
    revenue_week = await revenue_in(week_start)
    revenue_month = await revenue_in(month_start)

    orders_today = await orders_count_in(today_start)
    orders_week = await orders_count_in(week_start)
    orders_month = await orders_count_in(month_start)

    # ── Order counts by status ─────────────────────────────────────────────
    status_counts: dict[str, int] = {}
    for estado in EstadoPedidoEnum:
        count_result = await db.execute(
            select(func.count()).where(Pedido.estado == estado)
        )
        status_counts[estado.value] = count_result.scalar_one()

    # ── Total pending amount ────────────────────────────────────────────────
    pending_amount_result = await db.execute(
        select(func.coalesce(func.sum(Pedido.total), 0)).where(
            Pedido.estado == EstadoPedidoEnum.PENDIENTE
        )
    )
    pending_total = float(pending_amount_result.scalar_one())

    # ── Ticket promedio del mes ─────────────────────────────────────────────
    ticket_promedio_mes = round(revenue_month / orders_month, 2) if orders_month > 0 else 0.0

    # ── Active promotions KPIs ─────────────────────────────────────────────

    active_promos_result = await db.execute(
        select(func.count()).where(Promocion.activa == True)  # noqa: E712
    )
    active_promos_count = int(active_promos_result.scalar_one())

    # Revenue/orders from confirmed pedidos that had a discount (proxy for promo usage)
    promo_orders_result = await db.execute(
        select(
            func.count(Pedido.id).label("count"),
            func.coalesce(func.sum(Pedido.total), 0).label("revenue"),
        ).where(
            Pedido.estado == EstadoPedidoEnum.CONFIRMADO,
            Pedido.descuento_total > 0,
        )
    )
    promo_row = promo_orders_result.one()
    active_promos_orders = int(promo_row.count)
    active_promos_revenue = float(promo_row.revenue)

    # ── Low stock presentations ─────────────────────────────────────────────
    low_stock_result = await db.execute(
        select(Presentacion)
        .where(Presentacion.stock < DEFAULT_LOW_STOCK_THRESHOLD)
        .order_by(Presentacion.stock.asc())
        .limit(20)
    )
    low_stock_items = []
    for pres in low_stock_result.scalars().all():
        perfume_result = await db.execute(
            select(Perfume).where(Perfume.id == pres.perfume_id)
        )
        perfume = perfume_result.scalar_one_or_none()
        imagen_url = None
        if perfume:
            img_result = await db.execute(
                select(Imagen)
                .where(Imagen.perfume_id == perfume.id, Imagen.es_principal == True)  # noqa: E712
                .limit(1)
            )
            img = img_result.scalar_one_or_none()
            if not img:
                img_any = await db.execute(
                    select(Imagen).where(Imagen.perfume_id == perfume.id).limit(1)
                )
                img = img_any.scalar_one_or_none()
            if img:
                imagen_url = img.url

        low_stock_items.append(
            {
                "presentacion_id": str(pres.id),
                "perfume_nombre": perfume.nombre if perfume else "Desconocido",
                "tamano_ml": pres.tamano_ml,
                "stock": pres.stock,
                "imagen_url": imagen_url,
            }
        )

    return {
        "revenue": {
            "today": revenue_today,
            "this_week": revenue_week,
            "this_month": revenue_month,
        },
        "orders": {
            "today": orders_today,
            "this_week": orders_week,
            "this_month": orders_month,
            "by_status": status_counts,
            "pending_total": pending_total,
        },
        "ticket_promedio_mes": ticket_promedio_mes,
        "promotions": {
            "active_count": active_promos_count,
            "active_orders": active_promos_orders,
            "active_revenue": active_promos_revenue,
        },
        "low_stock": low_stock_items,
    }


async def get_top_products(
    db: AsyncSession,
    limit: int = 10,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """Return top and bottom selling products based on confirmed orders."""
    confirmed_filter = Pedido.estado == EstadoPedidoEnum.CONFIRMADO
    date_filters = []
    if date_from:
        date_filters.append(
            Pedido.created_at >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        )
    if date_to:
        date_filters.append(
            Pedido.created_at < datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc) + timedelta(days=1)
        )

    top_query = (
        select(
            Perfume.id.label("perfume_id"),
            Perfume.nombre.label("perfume_nombre"),
            Perfume.genero.label("genero"),
            func.sum(PedidoItem.cantidad).label("total_vendido"),
            func.sum(PedidoItem.precio_unitario * PedidoItem.cantidad).label("ingreso_generado"),
        )
        .join(Presentacion, PedidoItem.presentacion_id == Presentacion.id)
        .join(Perfume, Presentacion.perfume_id == Perfume.id)
        .join(Pedido, PedidoItem.pedido_id == Pedido.id)
        .where(confirmed_filter, *date_filters)
        .group_by(Perfume.id, Perfume.nombre, Perfume.genero)
        .order_by(func.sum(PedidoItem.cantidad).desc())
        .limit(limit)
    )

    top_result = await db.execute(top_query)
    top_products = [
        {
            "perfume_id": str(row.perfume_id),
            "perfume_nombre": row.perfume_nombre,
            "genero": row.genero.value if row.genero else None,
            "total_vendido": int(row.total_vendido or 0),
            "ingreso_generado": float(row.ingreso_generado or 0),
        }
        for row in top_result.all()
    ]

    bottom_query = (
        select(
            Perfume.id.label("perfume_id"),
            Perfume.nombre.label("perfume_nombre"),
            Perfume.genero.label("genero"),
            func.coalesce(func.sum(PedidoItem.cantidad), 0).label("total_vendido"),
        )
        .outerjoin(Presentacion, Perfume.id == Presentacion.perfume_id)
        .outerjoin(PedidoItem, Presentacion.id == PedidoItem.presentacion_id)
        .outerjoin(
            Pedido,
            and_(PedidoItem.pedido_id == Pedido.id, Pedido.estado == EstadoPedidoEnum.CONFIRMADO, *date_filters),
        )
        .where(Perfume.activo == True)  # noqa: E712
        .group_by(Perfume.id, Perfume.nombre, Perfume.genero)
        .order_by(func.coalesce(func.sum(PedidoItem.cantidad), 0).asc())
        .limit(limit)
    )

    bottom_result = await db.execute(bottom_query)
    bottom_products = [
        {
            "perfume_id": str(row.perfume_id),
            "perfume_nombre": row.perfume_nombre,
            "genero": row.genero.value if row.genero else None,
            "total_vendido": int(row.total_vendido or 0),
        }
        for row in bottom_result.all()
    ]

    return {"top": top_products, "bottom": bottom_products}


async def get_sales_by_gender(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """Return total confirmed sales quantity and revenue grouped by gender."""
    date_filters = []
    if date_from:
        date_filters.append(
            Pedido.created_at >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        )
    if date_to:
        date_filters.append(
            Pedido.created_at < datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc) + timedelta(days=1)
        )

    query = (
        select(
            Perfume.genero.label("genero"),
            func.sum(PedidoItem.cantidad).label("total_vendido"),
            func.sum(PedidoItem.precio_unitario * PedidoItem.cantidad).label("ingreso"),
        )
        .join(Presentacion, PedidoItem.presentacion_id == Presentacion.id)
        .join(Perfume, Presentacion.perfume_id == Perfume.id)
        .join(Pedido, PedidoItem.pedido_id == Pedido.id)
        .where(Pedido.estado == EstadoPedidoEnum.CONFIRMADO, *date_filters)
        .group_by(Perfume.genero)
    )

    result = await db.execute(query)
    rows = result.all()

    gender_map = {g.value: {"total_vendido": 0, "ingreso": 0.0} for g in GeneroEnum}
    for row in rows:
        if row.genero:
            gender_map[row.genero.value] = {
                "total_vendido": int(row.total_vendido or 0),
                "ingreso": float(row.ingreso or 0),
            }

    return [
        {"genero": genero, **values}
        for genero, values in gender_map.items()
    ]


async def get_orders_by_period(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """Return total orders and revenue grouped by day within the date range."""
    date_filters = [Pedido.estado == EstadoPedidoEnum.CONFIRMADO]
    if date_from:
        date_filters.append(
            Pedido.created_at >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
        )
    if date_to:
        date_filters.append(
            Pedido.created_at < datetime(date_to.year, date_to.month, date_to.day, tzinfo=timezone.utc) + timedelta(days=1)
        )

    query = (
        select(
            func.date_trunc("day", Pedido.created_at).label("dia"),
            func.count(Pedido.id).label("pedidos"),
            func.coalesce(func.sum(Pedido.total), 0).label("ingresos"),
        )
        .where(*date_filters)
        .group_by(func.date_trunc("day", Pedido.created_at))
        .order_by(func.date_trunc("day", Pedido.created_at))
    )

    result = await db.execute(query)
    return [
        {
            "dia": row.dia.strftime("%Y-%m-%d"),
            "pedidos": int(row.pedidos),
            "ingresos": float(row.ingresos),
        }
        for row in result.all()
    ]


async def get_abandoned_carts(db: AsyncSession, limit: int = 10) -> list[dict]:
    """
    Return the most-frequently abandoned products from checkout_iniciado.
    Parses the carrito_data JSONB to extract presentation_id frequencies.
    """
    result = await db.execute(
        select(CheckoutIniciado.carrito_data)
        .where(CheckoutIniciado.finalizado == False)  # noqa: E712
        .order_by(CheckoutIniciado.created_at.desc())
        .limit(500)
    )
    carts = result.scalars().all()

    pres_counts: dict[str, int] = {}
    for cart in carts:
        items = cart if isinstance(cart, list) else cart.get("items", [])
        for item in items:
            pid = str(item.get("presentacion_id", ""))
            if pid:
                pres_counts[pid] = pres_counts.get(pid, 0) + item.get("cantidad", 1)

    top_pres = sorted(pres_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

    abandoned = []
    for pres_id_str, count in top_pres:
        try:
            pres_uuid = uuid.UUID(pres_id_str)
        except ValueError:
            continue

        pres_result = await db.execute(
            select(Presentacion).where(Presentacion.id == pres_uuid)
        )
        pres = pres_result.scalar_one_or_none()
        if pres:
            perfume_result = await db.execute(
                select(Perfume).where(Perfume.id == pres.perfume_id)
            )
            perfume = perfume_result.scalar_one_or_none()
            abandoned.append(
                {
                    "presentacion_id": pres_id_str,
                    "perfume_nombre": perfume.nombre if perfume else "Desconocido",
                    "tamano_ml": pres.tamano_ml,
                    "veces_abandonado": count,
                }
            )

    return abandoned


async def get_promotions_stats(db: AsyncSession) -> list[dict]:
    """
    Return performance stats for each promotion.
    Active promotions show real-time data first.
    """
    promotions_result = await db.execute(
        select(Promocion).order_by(Promocion.activa.desc(), Promocion.created_at.desc())
    )
    promotions = promotions_result.scalars().all()

    stats = []
    for promo in promotions:
        filters = [
            Pedido.descuento_total > 0,
            Pedido.created_at >= datetime(
                promo.fecha_inicio.year, promo.fecha_inicio.month, promo.fecha_inicio.day,
                tzinfo=timezone.utc
            ),
        ]
        if promo.fecha_fin:
            filters.append(
                Pedido.created_at <= datetime(
                    promo.fecha_fin.year, promo.fecha_fin.month, promo.fecha_fin.day + 1,
                    tzinfo=timezone.utc
                )
            )

        orders_result = await db.execute(
            select(
                func.count(Pedido.id).label("pedidos_count"),
                func.coalesce(func.sum(Pedido.descuento_total), 0).label("descuento_otorgado"),
                func.coalesce(func.sum(Pedido.total), 0).label("ingreso_neto"),
            ).where(*filters)
        )
        row = orders_result.one()

        stats.append(
            {
                "promocion_id": str(promo.id),
                "nombre": promo.nombre,
                "tipo": promo.tipo.value,
                "activa": promo.activa,
                "fecha_inicio": promo.fecha_inicio.isoformat(),
                "fecha_fin": promo.fecha_fin.isoformat() if promo.fecha_fin else None,
                "pedidos_count": int(row.pedidos_count),
                "descuento_otorgado": float(row.descuento_otorgado),
                "ingreso_neto": float(row.ingreso_neto),
            }
        )

    return stats
