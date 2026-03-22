"""HTTP router for admin authentication."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.auth import service
from app.modules.auth.schemas import AdminResponse, LoginRequest, TokenResponse

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password. Returns a JWT access token."""
    return await service.login(db, data)


@router.get("/auth/me", response_model=AdminResponse)
async def get_me(
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return the currently authenticated admin's profile."""
    admin = await service.get_admin_by_id(db, payload["sub"])
    return admin
