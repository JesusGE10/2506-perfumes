import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.future import select

from app.database import Base, engine, async_session_maker
from app.modules.auth.models import AdminUser
from app.core.security import hash_password

async def ensure_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session_maker() as session:
        email = "admin@perfumes2506.com"
        password = "admin"
        hashed = hash_password(password)
        
        result = await session.execute(select(AdminUser).where(AdminUser.email == email))
        admin = result.scalars().first()
        
        if admin:
            print(f"🔄 Actualizando contraseña para: {email}")
            admin.password_hash = hashed
        else:
            print(f"⚙️ Creando administrador: {email}")
            new_admin = AdminUser(
                email=email,
                password_hash=hashed,
                nombre="Admin de Prueba"
            )
            session.add(new_admin)
            
        await session.commit()
        print(f"🎉 Admin listo: {email} / {password}")

if __name__ == "__main__":
    asyncio.run(ensure_admin())
