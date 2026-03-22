"""HTTP router for promotions — admin CRUD and product associations."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.promotions import service
from app.modules.promotions.schemas import (
    PromocionCreate,
    PromocionProductoCreate,
    PromocionResponse,
    PromocionUpdate,
)

router = APIRouter(prefix="/admin/promotions", tags=["promotions"])


@router.get("", response_model=list[PromocionResponse])
async def list_promotions(
    only_active: bool = False,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    """List all promotions. Optionally filter to active only. Admin only."""
    return await service.get_all_promotions(db, only_active=only_active)


@router.post("", response_model=PromocionResponse, status_code=201)
async def create_promotion(
    data: PromocionCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    """Create a new promotion. Admin only."""
    return await service.create_promotion(db, data)


@router.put("/{promo_id}", response_model=PromocionResponse)
async def update_promotion(
    promo_id: uuid.UUID,
    data: PromocionUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    """Update a promotion. Admin only."""
    return await service.update_promotion(db, promo_id, data)


@router.delete("/{promo_id}", status_code=204)
async def delete_promotion(
    promo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    """Delete a promotion. Admin only."""
    await service.delete_promotion(db, promo_id)


@router.post("/{promo_id}/products", status_code=201)
async def add_product_to_promotion(
    promo_id: uuid.UUID,
    data: PromocionProductoCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    """
    Associate a product (or specific presentation) with an 'individual'
    or 'paquete' promotion. Admin only.
    """
    await service.add_product_to_promotion(db, promo_id, data)
    return {"message": "Producto asociado a la promoción"}
