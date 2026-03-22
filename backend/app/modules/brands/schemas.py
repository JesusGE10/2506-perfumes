"""Pydantic schemas for the brands module."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class MarcaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    pais_origen: str | None = Field(None, max_length=100)
    logo_url: str | None = Field(None, max_length=500)


class MarcaCreate(MarcaBase):
    pass


class MarcaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=150)
    pais_origen: str | None = Field(None, max_length=100)
    logo_url: str | None = Field(None, max_length=500)


class MarcaResponse(MarcaBase):
    id: uuid.UUID
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
