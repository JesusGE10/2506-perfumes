"""HTTP router for admin dashboard metrics."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.metrics import service

router = APIRouter(tags=["metrics"])


@router.get(
    "/admin/metrics/dashboard",
    dependencies=[Depends(get_current_admin)],
)
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Return aggregated dashboard KPIs. Admin only."""
    return await service.get_dashboard_metrics(db)
