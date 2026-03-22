"""
Marca model — perfume brands.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Marca(Base):
    """Perfume brand (e.g. Dior, Chanel, Lattafa)."""

    __tablename__ = "marca"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(
        String(150), unique=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(
        String(150), unique=True, nullable=False, index=True
    )
    pais_origen: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
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
    perfumes: Mapped[list["Perfume"]] = relationship(  # noqa: F821
        back_populates="marca", lazy="selectin"
    )
