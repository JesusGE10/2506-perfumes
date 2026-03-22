"""
Full order schemas — checkout creation, status updates, and admin views.

Includes schemas for cart items, customer info, and order responses.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.modules.orders.models import EstadoPedidoEnum, MetodoPagoEnum


# ─── Cart / Checkout ─────────────────────────────────────────────────────────

class CheckoutItemInput(BaseModel):
    """A single item in the checkout cart."""
    presentacion_id: uuid.UUID
    cantidad: int = Field(..., gt=0)


class CheckoutCreateRequest(BaseModel):
    """Full checkout payload from the customer."""
    cliente_nombre: str = Field(..., min_length=1, max_length=200)
    cliente_telefono: str = Field(..., min_length=7, max_length=30)
    direccion: str = Field(..., min_length=5)
    zona_envio_id: uuid.UUID
    metodo_pago: MetodoPagoEnum
    items: list[CheckoutItemInput] = Field(..., min_length=1)
    # Optional: coupon/promotion code
    codigo_promocion: str | None = None

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("El carrito no puede estar vacío")
        return v


# ─── Responses ───────────────────────────────────────────────────────────────

class PedidoItemResponse(BaseModel):
    id: uuid.UUID
    presentacion_id: uuid.UUID
    cantidad: int
    precio_unitario: Decimal
    descuento: Decimal

    # Denormalized for convenience
    perfume_nombre: str | None = None
    tamano_ml: int | None = None

    model_config = {"from_attributes": True}


class PedidoResponse(BaseModel):
    id: uuid.UUID
    cliente_nombre: str
    cliente_telefono: str
    direccion: str
    zona_envio_id: uuid.UUID
    costo_envio: Decimal
    subtotal: Decimal
    descuento_total: Decimal
    total: Decimal
    estado: EstadoPedidoEnum
    metodo_pago: MetodoPagoEnum
    created_at: datetime
    updated_at: datetime
    items: list[PedidoItemResponse]

    model_config = {"from_attributes": True}


class ZonaEnvioResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    costo: Decimal
    activa: bool

    model_config = {"from_attributes": True}


# ─── Admin Status Update ──────────────────────────────────────────────────────

class PedidoStatusUpdate(BaseModel):
    """Admin can only change the status of an order."""
    estado: EstadoPedidoEnum
