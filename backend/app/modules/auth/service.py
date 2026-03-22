"""Business logic service for admin authentication."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.security import create_access_token, verify_password
from app.modules.auth.models import AdminUser
from app.modules.auth.schemas import LoginRequest, TokenResponse


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
