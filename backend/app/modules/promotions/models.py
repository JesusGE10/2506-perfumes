"""
Promotion models — Promocion and PromocionProducto.

Supports three promotion types:
- individual: applies to specific products/presentations
- global: applies to all products
- paquete: bundle discount on a set of products
"""

import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TipoPromocionEnum(str, enum.Enum):
    """Promotion scope."""
    INDIVIDUAL = "individual"
    GLOBAL = "global"
    PAQUETE = "paquete"


class Promocion(Base):
    """Discount or promotional offer."""

    __tablename__ = "promocion"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[TipoPromocionEnum] = mapped_column(
        Enum(TipoPromocionEnum, name="tipo_promocion_enum"),
        nullable=False,
    )
    descuento_porcentaje: Mapped[float | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    descuento_fijo: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    productos_asociados: Mapped[list["PromocionProducto"]] = relationship(
        back_populates="promocion",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class PromocionProducto(Base):
    """
    Association table linking promotions to specific perfumes or presentations.

    For 'individual' promotions, links to a specific perfume and optionally
    a specific presentation. For 'paquete' promotions, links to all
    products in the bundle.
    """

    __tablename__ = "promocion_producto"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    promocion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("promocion.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    perfume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("perfume.id", ondelete="CASCADE"),
        nullable=False,
    )
    presentacion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("presentacion.id", ondelete="CASCADE"),
        nullable=True,
    )

    # Relationships
    promocion: Mapped["Promocion"] = relationship(
        back_populates="productos_asociados", lazy="selectin"
    )
    perfume: Mapped["Perfume"] = relationship(lazy="selectin")  # noqa: F821
    presentacion: Mapped["Presentacion | None"] = relationship(  # noqa: F821
        lazy="selectin"
    )
