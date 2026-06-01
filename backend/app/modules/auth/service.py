"""Business logic service for admin authentication and profile management."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.models import AdminSettings, AdminUser
from app.modules.auth.schemas import (
    AdminCreate,
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

    # Prevent deactivated admins from authenticating.
    if not user.activo:
        raise AppException(
            detail="Esta cuenta de administrador ha sido desactivada",
            code="ACCOUNT_DISABLED",
            status_code=403,
        )

    # Update last_login timestamp
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    # Include 'rol' in JWT payload so authorization middleware can check
    # role-restricted endpoints without an additional DB round-trip.
    token = create_access_token(data={"sub": str(user.id), "email": user.email, "rol": user.rol})
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


# ─── Super-admin: Admin User Management ──────────────────────────────────────

async def list_admins(db: AsyncSession, exclude_id: str) -> list[AdminUser]:
    """Return all admin users, active first. Excludes the requestor themselves."""
    result = await db.execute(
        select(AdminUser)
        .where(AdminUser.id != exclude_id)
        .order_by(AdminUser.activo.desc(), AdminUser.created_at.asc())
    )
    return list(result.scalars().all())


async def create_admin(db: AsyncSession, data: AdminCreate) -> AdminUser:
    """Create a new admin account. Raises 409 if the email is already taken."""
    existing = await db.execute(
        select(AdminUser).where(AdminUser.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise AppException(
            detail=f"Ya existe un administrador con el email '{data.email}'",
            code="EMAIL_TAKEN",
            status_code=409,
        )

    new_admin = AdminUser(
        email=data.email,
        password_hash=hash_password(data.password),
        nombre=data.nombre,
        rol=data.rol,
        activo=True,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin


async def toggle_admin_activo(
    db: AsyncSession, target_id: str, requestor_id: str
) -> AdminUser:
    """Activate or deactivate an admin account. A super_admin cannot deactivate themselves."""
    if target_id == requestor_id:
        raise AppException(
            detail="No puedes desactivar tu propia cuenta de administrador",
            code="SELF_DEACTIVATION",
            status_code=400,
        )

    result = await db.execute(select(AdminUser).where(AdminUser.id == target_id))
    target = result.scalar_one_or_none()
    if not target:
        raise AppException(detail="Administrador no encontrado", code="NOT_FOUND", status_code=404)

    target.activo = not target.activo
    await db.commit()
    await db.refresh(target)
    return target
