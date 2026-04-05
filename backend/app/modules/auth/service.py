"""Business logic service for admin authentication and profile management."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.models import AdminSettings, AdminUser
from app.modules.auth.schemas import (
    AdminPasswordUpdate,
    AdminProfileUpdate,
    AdminSettingsUpdate,
    LoginRequest,
    TokenResponse,
)


# ─── Auth ─────────────────────────────────────────────────────────────────────

async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    """Authenticate an admin user and return a JWT token."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise AppException(
            detail="Credenciales inválidas",
            code="INVALID_CREDENTIALS",
            status_code=401,
        )

    # Update last_login timestamp
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


async def get_admin_by_id(db: AsyncSession, admin_id: str) -> AdminUser:
    """Retrieve an admin user by their UUID string (from JWT 'sub' claim)."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise AppException(
            detail="Admin no encontrado",
            code="NOT_FOUND",
            status_code=404,
        )
    return user


# ─── Profile ──────────────────────────────────────────────────────────────────

async def update_profile(db: AsyncSession, admin_id: str, data: AdminProfileUpdate) -> AdminUser:
    """Update admin's name and/or profile photo URL."""
    user = await get_admin_by_id(db, admin_id)

    if data.nombre is not None:
        user.nombre = data.nombre
    if data.foto_perfil_url is not None:
        user.foto_perfil_url = data.foto_perfil_url

    await db.commit()
    await db.refresh(user)
    return user


async def update_password(db: AsyncSession, admin_id: str, data: AdminPasswordUpdate) -> None:
    """Change admin password after verifying current password."""
    user = await get_admin_by_id(db, admin_id)

    if not verify_password(data.current_password, user.password_hash):
        raise AppException(
            detail="La contraseña actual es incorrecta",
            code="INVALID_PASSWORD",
            status_code=400,
        )

    user.password_hash = hash_password(data.new_password)
    await db.commit()


# ─── Settings ─────────────────────────────────────────────────────────────────

async def get_or_create_settings(db: AsyncSession, admin_id: str) -> AdminSettings:
    """Get admin settings, creating defaults if they don't exist yet."""
    user = await get_admin_by_id(db, admin_id)

    if user.settings is None:
        settings = AdminSettings(admin_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(user)

    return user.settings


async def update_settings(
    db: AsyncSession, admin_id: str, data: AdminSettingsUpdate
) -> AdminSettings:
    """Update stock threshold settings for an admin."""
    settings = await get_or_create_settings(db, admin_id)

    settings.stock_low_threshold = data.stock_low_threshold
    settings.stock_critical_threshold = data.stock_critical_threshold
    settings.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(settings)
    return settings
