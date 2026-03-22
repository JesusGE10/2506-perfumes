"""Pydantic schemas for promotions management."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.modules.promotions.models import TipoPromocionEnum


class PromocionCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    tipo: TipoPromocionEnum
    descuento_porcentaje: Decimal | None = Field(None, ge=0, le=100)
    descuento_fijo: Decimal | None = Field(None, ge=0)
    fecha_inicio: date
    fecha_fin: date
    activa: bool = True

    @model_validator(mode="after")
    def at_least_one_discount(self) -> "PromocionCreate":
        if self.descuento_porcentaje is None and self.descuento_fijo is None:
            raise ValueError(
                "Debe definir al menos 'descuento_porcentaje' o 'descuento_fijo'"
            )
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError("'fecha_fin' debe ser posterior a 'fecha_inicio'")
        return self


class PromocionUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    descuento_porcentaje: Decimal | None = Field(None, ge=0, le=100)
    descuento_fijo: Decimal | None = Field(None, ge=0)
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    activa: bool | None = None


class PromocionProductoCreate(BaseModel):
    """Attach a promotion to a specific perfume (and optionally a presentation)."""
    perfume_id: uuid.UUID
    presentacion_id: uuid.UUID | None = None


class PromocionResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    tipo: TipoPromocionEnum
    descuento_porcentaje: Decimal | None
    descuento_fijo: Decimal | None
    fecha_inicio: date
    fecha_fin: date
    activa: bool
    created_at: datetime

    model_config = {"from_attributes": True}
