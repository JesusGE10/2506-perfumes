"""
StoreConfig model — key-value table for global store configuration.

Keys defined:
- whatsapp_number: international format without '+' (e.g. 584141234567)
- store_name: display name of the shop
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StoreConfig(Base):
    """Global store configuration stored as key-value pairs."""

    __tablename__ = "store_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Unique key name — used to look up specific settings
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    # Value is nullable — a None value means "not configured yet"
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Well-known key constants ──────────────────────────────────────────────
    KEY_WHATSAPP_NUMBER = "whatsapp_number"
    KEY_STORE_NAME = "store_name"
