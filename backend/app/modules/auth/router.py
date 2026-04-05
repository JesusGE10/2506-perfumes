"""HTTP router for admin authentication and profile management."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.auth import service
from app.modules.auth.schemas import (
    AdminPasswordUpdate,
    AdminProfileUpdate,
    AdminResponse,
    AdminSettingsResponse,
    AdminSettingsUpdate,
    LoginRequest,
    TokenResponse,
)

router = APIRouter(tags=["auth"])


# ─── Login / Token ────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password. Returns a JWT access token."""
    return await service.login(db, data)


# ─── Profile ──────────────────────────────────────────────────────────────────

@router.get("/auth/me", response_model=AdminResponse)
async def get_me(
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return the currently authenticated admin's profile including settings."""
    admin = await service.get_admin_by_id(db, payload["sub"])
    # Ensure settings record exists
    await service.get_or_create_settings(db, payload["sub"])
    await db.refresh(admin)
    return admin


@router.patch("/auth/me", response_model=AdminResponse)
async def update_profile(
    data: AdminProfileUpdate,
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update admin's display name and/or profile photo URL."""
    user = await service.update_profile(db, payload["sub"], data)
    return user


@router.put("/auth/me/password", status_code=204)
async def update_password(
    data: AdminPasswordUpdate,
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change admin password. Requires current password for verification."""
    await service.update_password(db, payload["sub"], data)


# ─── Settings ─────────────────────────────────────────────────────────────────

@router.get("/auth/me/settings", response_model=AdminSettingsResponse)
async def get_settings(
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return admin-specific settings (stock thresholds, etc.)."""
    settings = await service.get_or_create_settings(db, payload["sub"])
    return settings


@router.patch("/auth/me/settings", response_model=AdminSettingsResponse)
async def update_settings(
    data: AdminSettingsUpdate,
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update stock traffic-light thresholds and other per-admin settings."""
    settings = await service.update_settings(db, payload["sub"], data)
    return settings
