"""
Async database engine and session factory.

Uses SQLAlchemy 2.x async mode with asyncpg as the PostgreSQL driver.
All models inherit from `Base` defined here.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Async engine — pool settings tuned for a small-to-medium workload
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

# Session factory — each request gets its own session via `get_db`
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy models."""

    pass
