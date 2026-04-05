"""Pydantic schemas for admin authentication and profile management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminSettingsResponse(BaseModel):
    stock_low_threshold: int
    stock_critical_threshold: int

    model_config = {"from_attributes": True}


class AdminResponse(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str
    foto_perfil_url: str | None = None
    rol: str = "admin"
    created_at: datetime
    last_login: datetime | None
    settings: AdminSettingsResponse | None = None

    model_config = {"from_attributes": True}


class AdminProfileUpdate(BaseModel):
    """Admin can update their own name and profile photo."""
    nombre: str | None = None
    foto_perfil_url: str | None = None


class AdminPasswordUpdate(BaseModel):
    """Password change — requires current password for verification."""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("La nueva contraseña debe tener al menos 6 caracteres")
        return v


class AdminSettingsUpdate(BaseModel):
    """Stock traffic-light threshold update."""
    stock_low_threshold: int
    stock_critical_threshold: int

    @field_validator("stock_low_threshold", "stock_critical_threshold")
    @classmethod
    def validate_threshold(cls, v: int) -> int:
        if v < 0:
            raise ValueError("El umbral debe ser un número positivo")
        return v
