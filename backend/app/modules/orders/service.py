"""
Order service — checkout logic with stock validation, discount application,
and n8n event dispatch.

Flow:
1. Validate zone and all presentations exist with enough stock
2. Calculate prices and apply active promotions (if any)
3. Create the order + line items atomically
4. Decrement stock for each presentation
5. Dispatch 'order_created' event to n8n (fire-and-forget)
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.events import dispatch_event
from app.core.exceptions import (
    InsufficientStockException,
    NotFoundException,
    ValidationException,
)
from app.modules.orders.models import (
    CheckoutIniciado,
    EstadoPedidoEnum,
    Pedido,
    PedidoItem,
    ZonaEnvio,
)
from app.modules.orders.schemas import (
    CheckoutCreateRequest,
    PedidoStatusUpdate,
)
from app.modules.products.models import Presentacion
from app.modules.promotions.models import Promocion


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _get_zone(db: AsyncSession, zone_id: uuid.UUID) -> ZonaEnvio:
    result = await db.execute(
        select(ZonaEnvio).where(ZonaEnvio.id == zone_id, ZonaEnvio.activa == True)  # noqa: E712
    )
    zone = result.scalar_one_or_none()
    if not zone:
        raise NotFoundException("Zona de envío no encontrada o inactiva")
    return zone


async def _get_presentation(
    db: AsyncSession, pres_id: uuid.UUID
) -> Presentacion:
    result = await db.execute(
        select(Presentacion)
        .where(Presentacion.id == pres_id)
        .options(selectinload(Presentacion.perfume))
    )
    pres = result.scalar_one_or_none()
    if not pres:
        raise NotFoundException(f"Presentación '{pres_id}' no encontrada")
    return pres


async def _get_active_global_promotions(db: AsyncSession) -> list[Promocion]:
    """Return active global promotions with today's date in range."""
    from datetime import date
    today = date.today()
    result = await db.execute(
        select(Promocion).where(
            Promocion.activa == True,  # noqa: E712
            Promocion.fecha_inicio <= today,
            Promocion.fecha_fin >= today,
            Promocion.tipo == "global",
        )
    )
    return list(result.scalars().all())


def _apply_discount(
    price: Decimal, promo: Promocion | None
) -> tuple[Decimal, Decimal]:
    """Return (final_price, discount_amount)."""
    if promo is None:
        return price, Decimal("0")

    if promo.descuento_porcentaje is not None:
        discount = (price * promo.descuento_porcentaje / Decimal("100")).quantize(
            Decimal("0.01")
        )
    elif promo.descuento_fijo is not None:
        discount = min(promo.descuento_fijo, price)
    else:
        discount = Decimal("0")

    return max(price - discount, Decimal("0")), discount


# ─── Checkout ────────────────────────────────────────────────────────────────

