"""HTTP router for orders — public checkout, admin order management."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse
from app.dependencies import get_current_admin, get_db
from app.modules.orders import service
from app.modules.orders.models import EstadoPedidoEnum, Pedido
from app.modules.orders.schemas import (
    CheckoutCreateRequest,
    PedidoResponse,
    PedidoStatusUpdate,
    ZonaEnvioResponse,
)
router = APIRouter(tags=["orders"])


# ─── Public checkout ─────────────────────────────────────────────────────────

@router.get("/delivery-zones", response_model=list[ZonaEnvioResponse])
async def list_delivery_zones(db: AsyncSession = Depends(get_db)):
    """List all active delivery zones to calculate checkout shipping costs."""
    return await service.list_delivery_zones(db)


@router.post("/checkout", response_model=PedidoResponse, status_code=201)
async def create_order(
    data: CheckoutCreateRequest, db: AsyncSession = Depends(get_db)
):
    """
    Submit a checkout and create a new order.

    - Validates stock for all items
    - Applies active global promotions automatically
    - Dispatches 'order_created' event to n8n
    """
    return await service.create_order(db, data)


@router.post("/checkout/track", status_code=202)
async def track_checkout(
    carrito_data: dict,
    cliente_telefono: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Record that a checkout was started (for cart abandonment tracking).
    n8n workflow W5 will follow up after 2 hours if not completed.
    Returns 202 Accepted.
    """
    await service.track_checkout_started(db, carrito_data, cliente_telefono)
    return {"message": "Checkout tracked"}


# ─── Admin order management ───────────────────────────────────────────────────

@router.get(
    "/admin/orders/summary",
    dependencies=[Depends(get_current_admin)],
)
async def get_orders_summary(db: AsyncSession = Depends(get_db)):
    """Return count and total amount of PENDIENTE orders. Admin only."""
    result = await db.execute(
        select(
            func.count(Pedido.id).label("pending_count"),
            func.coalesce(func.sum(Pedido.total), 0).label("pending_total"),
        ).where(Pedido.estado == EstadoPedidoEnum.PENDIENTE)
    )
    row = result.one()
    return {
        "pending_count": int(row.pending_count),
        "pending_total": float(row.pending_total),
    }


@router.get(
    "/admin/orders",
    response_model=PaginatedResponse[PedidoResponse],
    dependencies=[Depends(get_current_admin)],
)
async def list_orders(
    estado: EstadoPedidoEnum | None = None,
    q: str | None = Query(None, description="Búsqueda por nombre de cliente o teléfono"),
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all orders with optional status filter and text search. Admin only."""
    items, total = await service.list_orders(db, estado=estado, q=q, page=page, size=size)
    return PaginatedResponse.create(items=items, total=total, page=page, size=size)


@router.get(
    "/admin/orders/{order_id}",
    response_model=PedidoResponse,
    dependencies=[Depends(get_current_admin)],
)
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get a single order by ID. Admin only."""
    return await service.get_order_by_id(db, order_id)


@router.post(
    "/admin/orders/{order_id}/confirm",
    response_model=PedidoResponse,
    dependencies=[Depends(get_current_admin)],
)
async def confirm_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Confirm a PENDIENTE order. Decrements stock and changes status to CONFIRMADO.
    Admin only.
    """
    return await service.confirm_order(db, order_id)


@router.post(
    "/admin/orders/{order_id}/discard",
    response_model=PedidoResponse,
    dependencies=[Depends(get_current_admin)],
)
async def discard_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Discard a PENDIENTE order. Changes status to CANCELADO without touching stock.
    Admin only.
    """
    return await service.discard_order(db, order_id)


@router.patch(
    "/admin/orders/{order_id}/status",
    response_model=PedidoResponse,
    dependencies=[Depends(get_current_admin)],
)
async def update_order_status(
    order_id: uuid.UUID,
    data: PedidoStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update order status (state machine). Dispatches 'order_status_changed'
    event to n8n for customer notification. Admin only.
    """
    return await service.update_order_status(db, order_id, data)
