"""
Order models — Pedido, PedidoItem, ZonaEnvio, CheckoutIniciado.

Handles the complete order lifecycle and delivery zone configuration.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# --- Enums ---

class EstadoPedidoEnum(str, enum.Enum):
    """Order status lifecycle."""
    PENDIENTE = "pendiente"
    CONFIRMADO = "confirmado"
    ENVIADO = "enviado"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"


class MetodoPagoEnum(str, enum.Enum):
    """Accepted payment methods."""
    TRANSFERENCIA = "transferencia"
    PAGO_MOVIL = "pago_movil"
    EFECTIVO = "efectivo"
    ZELLE = "zelle"


# --- Models ---

class ZonaEnvio(Base):
    """Configurable delivery zone with associated cost."""

    __tablename__ = "zona_envio"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(
        String(150), unique=True, nullable=False
    )
    costo: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    pedidos: Mapped[list["Pedido"]] = relationship(
        back_populates="zona_envio", lazy="selectin"
    )


class Pedido(Base):
    """Customer order with delivery info and totals."""

    __tablename__ = "pedido"

    # Composite index covering all metrics queries that filter by status + date.
    # Single-column indexes on estado and created_at are kept for simple filters;
    # the composite index accelerates the combined WHERE clauses used by the dashboard.
    __table_args__ = (
        Index("ix_pedido_estado_created_at", "estado", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cliente_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    cliente_telefono: Mapped[str] = mapped_column(String(30), nullable=False)
    direccion: Mapped[str] = mapped_column(Text, nullable=False)
    zona_envio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("zona_envio.id", ondelete="RESTRICT"),
        nullable=False,
    )
    costo_envio: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    subtotal: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    descuento_total: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0, nullable=False
    )
    total: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    estado: Mapped[EstadoPedidoEnum] = mapped_column(
        Enum(EstadoPedidoEnum, name="estado_pedido_enum"),
        default=EstadoPedidoEnum.PENDIENTE,
        nullable=False,
        index=True,
    )
    metodo_pago: Mapped[MetodoPagoEnum] = mapped_column(
        Enum(MetodoPagoEnum, name="metodo_pago_enum"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    zona_envio: Mapped["ZonaEnvio"] = relationship(
        back_populates="pedidos", lazy="selectin"
    )
    items: Mapped[list["PedidoItem"]] = relationship(
        back_populates="pedido", lazy="selectin", cascade="all, delete-orphan"
    )


class PedidoItem(Base):
    """Line item within an order — references a specific presentation."""

    __tablename__ = "pedido_item"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pedido_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pedido.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    presentacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("presentacion.id", ondelete="RESTRICT"),
        nullable=False,
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    descuento: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0, nullable=False
    )

    # Relationships
    pedido: Mapped["Pedido"] = relationship(
        back_populates="items", lazy="selectin"
    )
    presentacion: Mapped["Presentacion"] = relationship(lazy="selectin")  # noqa: F821

    @property
    def perfume_nombre(self) -> str | None:
        if self.presentacion and self.presentacion.perfume:
            return self.presentacion.perfume.nombre
        return None

    @property
    def tamano_ml(self) -> int | None:
        if self.presentacion:
            return self.presentacion.tamano_ml
        return None


class CheckoutIniciado(Base):
    """
    Tracks started-but-not-completed checkouts for cart abandonment workflow.

    The cart_data JSONB stores a snapshot of the cart at checkout start.
    n8n's W5 workflow queries this table for records older than 2 hours.
    """

    __tablename__ = "checkout_iniciado"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    carrito_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    cliente_telefono: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    finalizado: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
