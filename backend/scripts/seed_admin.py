"""
Seed script to create the initial admin user.

Usage:
    cd backend
    .venv/Scripts/python -m scripts.seed_admin
"""

import asyncio
import sys
from pathlib import Path

# Ensure the backend directory is in the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.database import async_session_maker  # noqa: E402
from app.modules.auth.models import AdminUser  # noqa: E402


async def seed_admin():
    """Create a default admin user if none exists."""
    async with async_session_maker() as session:
        from sqlalchemy import select

        result = await session.execute(select(AdminUser).limit(1))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin user already exists: {existing.email}")
            return

        admin = AdminUser(
            email="admin@perfumeria.com",
            password_hash=hash_password("admin123"),
            nombre="Administrador",
        )
        session.add(admin)
        await session.commit()
        print(f"Admin user created: {admin.email}")
        print("⚠️  Change the default password immediately!")


if __name__ == "__main__":
    asyncio.run(seed_admin())
