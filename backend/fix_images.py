import asyncio
import os
import sys

sys.path.append(os.path.abspath('.'))

from app.database import async_session_maker
from app.modules.products.models import Perfume, Imagen
from sqlalchemy import select

async def run():
    async with async_session_maker() as session:
        result = await session.execute(select(Perfume))
        perfumes = result.scalars().all()
        
        images = [
            "/productos/perfume_gold.png",
            "/productos/perfume_dark.png",
            "/productos/perfume_floral.png",
            "/productos/perfume_oud.png"
        ]
        
        count = 0
        for i, p in enumerate(perfumes):
            img_result = await session.execute(select(Imagen).where(Imagen.perfume_id == p.id))
            imgs = img_result.scalars().all()
            
            if not imgs:
                new_img = Imagen(
                    perfume_id=p.id,
                    url=images[i % len(images)],
                    orden=0,
                    es_principal=True
                )
                session.add(new_img)
                count += 1
            else:
                for existing in imgs:
                    existing.url = images[i % len(images)]
                    count += 1
                    
        await session.commit()
        print(f"Fixed {count} images via ORM!")

if __name__ == "__main__":
    asyncio.run(run())
