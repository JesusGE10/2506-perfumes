"""HTTP router for brands — public listing and admin CRUD."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.brands import service
from app.modules.brands.schemas import MarcaCreate, MarcaResponse, MarcaUpdate

router = APIRouter(tags=["brands"])


@router.get("/brands", response_model=list[MarcaResponse])
async def list_brands(db: AsyncSession = Depends(get_db)):
    """List all brands. Public endpoint."""
    return await service.get_all_brands(db)


@router.post(
    "/admin/brands",
    response_model=MarcaResponse,
    status_code=201,
    dependencies=[Depends(get_current_admin)],
)
async def create_brand(data: MarcaCreate, db: AsyncSession = Depends(get_db)):
    """Create a new brand. Requires admin JWT."""
    return await service.create_brand(db, data)


@router.put(
    "/admin/brands/{brand_id}",
    response_model=MarcaResponse,
    dependencies=[Depends(get_current_admin)],
)
async def update_brand(
    brand_id: uuid.UUID, data: MarcaUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a brand. Requires admin JWT."""
    return await service.update_brand(db, brand_id, data)


@router.delete(
    "/admin/brands/{brand_id}",
    status_code=204,
    dependencies=[Depends(get_current_admin)],
)
async def delete_brand(brand_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a brand. Requires admin JWT."""
    await service.delete_brand(db, brand_id)
