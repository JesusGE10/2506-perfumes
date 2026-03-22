"""HTTP router for categories — public listing and admin CRUD."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.categories import service
from app.modules.categories.schemas import (
    CategoriaCreate,
    CategoriaResponse,
    CategoriaUpdate,
)

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoriaResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all categories. Public endpoint."""
    return await service.get_all_categories(db)


@router.post(
    "/admin/categories",
    response_model=CategoriaResponse,
    status_code=201,
    dependencies=[Depends(get_current_admin)],
)
async def create_category(
    data: CategoriaCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new category. Requires admin JWT."""
    return await service.create_category(db, data)


@router.put(
    "/admin/categories/{cat_id}",
    response_model=CategoriaResponse,
    dependencies=[Depends(get_current_admin)],
)
async def update_category(
    cat_id: uuid.UUID, data: CategoriaUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a category. Requires admin JWT."""
    return await service.update_category(db, cat_id, data)


@router.delete(
    "/admin/categories/{cat_id}",
    status_code=204,
    dependencies=[Depends(get_current_admin)],
)
async def delete_category(
    cat_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Delete a category. Requires admin JWT."""
    await service.delete_category(db, cat_id)
