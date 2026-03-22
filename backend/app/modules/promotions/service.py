"""
Promotions service — CRUD and discount resolution.

Business rules:
- A promotion must have either descuento_porcentaje or descuento_fijo.
- 'global' promotions apply to all products automatically.
- 'individual' promotions require explicit product/presentation association.
- 'paquete' promotions apply when all bundle products are in the cart.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException
from app.modules.promotions.models import Promocion, PromocionProducto
from app.modules.promotions.schemas import (
    PromocionCreate,
    PromocionProductoCreate,
    PromocionUpdate,
)


async def get_all_promotions(
    db: AsyncSession, only_active: bool = False
) -> list[Promocion]:
    query = select(Promocion).order_by(Promocion.fecha_inicio.desc())
    if only_active:
        today = date.today()
        query = query.where(
            Promocion.activa == True,  # noqa: E712
            Promocion.fecha_inicio <= today,
            Promocion.fecha_fin >= today,
        )
    result = await db.execute(
        query.options(selectinload(Promocion.productos_asociados))
    )
    return list(result.scalars().all())


async def get_promotion_by_id(
    db: AsyncSession, promo_id: uuid.UUID
) -> Promocion:
    result = await db.execute(
        select(Promocion)
        .where(Promocion.id == promo_id)
        .options(selectinload(Promocion.productos_asociados))
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise NotFoundException(f"Promoción '{promo_id}' no encontrada")
    return promo


async def create_promotion(
    db: AsyncSession, data: PromocionCreate
) -> Promocion:
    existing = await db.execute(
        select(Promocion).where(Promocion.nombre == data.nombre)
    )
    if existing.scalar_one_or_none():
        raise ConflictException(f"Ya existe una promoción con el nombre '{data.nombre}'")

    promo = Promocion(
        nombre=data.nombre,
        tipo=data.tipo,
        descuento_porcentaje=data.descuento_porcentaje,
        descuento_fijo=data.descuento_fijo,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        activa=data.activa,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return promo


async def update_promotion(
    db: AsyncSession, promo_id: uuid.UUID, data: PromocionUpdate
) -> Promocion:
    promo = await get_promotion_by_id(db, promo_id)

    if data.nombre is not None:
        promo.nombre = data.nombre
    if data.descuento_porcentaje is not None:
        promo.descuento_porcentaje = data.descuento_porcentaje
    if data.descuento_fijo is not None:
        promo.descuento_fijo = data.descuento_fijo
    if data.fecha_inicio is not None:
        promo.fecha_inicio = data.fecha_inicio
    if data.fecha_fin is not None:
        promo.fecha_fin = data.fecha_fin
    if data.activa is not None:
        promo.activa = data.activa

    await db.commit()
    await db.refresh(promo)
    return promo


async def delete_promotion(db: AsyncSession, promo_id: uuid.UUID) -> None:
    promo = await get_promotion_by_id(db, promo_id)
    await db.delete(promo)
    await db.commit()


async def add_product_to_promotion(
    db: AsyncSession, promo_id: uuid.UUID, data: PromocionProductoCreate
) -> PromocionProducto:
    """Associate a specific perfume/presentation with an 'individual' promotion."""
    promo = await get_promotion_by_id(db, promo_id)

    association = PromocionProducto(
        promocion_id=promo.id,
        perfume_id=data.perfume_id,
        presentacion_id=data.presentacion_id,
    )
    db.add(association)
    await db.commit()
    await db.refresh(association)
    return association