async def create_order(db: AsyncSession, data: CheckoutCreateRequest) -> Pedido:
    """Process checkout and create a confirmed order."""

    # 1. Validate delivery zone
    zone = await _get_zone(db, data.zona_envio_id)

    # 2. Load presentations and validate stock
    presentations: dict[uuid.UUID, Presentacion] = {}
    for item_input in data.items:
        pres = await _get_presentation(db, item_input.presentacion_id)
        if pres.stock < item_input.cantidad:
            raise InsufficientStockException(
                f"Stock insuficiente para '{pres.perfume.nombre}' "
                f"({pres.tamano_ml}ml): disponible {pres.stock}, "
                f"solicitado {item_input.cantidad}"
            )
        presentations[item_input.presentacion_id] = pres

    # 3. Get applicable global promotions
    global_promos = await _get_active_global_promotions(db)
    # Use the first/best global promo if multiple exist
    global_promo = global_promos[0] if global_promos else None

    # 4. Calculate totals
    subtotal = Decimal("0")
    total_discount = Decimal("0")
    line_items: list[dict] = []

    for item_input in data.items:
        pres = presentations[item_input.presentacion_id]
        unit_price = Decimal(str(pres.precio))
        final_price, discount = _apply_discount(unit_price, global_promo)

        line_subtotal = final_price * item_input.cantidad
        line_discount = discount * item_input.cantidad

        subtotal += unit_price * item_input.cantidad
        total_discount += line_discount

        line_items.append(
            {
                "presentacion_id": item_input.presentacion_id,
                "cantidad": item_input.cantidad,
                "precio_unitario": unit_price,
                "descuento": line_discount,
            }
        )

    costo_envio = Decimal(str(zone.costo))
    total = subtotal - total_discount + costo_envio

    # 5. Persist order atomically
    order = Pedido(
        cliente_nombre=data.cliente_nombre,
        cliente_telefono=data.cliente_telefono,
        direccion=data.direccion,
        zona_envio_id=data.zona_envio_id,
        costo_envio=costo_envio,
        subtotal=subtotal,
        descuento_total=total_discount,
        total=total,
        estado=EstadoPedidoEnum.PENDIENTE,
        metodo_pago=data.metodo_pago,
    )
    db.add(order)
    await db.flush()  # get order.id

    for line in line_items:
        item = PedidoItem(
            pedido_id=order.id,
            **line,
        )
        db.add(item)

    # 6. ⚠️ Stock is NOT decremented here—only on admin confirmation
    # (prevents ghost orders from inflating inventory deductions)

    await db.commit()
    await db.refresh(order)

    # 7. Dispatch event to n8n (fire-and-forget — doesn't block the response)
    await dispatch_event(
        "order_created",
        {
            "order_id": str(order.id),
            "cliente_nombre": order.cliente_nombre,
            "cliente_telefono": order.cliente_telefono,
            "total": float(order.total),
            "metodo_pago": order.metodo_pago.value,
            "items": [
                {
                    "presentacion_id": str(li["presentacion_id"]),
                    "cantidad": li["cantidad"],
                    "precio_unitario": float(li["precio_unitario"]),
                }
                for li in line_items
            ],
        },
    )

    return await get_order_by_id(db, order.id)


# ─── Queries ─────────────────────────────────────────────────────────────────

async def list_delivery_zones(db: AsyncSession) -> list[ZonaEnvio]:
    """Get all active delivery zones."""
    result = await db.execute(
        select(ZonaEnvio)
        .where(ZonaEnvio.activa == True)  # noqa: E712
        .order_by(ZonaEnvio.costo.asc())
    )
    return list(result.scalars().all())


async def get_order_by_id(db: AsyncSession, order_id: uuid.UUID) -> Pedido:
    result = await db.execute(
        select(Pedido)
        .where(Pedido.id == order_id)
        .options(
            selectinload(Pedido.items).selectinload(PedidoItem.presentacion).selectinload(
                Presentacion.perfume
            )
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException(f"Pedido '{order_id}' no encontrado")
    return order


async def list_orders(
    db: AsyncSession,
    estado: EstadoPedidoEnum | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Pedido], int]:
    from sqlalchemy import func

    query = select(Pedido)
    if estado:
        query = query.where(Pedido.estado == estado)
    query = query.order_by(Pedido.created_at.desc())

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * size
    items_result = await db.execute(
        query.offset(offset)
        .limit(size)
        .options(selectinload(Pedido.items))
    )
    return list(items_result.scalars().all()), total


async def update_order_status(
    db: AsyncSession, order_id: uuid.UUID, data: PedidoStatusUpdate
) -> Pedido:
    """Admin status update with n8n notification."""
    order = await get_order_by_id(db, order_id)

    old_status = order.estado
    order.estado = data.estado
    await db.commit()

    # Notify n8n of status change
    if data.estado != old_status:
        await dispatch_event(
            "order_status_changed",
            {
                "order_id": str(order.id),
                "cliente_telefono": order.cliente_telefono,
                "estado_anterior": old_status.value,
                "estado_nuevo": data.estado.value,
            },
        )

    return await get_order_by_id(db, order.id)


# ─── Cart abandonment tracking ───────────────────────────────────────────────

async def track_checkout_started(
    db: AsyncSession,
    carrito_data: dict,
    cliente_telefono: str | None = None,
) -> CheckoutIniciado:
    """Record a started checkout for n8n cart abandonment workflow (W5)."""
    record = CheckoutIniciado(
        carrito_data=carrito_data,
        cliente_telefono=cliente_telefono,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    await dispatch_event(
        "checkout_started",
        {
            "checkout_id": str(record.id),
            "cliente_telefono": cliente_telefono,
            "carrito": carrito_data,
        },
    )
    return record
