"""
Products service — business logic for perfume catalog management.

Handles CRUD, catalog listing with filters, and special endpoints.
"""

import uuid
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException
from app.modules.brands.models import Marca
from app.modules.categories.models import Categoria
from app.modules.products.models import (
    FamiliaOlfativaEnum,
    GeneroEnum,
    Imagen,
    NotaOlfativa,
    Perfume,
    PerfumeNota,
    Presentacion,
    TipoNotaEnum,
)
from app.modules.products.schemas import (
    PerfumeCreate,
    PerfumeNotaCreate,
    PerfumeUpdate,
    PresentacionCreate,
    ProductFilters,
)

try:
    from slugify import slugify
except ImportError:
    def slugify(text: str) -> str:
        return text.lower().replace(" ", "-")


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _assert_brand_exists(db: AsyncSession, brand_id: uuid.UUID) -> None:
    result = await db.execute(select(Marca).where(Marca.id == brand_id))
    if not result.scalar_one_or_none():
        raise NotFoundException(f"Marca con id '{brand_id}' no encontrada")


async def _assert_category_exists(db: AsyncSession, cat_id: uuid.UUID) -> None:
    result = await db.execute(select(Categoria).where(Categoria.id == cat_id))
    if not result.scalar_one_or_none():
        raise NotFoundException(f"Categoría con id '{cat_id}' no encontrada")


def _build_perfume_query(filters: ProductFilters):
    """Build a filtered SQLAlchemy SELECT statement for the catalog."""
    query = select(Perfume).where(Perfume.activo == True)  # noqa: E712

    if filters.category:
        query = query.join(Categoria).where(Categoria.slug == filters.category)
    if filters.brand:
        query = query.join(Marca).where(Marca.slug == filters.brand)
    if filters.gender:
        query = query.where(Perfume.genero == filters.gender)
    if filters.is_arab is not None:
        query = query.where(Perfume.es_arabe == filters.is_arab)
    if filters.min_price is not None or filters.max_price is not None:
        query = query.join(Presentacion)
        if filters.min_price is not None:
            query = query.where(Presentacion.precio >= filters.min_price)
        if filters.max_price is not None:
            query = query.where(Presentacion.precio <= filters.max_price)
    if filters.q:
        search_term = f"%{filters.q}%"
        query = query.where(
            or_(
                Perfume.nombre.ilike(search_term),
                Perfume.descripcion.ilike(search_term),
            )
        )

    # Sorting
    if filters.sort_by == "newest":
        query = query.order_by(Perfume.created_at.desc())
    elif filters.sort_by == "name":
        query = query.order_by(Perfume.nombre.asc())
    elif filters.sort_by == "price_asc":
        query = query.order_by(Presentacion.precio.asc())
    elif filters.sort_by == "price_desc":
        query = query.order_by(Presentacion.precio.desc())
    else:
        query = query.order_by(Perfume.created_at.desc())

    return query.distinct()


# ─── Public Catalog ────────────────────────────────────────────────────────

async def list_products(
    db: AsyncSession, filters: ProductFilters
) -> tuple[list[Perfume], int]:
    """Return paginated products with total count."""
    base_query = _build_perfume_query(filters)

    # Count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    offset = (filters.page - 1) * filters.size
    items_query = (
        base_query.offset(offset).limit(filters.size)
        .options(
            selectinload(Perfume.marca),
            selectinload(Perfume.categoria),
            selectinload(Perfume.presentaciones),
            selectinload(Perfume.imagenes),
        )
    )
    result = await db.execute(items_query)
    items = list(result.scalars().unique().all())
    return items, total


