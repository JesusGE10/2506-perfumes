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

async def admin_list_products(
    db: AsyncSession,
    q: str | None = None,
    activo: bool | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Perfume], int]:
    """List all products for admin, including inactive ones. Supports search."""
    query = select(Perfume)

    if activo is not None:
        query = query.where(Perfume.activo == activo)
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(Perfume.nombre.ilike(search), Perfume.descripcion.ilike(search))
        )

    query = query.order_by(Perfume.nombre.asc())

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginate
    offset = (page - 1) * size
    items_query = (
        query.offset(offset).limit(size)
        .options(
            selectinload(Perfume.marca),
            selectinload(Perfume.categoria),
            selectinload(Perfume.presentaciones),
            selectinload(Perfume.imagenes),
        )
    )
    result = await db.execute(items_query)
    return list(result.scalars().unique().all()), total


async def admin_get_product(db: AsyncSession, product_id: uuid.UUID) -> Perfume:
    """Return full product detail by UUID (includes inactive). Admin only."""
    result = await db.execute(
        select(Perfume)
        .where(Perfume.id == product_id)
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
        raise NotFoundException(f"Perfume con id '{product_id}' no encontrado")
    return product


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

    # ── Guardia: no se puede activar un producto sin imágenes ────────────────────
    # Un producto sin imagen no puede mostrarse en el catálogo — la imagen
    # es el principal driver de venta en este e-commerce.
    if data.activo is True:
        img_count = await db.scalar(
            select(func.count()).where(Imagen.perfume_id == product_id)
        )
        if (img_count or 0) == 0:
            raise ConflictException(
                "El producto necesita al menos una imagen para ser publicado. "
                "Sube una imagen primero y luego actívalo."
            )

    if data.nombre is not None:
        new_slug = slugify(data.nombre)
        # ── Bug fix: verificar colisión de slug antes de asignar ─────────────
        # Sin este check, renombrar un producto a un nombre ya existente
        # produce un UniqueViolationError no controlado → HTTP 500.
        if new_slug != product.slug:
            existing = await db.execute(
                select(Perfume).where(
                    Perfume.slug == new_slug, Perfume.id != product_id
                )
            )
            if existing.scalar_one_or_none():
                new_slug = f"{new_slug}-{uuid.uuid4().hex[:6]}"
        product.nombre = data.nombre
        product.slug = new_slug

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


async def update_presentation(
    db: AsyncSession,
    product_id: uuid.UUID,
    pres_id: uuid.UUID,
    data: "PresentacionUpdate",
) -> Presentacion:
    """Update price, stock, or size for a specific presentation. Admin only."""
    result = await db.execute(
        select(Presentacion).where(
            Presentacion.id == pres_id,
            Presentacion.perfume_id == product_id,
        )
    )
    pres = result.scalar_one_or_none()
    if not pres:
        raise NotFoundException(f"Presentación '{pres_id}' no encontrada para este producto")

    if data.tamano_ml is not None:
        pres.tamano_ml = data.tamano_ml
    if data.precio is not None:
        pres.precio = data.precio
    if data.stock is not None:
        pres.stock = data.stock

    await db.commit()
    await db.refresh(pres)
    return pres


async def bulk_delete_products(db: AsyncSession, product_ids: list[uuid.UUID]) -> dict:
    """Permanently delete multiple products atomically. Returns counts."""
    deleted = 0
    not_found = []
    for pid in product_ids:
        result = await db.execute(select(Perfume).where(Perfume.id == pid))
        product = result.scalar_one_or_none()
        if product:
            await db.delete(product)
            deleted += 1
        else:
            not_found.append(str(pid))
    await db.commit()
    return {"deleted": deleted, "not_found": not_found}


async def import_products_from_rows(
    db: AsyncSession,
    rows: list[dict],
) -> dict:
    """
    Upsert products from parsed Excel/CSV rows.

    Row format: { nombre, marca (nombre), genero, tamano_ml, precio, stock, descripcion }
    - If a product with the same nombre+marca already exists → update its data and upsert presentation
    - If not → create product + presentation
    Returns { created, updated, skipped, errors }
    """
    from app.modules.brands.models import Marca as MarcaModel
    from app.modules.categories.models import Categoria as CategoriaModel

    created = 0
    updated = 0
    skipped = 0
    errors = []

    # Get or ensure a default category "General" for imports
    default_cat_result = await db.execute(
        select(CategoriaModel).where(CategoriaModel.slug == "general")
    )
    default_cat = default_cat_result.scalar_one_or_none()
    if not default_cat:
        default_cat = CategoriaModel(nombre="General", slug="general")
        db.add(default_cat)
        await db.flush()

    for i, row in enumerate(rows, start=2):  # row 2+ (row 1 is header)
        nombre = str(row.get("nombre", "")).strip()
        if not nombre:
            skipped += 1
            continue

        marca_nombre = str(row.get("marca", "Sin marca")).strip()
        genero_str = str(row.get("genero", "unisex")).strip().lower()
        tamano_raw = row.get("tamano_ml")
        precio_raw = row.get("precio")
        stock_raw = row.get("stock", 0)
        descripcion = str(row.get("descripcion", "")).strip() or None

        # Validate genero
        if genero_str not in ("hombre", "mujer", "unisex"):
            genero_str = "unisex"

        # Parse numeric fields
        try:
            tamano_ml = int(float(str(tamano_raw))) if tamano_raw is not None else None
            precio = Decimal(str(precio_raw)) if precio_raw is not None else None
            stock = int(float(str(stock_raw)))
        except (ValueError, TypeError) as e:
            errors.append(f"Fila {i} ({nombre}): {e}")
            continue

        # Find or create brand
        marca_result = await db.execute(
            select(MarcaModel).where(MarcaModel.nombre.ilike(marca_nombre))
        )
        marca = marca_result.scalar_one_or_none()
        if not marca:
            marca = MarcaModel(nombre=marca_nombre, slug=slugify(marca_nombre))
            db.add(marca)
            await db.flush()

        # Find existing product
        existing_result = await db.execute(
            select(Perfume).where(
                Perfume.nombre.ilike(nombre),
                Perfume.marca_id == marca.id,
            ).options(selectinload(Perfume.presentaciones))
        )
        product = existing_result.scalar_one_or_none()

        if product:
            # Update descriptive fields
            if descripcion:
                product.descripcion = descripcion
            if genero_str:
                product.genero = GeneroEnum(genero_str)

            # Upsert presentation if size is provided
            if tamano_ml is not None and precio is not None:
                existing_pres = next(
                    (p for p in product.presentaciones if p.tamano_ml == tamano_ml), None
                )
                if existing_pres:
                    existing_pres.precio = precio
                    existing_pres.stock = stock
                else:
                    db.add(Presentacion(
                        perfume_id=product.id, tamano_ml=tamano_ml, precio=precio, stock=stock
                    ))
            updated += 1
        else:
            # Create new product
            slug = slugify(nombre)
            existing_slug = await db.execute(select(Perfume).where(Perfume.slug == slug))
            if existing_slug.scalar_one_or_none():
                slug = f"{slug}-{uuid.uuid4().hex[:6]}"

            product = Perfume(
                nombre=nombre,
                slug=slug,
                marca_id=marca.id,
                categoria_id=default_cat.id,
                genero=GeneroEnum(genero_str),
                descripcion=descripcion,
            )
            db.add(product)
            await db.flush()

            if tamano_ml is not None and precio is not None:
                db.add(Presentacion(
                    perfume_id=product.id, tamano_ml=tamano_ml, precio=precio, stock=stock
                ))
            created += 1

    await db.commit()
    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}

