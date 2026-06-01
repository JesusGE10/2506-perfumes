"""HTTP router for admin authentication and profile management."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_current_superadmin, get_db
from app.modules.auth import service
from app.modules.auth.schemas import (
    AdminCreate,
    AdminListItem,
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


# ─── Super-admin: Admin User Management ──────────────────────────────────────

@router.get(
    "/admin/users",
    response_model=list[AdminListItem],
    dependencies=[Depends(get_current_superadmin)],
)
async def list_admins(
    payload: dict = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """List all admin accounts except the requestor. Super-admin only."""
    return await service.list_admins(db, exclude_id=payload["sub"])


@router.post(
    "/admin/users",
    response_model=AdminListItem,
    status_code=201,
    dependencies=[Depends(get_current_superadmin)],
)
async def create_admin(
    data: AdminCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin account. Super-admin only."""
    return await service.create_admin(db, data)


@router.patch(
    "/admin/users/{target_id}/toggle",
    response_model=AdminListItem,
    dependencies=[Depends(get_current_superadmin)],
)
async def toggle_admin(
    target_id: str,
    payload: dict = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle an admin account active/inactive. Super-admin only. Cannot self-deactivate."""
    return await service.toggle_admin_activo(db, target_id=target_id, requestor_id=payload["sub"])