async def get_product_by_slug(db: AsyncSession, slug: str) -> Perfume:
    """Return full product detail by slug."""
    result = await db.execute(
        select(Perfume)
        .where(Perfume.slug == slug, Perfume.activo == True)  # noqa: E712
        .options(
            selectinload(Perfume.marca),
            selectinload(Perfume.categoria),
            selectinload(Perfume.presentaciones),
            selectinload(Perfume.imagenes),
            selectinload(Perfume.perfume_notas).selectinload(PerfumeNota.nota),
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException(f"Perfume '{slug}' no encontrado")
    return product


async def get_featured_products(db: AsyncSession, limit: int = 8) -> list[Perfume]:
    result = await db.execute(
        select(Perfume)
        .where(Perfume.activo == True, Perfume.destacado == True)  # noqa: E712
        .order_by(Perfume.created_at.desc())
        .limit(limit)
        .options(
            selectinload(Perfume.marca),
            selectinload(Perfume.categoria),
            selectinload(Perfume.presentaciones),
            selectinload(Perfume.imagenes),
        )
    )
    return list(result.scalars().all())


async def get_newest_products(db: AsyncSession, limit: int = 10) -> list[Perfume]:
    result = await db.execute(
        select(Perfume)
        .where(Perfume.activo == True, Perfume.es_nuevo == True)  # noqa: E712
        .order_by(Perfume.created_at.desc())
        .limit(limit)
        .options(
            selectinload(Perfume.marca),
            selectinload(Perfume.categoria),
            selectinload(Perfume.presentaciones),
            selectinload(Perfume.imagenes),
        )
    )
    return list(result.scalars().all())


# ─── Admin CRUD ────────────────────────────────────────────────────────────

async def create_product(db: AsyncSession, data: PerfumeCreate) -> Perfume:
    await _assert_brand_exists(db, data.marca_id)
    await _assert_category_exists(db, data.categoria_id)

    slug = slugify(data.nombre)
    existing = await db.execute(select(Perfume).where(Perfume.slug == slug))
    if existing.scalar_one_or_none():
        # Append UUID fragment to ensure uniqueness
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    product = Perfume(
        nombre=data.nombre,
        slug=slug,
        marca_id=data.marca_id,
        categoria_id=data.categoria_id,
        genero=data.genero,
        descripcion=data.descripcion,
        activo=data.activo,
        destacado=data.destacado,
        es_arabe=data.es_arabe,
        es_nuevo=data.es_nuevo,
    )
    db.add(product)
    await db.flush()  # get product.id before adding children

    # Add presentations
    for p_data in data.presentaciones:
        presentacion = Presentacion(
            perfume_id=product.id,
            tamano_ml=p_data.tamano_ml,
            precio=p_data.precio,
            stock=p_data.stock,
        )
        db.add(presentacion)

    # Add olfactive notes
    for nota_data in data.notas:
        nota_link = PerfumeNota(
            perfume_id=product.id,
            nota_id=nota_data.nota_id,
            tipo=nota_data.tipo,
        )
        db.add(nota_link)

    await db.commit()
    return await get_product_by_slug(db, product.slug)


async def update_product(
    db: AsyncSession, product_id: uuid.UUID, data: PerfumeUpdate
) -> Perfume:
    result = await db.execute(
        select(Perfume).where(Perfume.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException(f"Perfume con id '{product_id}' no encontrado")

    if data.nombre is not None:
        product.nombre = data.nombre
        product.slug = slugify(data.nombre)
    if data.marca_id is not None:
        await _assert_brand_exists(db, data.marca_id)
        product.marca_id = data.marca_id
    if data.categoria_id is not None:
        await _assert_category_exists(db, data.categoria_id)
        product.categoria_id = data.categoria_id
    if data.genero is not None:
        product.genero = data.genero
    if data.descripcion is not None:
        product.descripcion = data.descripcion
    if data.activo is not None:
        product.activo = data.activo
    if data.destacado is not None:
        product.destacado = data.destacado
    if data.es_arabe is not None:
        product.es_arabe = data.es_arabe
    if data.es_nuevo is not None:
        product.es_nuevo = data.es_nuevo

    await db.commit()
    return await get_product_by_slug(db, product.slug)


async def delete_product(db: AsyncSession, product_id: uuid.UUID) -> None:
    result = await db.execute(select(Perfume).where(Perfume.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException(f"Perfume con id '{product_id}' no encontrado")
    await db.delete(product)
    await db.commit()
