"""HTTP router for admin dashboard metrics with date range support."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.metrics import service

router = APIRouter(tags=["metrics"])

_auth = [Depends(get_current_admin)]


@router.get("/admin/metrics/dashboard", dependencies=_auth)
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Return aggregated dashboard KPIs (revenue, orders by period, promos, low stock). Admin only."""
    return await service.get_dashboard_metrics(db)


@router.get("/admin/metrics/top-products", dependencies=_auth)
async def get_top_products(
    limit: int = 10,
    date_from: Optional[date] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    date_to: Optional[date] = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Return top and bottom selling products by confirmed order quantity. Admin only."""
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from debe ser anterior o igual a date_to")
    return await service.get_top_products(db, limit=limit, date_from=date_from, date_to=date_to)


@router.get("/admin/metrics/sales-by-gender", dependencies=_auth)
async def get_sales_by_gender(
    date_from: Optional[date] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    date_to: Optional[date] = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Return confirmed sales grouped by product gender with optional date range. Admin only."""
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from debe ser anterior o igual a date_to")
    return await service.get_sales_by_gender(db, date_from=date_from, date_to=date_to)


@router.get("/admin/metrics/orders-by-period", dependencies=_auth)
async def get_orders_by_period(
    date_from: Optional[date] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    date_to: Optional[date] = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Return confirmed orders and revenue grouped by day in the given date range. Admin only."""
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from debe ser anterior o igual a date_to")
    return await service.get_orders_by_period(db, date_from=date_from, date_to=date_to)


@router.get("/admin/metrics/abandoned-carts", dependencies=_auth)
async def get_abandoned_carts(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Return most-frequently abandoned products from incomplete checkouts. Admin only."""
    return await service.get_abandoned_carts(db, limit=limit)


@router.get("/admin/metrics/promotions-stats", dependencies=_auth)
async def get_promotions_stats(db: AsyncSession = Depends(get_db)):
    """Return performance stats for each promotion (active first). Admin only."""
    return await service.get_promotions_stats(db)
