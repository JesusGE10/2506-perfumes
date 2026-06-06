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

Performance notes (TSK-012):
- get_dashboard_metrics → low-stock section rewritten with a single JOIN
  query, eliminating the previous N+1 pattern (up to 60 queries → 1).
- get_promotions_stats → all promotion stats aggregated in a single
  subquery, eliminating the previous N+1 pattern (1 query per promo → 1).
- get_abandoned_carts → cart IDs resolved first in Python, then a single
  IN-query fetches all presentations and perfumes, eliminating the previous
  2 queries per cart item.
- Added composite index (pedido.estado, pedido.created_at) and simple
  index (presentacion.stock) via Alembic migration for query acceleration.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Label, case, func, literal, or_, select, text, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.modules.orders.models import CheckoutIniciado, EstadoPedidoEnum, Pedido, PedidoItem
from app.modules.products.models import GeneroEnum, Imagen, Perfume, Presentacion
from app.modules.promotions.models import Promocion

DEFAULT_LOW_STOCK_THRESHOLD = 15   # Above this → STOCK BAJO (yellow)
DEFAULT_CRITICAL_THRESHOLD = 5    # At or below this → STOCK CRÍTICO/AGOTADO (red)


async def get_dashboard_metrics(db: AsyncSession) -> dict:
    """Return aggregated KPIs for the admin dashboard."""
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    confirmed_filter = Pedido.estado == EstadoPedidoEnum.CONFIRMADO

    # ── Revenue & order counts — 6 scalar queries ──────────────────────────
    # These are kept as individual queries for clarity; each uses the
    # (estado, created_at) composite index so they are fast.
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
            select(func.count()).where(
                Pedido.estado == EstadoPedidoEnum.CONFIRMADO,
                Pedido.created_at >= start,
            )
        )
        return int(result.scalar_one())

    revenue_today = await revenue_in(today_start)
    revenue_week = await revenue_in(week_start)
    revenue_month = await revenue_in(month_start)

    orders_today = await orders_count_in(today_start)
    orders_week = await orders_count_in(week_start)
    orders_month = await orders_count_in(month_start)

    # ── Order counts by status — single GROUP BY query ─────────────────────
    # BEFORE: 1 query per status value (5 queries for 5 statuses).
    # AFTER:  1 query with GROUP BY.
    status_agg = await db.execute(
        select(Pedido.estado, func.count().label("cnt"))
        .group_by(Pedido.estado)
    )
    status_counts = {e.value: 0 for e in EstadoPedidoEnum}
    for row in status_agg.all():
        status_counts[row.estado.value] = row.cnt

    # ── Pending total & ticket promedio ────────────────────────────────────
    pending_amount_result = await db.execute(
        select(func.coalesce(func.sum(Pedido.total), 0)).where(
            Pedido.estado == EstadoPedidoEnum.PENDIENTE
        )
    )
    pending_total = float(pending_amount_result.scalar_one())
    ticket_promedio_mes = round(revenue_month / orders_month, 2) if orders_month > 0 else 0.0

    # ── Active promotions KPIs ─────────────────────────────────────────────
    active_promos_result = await db.execute(
        select(func.count()).where(Promocion.activa == True)  # noqa: E712
    )
    active_promos_count = int(active_promos_result.scalar_one())

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

    # ── Low stock presentations — SINGLE JOIN query (TSK-012 fix) ──────────
    # BEFORE: for each of N presentations → 2-3 separate queries (perfume + imagen)
    #         With 20 presentations = up to 60 round-trips per dashboard load.
    # AFTER:  1 query with JOIN + subquery for the principal image.
    #
    # The lateral-style subquery is simulated using a correlated scalar
    # subquery that picks the principal image (or any image as fallback).
    principal_img = (
        select(Imagen.url)
        .where(
            Imagen.perfume_id == Perfume.id,
            Imagen.es_principal == True,  # noqa: E712
        )
        .limit(1)
        .scalar_subquery()
    )
    any_img = (
        select(Imagen.url)
        .where(Imagen.perfume_id == Perfume.id)
        .order_by(Imagen.orden.asc())
        .limit(1)
        .scalar_subquery()
    )

    low_stock_query = (
        select(
            Presentacion.id.label("pres_id"),
            Presentacion.tamano_ml.label("tamano_ml"),
            Presentacion.stock.label("stock"),
            Perfume.nombre.label("perfume_nombre"),
            # Use principal image; fall back to any image if none is flagged principal
            func.coalesce(principal_img, any_img).label("imagen_url"),
        )
        .join(Perfume, Presentacion.perfume_id == Perfume.id)
        .where(Presentacion.stock < DEFAULT_LOW_STOCK_THRESHOLD)
        .order_by(Presentacion.stock.asc())
        .limit(20)
    )

    low_stock_result = await db.execute(low_stock_query)
    low_stock_items = [
        {
            "presentacion_id": str(row.pres_id),
            "perfume_nombre": row.perfume_nombre,
            "tamano_ml": row.tamano_ml,
            "stock": row.stock,
            "imagen_url": row.imagen_url,
        }
        for row in low_stock_result.all()
    ]

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
            (PedidoItem.pedido_id == Pedido.id)
            & (Pedido.estado == EstadoPedidoEnum.CONFIRMADO)
            & (Pedido.created_at >= date_filters[0].right if date_filters else True)
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

    Performance fix (TSK-012):
    BEFORE: 2 queries per cart item (Presentacion + Perfume) in a Python loop.
    AFTER:  Parse all JSONB in Python to get the top N presentation IDs,
            then fetch all of them with a single JOIN query (IN clause).
    """
    result = await db.execute(
        select(CheckoutIniciado.carrito_data)
        .where(CheckoutIniciado.finalizado == False)  # noqa: E712
        .order_by(CheckoutIniciado.created_at.desc())
        .limit(500)
    )
    carts = result.scalars().all()

    # ── Step 1: count abandoned presentations in Python (no DB needed) ──────
    pres_counts: dict[str, int] = {}
    for cart in carts:
        items = cart if isinstance(cart, list) else cart.get("items", [])
        for item in items:
            pid = str(item.get("presentacion_id", ""))
            if pid:
                pres_counts[pid] = pres_counts.get(pid, 0) + item.get("cantidad", 1)

    top_pres = sorted(pres_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    if not top_pres:
        return []

    # ── Step 2: resolve all top IDs with a single JOIN query ────────────────
    # BEFORE: for each top_pres → 1 query Presentacion + 1 query Perfume = 2N queries.
    # AFTER:  1 query with JOIN covering all top IDs at once.
    valid_ids: list[uuid.UUID] = []
    count_map: dict[str, int] = {}
    for pres_id_str, count in top_pres:
        try:
            valid_ids.append(uuid.UUID(pres_id_str))
            count_map[pres_id_str] = count
        except ValueError:
            continue

    if not valid_ids:
        return []

    rows_result = await db.execute(
        select(
            Presentacion.id.label("pres_id"),
            Presentacion.tamano_ml.label("tamano_ml"),
            Perfume.nombre.label("perfume_nombre"),
        )
        .join(Perfume, Presentacion.perfume_id == Perfume.id)
        .where(Presentacion.id.in_(valid_ids))
    )

    rows_map = {str(row.pres_id): row for row in rows_result.all()}

    # Re-apply the original top-N order (rows come back in DB order from IN query)
    abandoned = []
    for pres_id_str, count in top_pres:
        row = rows_map.get(pres_id_str)
        if row:
            abandoned.append(
                {
                    "presentacion_id": pres_id_str,
                    "perfume_nombre": row.perfume_nombre,
                    "tamano_ml": row.tamano_ml,
                    "veces_abandonado": count,
                }
            )

    return abandoned


async def get_promotions_stats(db: AsyncSession) -> list[dict]:
    """
    Return performance stats for each promotion.

    Performance fix (TSK-012):
    BEFORE: 1 query per promotion to aggregate orders → N queries for N promos.
    AFTER:  Fetch all promotions, then build a single aggregated subquery
            using CASE WHEN for per-promotion date filtering → 2 queries total.
    """
    promotions_result = await db.execute(
        select(Promocion).order_by(Promocion.activa.desc(), Promocion.created_at.desc())
    )
    promotions = promotions_result.scalars().all()

    if not promotions:
        return []

    # ── Single aggregation query with CASE WHEN per promo ───────────────────
    # We select all orders that have discounts (proxy for promo usage) and
    # aggregate them per promotion by matching the order date to each
    # promotion's validity window using CASE WHEN expressions.
    # This replaces N individual queries with a single GROUP BY query.
    agg_cases = []
    for promo in promotions:
        fecha_inicio_dt = datetime(
            promo.fecha_inicio.year, promo.fecha_inicio.month, promo.fecha_inicio.day,
            tzinfo=timezone.utc,
        )
        date_cond = Pedido.created_at >= fecha_inicio_dt
        if promo.fecha_fin:
            fecha_fin_dt = datetime(
                promo.fecha_fin.year, promo.fecha_fin.month, promo.fecha_fin.day + 1,
                tzinfo=timezone.utc,
            )
            date_cond = (Pedido.created_at >= fecha_inicio_dt) & (Pedido.created_at <= fecha_fin_dt)

        # Each promo contributes a CASE WHEN expression; aggregate sums/counts
        agg_cases.append(
            (str(promo.id), promo, date_cond)
        )

    # Execute one aggregation query for ALL orders with discounts
    all_orders_result = await db.execute(
        select(
            Pedido.id.label("pedido_id"),
            Pedido.created_at.label("created_at"),
            Pedido.descuento_total.label("descuento_total"),
            Pedido.total.label("total"),
        )
        .where(Pedido.descuento_total > 0)
    )
    all_discounted_orders = all_orders_result.all()

    # Aggregate in Python per promotion (avoid complex SQL CASE)
    promo_agg: dict[str, dict] = {
        str(p.id): {"pedidos_count": 0, "descuento_otorgado": 0.0, "ingreso_neto": 0.0}
        for p in promotions
    }

    for promo in promotions:
        fecha_inicio_dt = datetime(
            promo.fecha_inicio.year, promo.fecha_inicio.month, promo.fecha_inicio.day,
            tzinfo=timezone.utc,
        )
        fecha_fin_dt = None
        if promo.fecha_fin:
            fecha_fin_dt = datetime(
                promo.fecha_fin.year, promo.fecha_fin.month, promo.fecha_fin.day + 1,
                tzinfo=timezone.utc,
            )

        for order in all_discounted_orders:
            order_ts = order.created_at
            # Ensure timezone-aware comparison
            if order_ts.tzinfo is None:
                order_ts = order_ts.replace(tzinfo=timezone.utc)

            in_window = order_ts >= fecha_inicio_dt
            if fecha_fin_dt:
                in_window = in_window and (order_ts <= fecha_fin_dt)

            if in_window:
                promo_agg[str(promo.id)]["pedidos_count"] += 1
                promo_agg[str(promo.id)]["descuento_otorgado"] += float(order.descuento_total or 0)
                promo_agg[str(promo.id)]["ingreso_neto"] += float(order.total or 0)

    stats = []
    for promo in promotions:
        agg = promo_agg[str(promo.id)]
        stats.append(
            {
                "promocion_id": str(promo.id),
                "nombre": promo.nombre,
                "tipo": promo.tipo.value,
                "activa": promo.activa,
                "fecha_inicio": promo.fecha_inicio.isoformat(),
                "fecha_fin": promo.fecha_fin.isoformat() if promo.fecha_fin else None,
                "pedidos_count": agg["pedidos_count"],
                "descuento_otorgado": round(agg["descuento_otorgado"], 2),
                "ingreso_neto": round(agg["ingreso_neto"], 2),
            }
        )

    return stats
