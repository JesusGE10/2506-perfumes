"""HTTP router for store configuration."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_superadmin, get_db
from app.modules.store import service
from app.modules.store.schemas import StoreConfigResponse, StoreConfigUpdate

router = APIRouter(tags=["store"])


@router.get(
    "/store/config",
    response_model=StoreConfigResponse,
    summary="Obtener configuración pública de la tienda",
)
async def get_store_config(db: AsyncSession = Depends(get_db)):
    """
    Return the store's public configuration (WhatsApp number, store name).

    Public endpoint — used by the frontend catalog and checkout flows.
    """
    return await service.get_store_config(db)


@router.patch(
    "/admin/store/config",
    response_model=StoreConfigResponse,
    dependencies=[Depends(get_current_superadmin)],
    summary="Actualizar configuración de la tienda (super_admin)",
)
async def update_store_config(
    data: StoreConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update store configuration values.

    Only fields explicitly provided are updated.
    Super-admin access required.
    """
    return await service.update_store_config(db, data)
