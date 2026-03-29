import asyncio
from app.modules.auth.schemas import LoginRequest
from app.database import async_session_maker
from app.modules.auth.service import login

async def test():
    req = LoginRequest(email="admin@perfumes2506.com", password="admin")
    async with async_session_maker() as session:
        result = await login(session, req)
        print("Success:", result.access_token)

if __name__ == "__main__":
    asyncio.run(test())
