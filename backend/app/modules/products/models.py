"""
Product models — Perfume, NotaOlfativa, PerfumeNota, Presentacion, Imagen.

These are the core entities of the e-commerce catalog.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# --- Enums ---

class GeneroEnum(str, enum.Enum):
    """Perfume gender target."""
    HOMBRE = "hombre"
    MUJER = "mujer"
    UNISEX = "unisex"


class FamiliaOlfativaEnum(str, enum.Enum):
    """Olfactive note family."""
    CITRICO = "citrico"
    AMADERADO = "amaderado"
    FLORAL = "floral"
    ORIENTAL = "oriental"
    DULCE = "dulce"
    FRESCO = "fresco"
    ESPECIADO = "especiado"
    ACUATICO = "acuatico"


class TipoNotaEnum(str, enum.Enum):
    """Position of the note in the olfactive pyramid."""
    SALIDA = "salida"
    CORAZON = "corazon"
    FONDO = "fondo"


# --- Models ---

class NotaOlfativa(Base):
    """Individual olfactive note (e.g. bergamota, vainilla, sándalo)."""

    __tablename__ = "nota_olfativa"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    familia: Mapped[FamiliaOlfativaEnum] = mapped_column(
        Enum(FamiliaOlfativaEnum, name="familia_olfativa_enum"),
        nullable=False,
    )

    # Relationships
    perfume_notas: Mapped[list["PerfumeNota"]] = relationship(
        back_populates="nota", lazy="selectin"
    )


class Perfume(Base):
    """Main product entity — a perfume with its metadata."""

    __tablename__ = "perfume"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False, index=True
    )
    marca_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marca.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    categoria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categoria.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    genero: Mapped[GeneroEnum] = mapped_column(
        Enum(GeneroEnum, name="genero_enum"),
        nullable=False,
        index=True,
    )
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    destacado: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    es_arabe: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    es_nuevo: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
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

    # Relationships
    marca: Mapped["Marca"] = relationship(  # noqa: F821
        back_populates="perfumes", lazy="selectin"
    )
    categoria: Mapped["Categoria"] = relationship(  # noqa: F821
        back_populates="perfumes", lazy="selectin"
    )
    presentaciones: Mapped[list["Presentacion"]] = relationship(
        back_populates="perfume", lazy="selectin", cascade="all, delete-orphan"
    )
    imagenes: Mapped[list["Imagen"]] = relationship(
        back_populates="perfume", lazy="selectin", cascade="all, delete-orphan"
    )
    perfume_notas: Mapped[list["PerfumeNota"]] = relationship(
        back_populates="perfume", lazy="selectin", cascade="all, delete-orphan"
    )

    @property
    def notas(self):
        """Map the pivot relationships to a flat list for Pydantic serialization."""
        return [
            {
                "id": pn.nota.id,
                "nombre": pn.nota.nombre,
                "familia": pn.nota.familia,
                "tipo": pn.tipo,
            }
            for pn in self.perfume_notas
            if pn.nota is not None
        ]

    @property
    def imagen_principal(self) -> str | None:
        if not self.imagenes:
            return None
        principal = next((img.url for img in self.imagenes if img.es_principal), None)
        return principal or self.imagenes[0].url


class PerfumeNota(Base):
    """Pivot table linking perfumes to olfactive notes with position type."""

    __tablename__ = "perfume_nota"

    perfume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("perfume.id", ondelete="CASCADE"),
        primary_key=True,
    )
    nota_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nota_olfativa.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tipo: Mapped[TipoNotaEnum] = mapped_column(
        Enum(TipoNotaEnum, name="tipo_nota_enum"),
        primary_key=True,
    )

    # Relationships
    perfume: Mapped["Perfume"] = relationship(
        back_populates="perfume_notas", lazy="selectin"
    )
    nota: Mapped["NotaOlfativa"] = relationship(
        back_populates="perfume_notas", lazy="selectin"
    )


class Presentacion(Base):
    """Product variant — a specific size/volume with its price and stock."""

    __tablename__ = "presentacion"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    perfume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("perfume.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tamano_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    precio: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    perfume: Mapped["Perfume"] = relationship(
        back_populates="presentaciones", lazy="selectin"
    )


class Imagen(Base):
    """Product image stored in Cloudflare R2."""

    __tablename__ = "imagen"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    perfume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("perfume.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    es_principal: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationships
    perfume: Mapped["Perfume"] = relationship(
        back_populates="imagenes", lazy="selectin"
    )
