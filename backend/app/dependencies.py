"""
Shared FastAPI dependencies injected into route handlers.

- `get_db`: provides an async database session per request.
- `get_current_admin`: validates JWT and returns the authenticated admin user.
"""

from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.database import async_session_maker

# Reusable security scheme for Swagger UI
bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, automatically closing it after use."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """
    Validate the Bearer JWT token and return the token payload.

    Raises 401 if the token is missing, expired, or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_current_superadmin(
    payload: dict = Depends(get_current_admin),
) -> dict:
    """
    Restrict endpoint access to super_admin role only.

    Reads the 'rol' claim from the JWT payload (set during login).
    No DB round-trip required — authorization is fully token-based.

    Raises 403 if the authenticated admin is not a super_admin.
    """
    if payload.get("rol") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a super administradores.",
        )
    return payload
