"""Pydantic schemas for admin authentication."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminResponse(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str
    created_at: datetime
    last_login: datetime | None

    model_config = {"from_attributes": True}
