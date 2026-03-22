"""Business logic service for categories."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.modules.categories.models import Categoria
from app.modules.categories.schemas import CategoriaCreate, CategoriaUpdate

try:
    from slugify import slugify
except ImportError:
    def slugify(text: str) -> str:
        return text.lower().replace(" ", "-")


async def get_all_categories(db: AsyncSession) -> list[Categoria]:
    result = await db.execute(select(Categoria).order_by(Categoria.nombre))
    return list(result.scalars().all())


async def get_category_by_id(db: AsyncSession, cat_id: uuid.UUID) -> Categoria:
    result = await db.execute(select(Categoria).where(Categoria.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise NotFoundException(f"Categoría con id '{cat_id}' no encontrada")
    return cat


async def create_category(db: AsyncSession, data: CategoriaCreate) -> Categoria:
    slug = slugify(data.nombre)
    existing = await db.execute(select(Categoria).where(Categoria.slug == slug))
    if existing.scalar_one_or_none():
        raise ConflictException(f"Ya existe una categoría con el nombre '{data.nombre}'")

    cat = Categoria(
        nombre=data.nombre,
        slug=slug,
        descripcion=data.descripcion,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


async def update_category(
    db: AsyncSession, cat_id: uuid.UUID, data: CategoriaUpdate
) -> Categoria:
    cat = await get_category_by_id(db, cat_id)

    if data.nombre is not None and data.nombre != cat.nombre:
        new_slug = slugify(data.nombre)
        existing = await db.execute(select(Categoria).where(Categoria.slug == new_slug))
        if existing.scalar_one_or_none():
            raise ConflictException(f"Ya existe una categoría con el nombre '{data.nombre}'")
        cat.nombre = data.nombre
        cat.slug = new_slug

    if data.descripcion is not None:
        cat.descripcion = data.descripcion

    await db.commit()
    await db.refresh(cat)
    return cat


async def delete_category(db: AsyncSession, cat_id: uuid.UUID) -> None:
    cat = await get_category_by_id(db, cat_id)
    await db.delete(cat)
    await db.commit()
