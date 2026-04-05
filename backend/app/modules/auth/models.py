"""
AdminUser and AdminSettings models — administrator accounts and per-admin configuration.

Changes from v1:
- AdminUser: +foto_perfil_url, +rol (Enum super_admin/admin)
- AdminSettings: new table (1-to-1 with AdminUser), stores stock thresholds
  and any future per-admin configuration.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdminRolEnum(str, enum.Enum):
    """Back-office role classification — values must match the PostgreSQL enum."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"


class AdminUser(Base):
    """Admin user who can manage the back-office."""

    __tablename__ = "admin_user"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    foto_perfil_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rol: Mapped[str] = mapped_column(
        # Using String here to avoid SQLAlchemy↔PostgreSQL enum value mapping issues.
        # The PostgreSQL enum type is 'admin_rol_enum' with values: super_admin, admin.
        # Python-side validation uses AdminRolEnum. DB stores the string value directly.
        String(20),
        default="admin",
        nullable=False,
        server_default="admin",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship to settings (1-to-1, lazy loaded)
    settings: Mapped["AdminSettings | None"] = relationship(
        back_populates="admin", uselist=False, lazy="selectin",
        cascade="all, delete-orphan",
    )


class AdminSettings(Base):
    """Per-admin configuration — stock thresholds and UI preferences."""

    __tablename__ = "admin_settings"

    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admin_user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # Stock traffic-light thresholds
    # Products with stock < stock_low_threshold  → STOCK BAJO   (yellow)
    # Products with stock <= stock_critical_threshold → STOCK CRÍTICO (red)
    # Products with stock == 0                        → AGOTADO    (red)
    stock_low_threshold: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    stock_critical_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship back to admin
    admin: Mapped["AdminUser"] = relationship(back_populates="settings")
