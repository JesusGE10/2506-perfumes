"""Pydantic schemas for store configuration."""

from pydantic import BaseModel, Field, field_validator


class StoreConfigResponse(BaseModel):
    """Public-facing store configuration."""
    whatsapp_number: str | None = None
    store_name: str | None = None


class StoreConfigUpdate(BaseModel):
    """Payload to update store settings (super_admin only)."""
    whatsapp_number: str | None = Field(
        None,
        description="Número de WhatsApp en formato internacional sin '+' (ej: 584141234567)",
    )
    store_name: str | None = Field(None, max_length=200)

    @field_validator("whatsapp_number")
    @classmethod
    def validate_whatsapp(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits_only = v.replace(" ", "").replace("-", "")
        if not digits_only.isdigit():
            raise ValueError("El número de WhatsApp solo debe contener dígitos")
        if not (7 <= len(digits_only) <= 15):
            raise ValueError("El número de WhatsApp debe tener entre 7 y 15 dígitos")
        return digits_only  # normalize: store without spaces or dashes
