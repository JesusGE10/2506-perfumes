"""Pydantic schemas for products (perfumes, presentations, notes, images)."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.products.models import FamiliaOlfativaEnum, GeneroEnum, TipoNotaEnum


# --- Notes ---

class NotaOlfativaResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    familia: FamiliaOlfativaEnum
    tipo: TipoNotaEnum  # position in pyramid

    model_config = {"from_attributes": True}


class NotaOlfativaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    familia: FamiliaOlfativaEnum


# --- Presentations (size variants) ---

class PresentacionCreate(BaseModel):
    tamano_ml: int = Field(..., gt=0)
    precio: Decimal = Field(..., gt=0, decimal_places=2)
    stock: int = Field(0, ge=0)


class PresentacionUpdate(BaseModel):
    tamano_ml: int | None = Field(None, gt=0)
    precio: Decimal | None = Field(None, gt=0, decimal_places=2)
    stock: int | None = Field(None, ge=0)


class PresentacionResponse(BaseModel):
    id: uuid.UUID
    tamano_ml: int
    precio: Decimal
    stock: int
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Images ---

class ImagenResponse(BaseModel):
    id: uuid.UUID
    url: str
    orden: int
    es_principal: bool

    model_config = {"from_attributes": True}


# --- Perfume note assignment ---

class PerfumeNotaCreate(BaseModel):
    nota_id: uuid.UUID
    tipo: TipoNotaEnum


# --- Perfume (main product) ---

class PerfumeCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    marca_id: uuid.UUID
    categoria_id: uuid.UUID
    genero: GeneroEnum
    descripcion: str | None = None
    activo: bool = True
    destacado: bool = False
    es_arabe: bool = False
    es_nuevo: bool = False
    presentaciones: list[PresentacionCreate] = Field(default_factory=list)
    notas: list[PerfumeNotaCreate] = Field(default_factory=list)


class PerfumeUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    marca_id: uuid.UUID | None = None
    categoria_id: uuid.UUID | None = None
    genero: GeneroEnum | None = None
    descripcion: str | None = None
    activo: bool | None = None
    destacado: bool | None = None
    es_arabe: bool | None = None
    es_nuevo: bool | None = None


class PerfumeSummaryResponse(BaseModel):
    """Lightweight response for catalog listing."""
    id: uuid.UUID
    nombre: str
    slug: str
    genero: GeneroEnum
    activo: bool
    destacado: bool
    es_arabe: bool
    es_nuevo: bool
    marca: "MarcaSummary"
    categoria: "CategoriaSummary"
    presentaciones: list[PresentacionResponse]
    imagen_principal: str | None = None

    model_config = {"from_attributes": True}


class PerfumeDetailResponse(PerfumeSummaryResponse):
    """Full response for product detail page."""
    descripcion: str | None
    imagenes: list[ImagenResponse]
    notas: list[NotaOlfativaResponse]
    created_at: datetime
    updated_at: datetime


class MarcaSummary(BaseModel):
    id: uuid.UUID
    nombre: str
    slug: str
    model_config = {"from_attributes": True}


class CategoriaSummary(BaseModel):
    id: uuid.UUID
    nombre: str
    slug: str
    model_config = {"from_attributes": True}


# Rebuild forward refs
PerfumeSummaryResponse.model_rebuild()
PerfumeDetailResponse.model_rebuild()


# --- Catalog filters ---

class ProductFilters(BaseModel):
    category: str | None = None       # category slug
    brand: str | None = None           # brand slug
    gender: GeneroEnum | None = None
    family: FamiliaOlfativaEnum | None = None
    is_arab: bool | None = None
    min_price: Decimal | None = None
    max_price: Decimal | None = None
    sort_by: str | None = "newest"    # price_asc, price_desc, newest, name
    q: str | None = None               # text search
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)
