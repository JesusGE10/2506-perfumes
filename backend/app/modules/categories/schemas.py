"""Pydantic schemas for the categories module."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CategoriaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: str | None = Field(None, max_length=500)


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    descripcion: str | None = Field(None, max_length=500)


class CategoriaResponse(CategoriaBase):
    id: uuid.UUID
    slug: str
    created_at: datetime

    model_config = {"from_attributes": True}
