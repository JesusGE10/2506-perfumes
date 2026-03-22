import asyncio
from sqlalchemy import text
from app.database import async_session_maker

async def update():
    async with async_session_maker() as session:
        # Get all zones
        result = await session.execute(text("SELECT id FROM zona_envio ORDER BY nombre"))
        ids = [row[0] for row in result.fetchall()]
        
        if len(ids) >= 2:
            # Update first two for the new logic
            await session.execute(
                text("UPDATE zona_envio SET nombre='Delivery en Caracas', costo=5.00, activa=true WHERE id=:id"),
                {"id": ids[0]}
            )
            await session.execute(
                text("UPDATE zona_envio SET nombre='Envio a Nivel Nacional', costo=0.00, activa=true WHERE id=:id"),
                {"id": ids[1]}
            )
            # Disable the rest
            for zid in ids[2:]:
                await session.execute(
                    text("UPDATE zona_envio SET activa=false WHERE id=:id"),
                    {"id": zid}
                )
            await session.commit()
            print("Zones updated successfully.")
        else:
            print("Not enough zones to update.")

if __name__ == "__main__":
    asyncio.run(update())
