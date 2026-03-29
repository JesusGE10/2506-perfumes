"""
Metrics service — dashboard KPIs for the admin panel.

Calculates:
- Total confirmed revenue (today, this week, this month, all time)
- Order counts by status
- Low-stock presentations (stock <= threshold)
- Orders created today
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import EstadoPedidoEnum, Pedido
from app.modules.products.models import Perfume, Presentacion

LOW_STOCK_THRESHOLD = 5


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

    revenue_today = await revenue_in(today_start)
    revenue_week = await revenue_in(week_start)
    revenue_month = await revenue_in(month_start)
    revenue_total = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(Pedido.total), 0)).where(confirmed_filter)
            )
        ).scalar_one()
    )

    # ── Order counts by status ─────────────────────────────────────────────
    status_counts: dict[str, int] = {}
    for estado in EstadoPedidoEnum:
        count_result = await db.execute(
            select(func.count()).where(Pedido.estado == estado)
        )
        status_counts[estado.value] = count_result.scalar_one()

    # ── Orders today (all statuses) ─────────────────────────────────────────
    orders_today_result = await db.execute(
        select(func.count()).where(Pedido.created_at >= today_start)
    )
    orders_today = orders_today_result.scalar_one()

    # ── Low stock presentations ─────────────────────────────────────────────
    low_stock_result = await db.execute(
        select(Presentacion)
        .where(Presentacion.stock <= LOW_STOCK_THRESHOLD)
        .order_by(Presentacion.stock.asc())
        .limit(20)
    )
    low_stock_items = []
    for pres in low_stock_result.scalars().all():
        # Lazy-load the perfume name
        perfume_result = await db.execute(
            select(Perfume).where(Perfume.id == pres.perfume_id)
        )
        perfume = perfume_result.scalar_one_or_none()
        low_stock_items.append(
            {
                "presentacion_id": str(pres.id),
                "perfume_nombre": perfume.nombre if perfume else "Desconocido",
                "tamano_ml": pres.tamano_ml,
                "stock": pres.stock,
            }
        )

    return {
        "revenue": {
            "today": revenue_today,
            "this_week": revenue_week,
            "this_month": revenue_month,
            "total": revenue_total,
        },
        "orders": {
            "today": orders_today,
            "by_status": status_counts,
        },
        "low_stock": low_stock_items,
    }
