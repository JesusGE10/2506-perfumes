"""Business logic service for brands."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.modules.brands.models import Marca
from app.modules.brands.schemas import MarcaCreate, MarcaUpdate

try:
    from slugify import slugify
except ImportError:
    def slugify(text: str) -> str:
        return text.lower().replace(" ", "-")


async def get_all_brands(db: AsyncSession) -> list[Marca]:
    result = await db.execute(select(Marca).order_by(Marca.nombre))
    return list(result.scalars().all())


async def get_brand_by_id(db: AsyncSession, brand_id: uuid.UUID) -> Marca:
    result = await db.execute(select(Marca).where(Marca.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise NotFoundException(f"Marca con id '{brand_id}' no encontrada")
    return brand


async def create_brand(db: AsyncSession, data: MarcaCreate) -> Marca:
    slug = slugify(data.nombre)
    # Check uniqueness
    existing = await db.execute(select(Marca).where(Marca.slug == slug))
    if existing.scalar_one_or_none():
        raise ConflictException(f"Ya existe una marca con el nombre '{data.nombre}'")

    brand = Marca(
        nombre=data.nombre,
        slug=slug,
        pais_origen=data.pais_origen,
        logo_url=data.logo_url,
    )
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand


async def update_brand(
    db: AsyncSession, brand_id: uuid.UUID, data: MarcaUpdate
) -> Marca:
    brand = await get_brand_by_id(db, brand_id)

    if data.nombre is not None and data.nombre != brand.nombre:
        new_slug = slugify(data.nombre)
        existing = await db.execute(select(Marca).where(Marca.slug == new_slug))
        if existing.scalar_one_or_none():
            raise ConflictException(f"Ya existe una marca con el nombre '{data.nombre}'")
        brand.nombre = data.nombre
        brand.slug = new_slug

    if data.pais_origen is not None:
        brand.pais_origen = data.pais_origen
    if data.logo_url is not None:
        brand.logo_url = data.logo_url

    await db.commit()
    await db.refresh(brand)
    return brand


async def delete_brand(db: AsyncSession, brand_id: uuid.UUID) -> None:
    brand = await get_brand_by_id(db, brand_id)
    await db.delete(brand)
    await db.commit()
