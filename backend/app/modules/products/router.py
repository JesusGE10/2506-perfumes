"""HTTP router for products — public catalog and admin CRUD."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse
from app.dependencies import get_current_admin, get_db
from app.modules.products import service
from app.modules.products.models import GeneroEnum
from app.modules.products.schemas import (
    PerfumeCreate,
    PerfumeDetailResponse,
    PerfumeSummaryResponse,
    PerfumeUpdate,
    ProductFilters,
)

router = APIRouter(tags=["products"])

PREFIX_PUBLIC = "/products"
PREFIX_ADMIN = "/admin/products"


# ─── Public Catalog ─────────────────────────────────────────────────────────

@router.get(PREFIX_PUBLIC, response_model=PaginatedResponse[PerfumeSummaryResponse])
async def list_products(
    category: str | None = None,
    brand: str | None = None,
    gender: GeneroEnum | None = None,
    is_arab: bool | None = None,
    q: str | None = None,
    sort_by: str | None = "newest",
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
):
    """List active products with optional filters. Public endpoint."""
    filters = ProductFilters(
        category=category,
        brand=brand,
        gender=gender,
        is_arab=is_arab,
        q=q,
        sort_by=sort_by,
        page=page,
        size=size,
    )
    items, total = await service.list_products(db, filters)
    return PaginatedResponse.create(
        items=items, total=total, page=page, size=size
    )


@router.get(f"{PREFIX_PUBLIC}/featured", response_model=list[PerfumeSummaryResponse])
async def get_featured(db: AsyncSession = Depends(get_db)):
    """Return featured products (destacado=True). Public."""
    return await service.get_featured_products(db)


@router.get(f"{PREFIX_PUBLIC}/newest", response_model=list[PerfumeSummaryResponse])
async def get_newest(db: AsyncSession = Depends(get_db)):
    """Return newest arrivals (es_nuevo=True). Public."""
    return await service.get_newest_products(db)


@router.get(
    f"{PREFIX_PUBLIC}/{{slug}}", response_model=PerfumeDetailResponse
)
async def get_product_detail(slug: str, db: AsyncSession = Depends(get_db)):
    """Return full product detail by slug. Public."""
    return await service.get_product_by_slug(db, slug)


# ─── Admin CRUD ────────────────────────────────────────────────────────────

@router.post(
    PREFIX_ADMIN,
    response_model=PerfumeDetailResponse,
    status_code=201,
    dependencies=[Depends(get_current_admin)],
)
async def create_product(
    data: PerfumeCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new product with presentations and notes. Admin only."""
    return await service.create_product(db, data)


@router.put(
    f"{PREFIX_ADMIN}/{{product_id}}",
    response_model=PerfumeDetailResponse,
    dependencies=[Depends(get_current_admin)],
)
async def update_product(
    product_id: uuid.UUID, data: PerfumeUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a product's metadata. Admin only."""
    return await service.update_product(db, product_id, data)


@router.delete(
    f"{PREFIX_ADMIN}/{{product_id}}",
    status_code=204,
    dependencies=[Depends(get_current_admin)],
)
async def delete_product(
    product_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Permanently delete a product. Admin only."""
    await service.delete_product(db, product_id)
