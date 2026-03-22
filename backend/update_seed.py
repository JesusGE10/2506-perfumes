import os
import shutil
import asyncio
import sys

# Add backend dir to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings
from app.modules.products.models import Perfume
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

brain_dir = r"C:\Users\jesus\.gemini\antigravity\brain\97a99372-e689-4b78-b94a-47892dead973"
images = {
    "perfume_gold_1774146340390.png": "perfume_gold.png",
    "perfume_dark_1774146353427.png": "perfume_dark.png",
    "perfume_floral_1774146367425.png": "perfume_floral.png",
    "perfume_oud_1774146380686.png": "perfume_oud.png"
}
dest_dir = r"c:\Users\jesus\Desktop\Desarrollo Antigravity\perfumes_2506\frontend\public\productos"

os.makedirs(dest_dir, exist_ok=True)

for src_name, dest_name in images.items():
    src_path = os.path.join(brain_dir, src_name)
    dst_path = os.path.join(dest_dir, dest_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dst_path)
    else:
        print(f"Warning: could not find {src_path}")

db_images = [f"/productos/{v}" for v in images.values()]

async def update_db():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
import asyncpg

async def update_db():
    conn_url = settings.DATABASE_URL.replace("+asyncpg", "")
    conn = await asyncpg.connect(conn_url)
    
    rows = await conn.fetch("SELECT id FROM perfume ORDER BY created_at")
    
    for idx, r in enumerate(rows):
        img = db_images[idx % len(db_images)]
        existing = await conn.fetch("SELECT id FROM imagen WHERE perfume_id = $1", r['id'])
        if existing:
            await conn.execute("UPDATE imagen SET url = $1, es_principal = true WHERE perfume_id = $2", img, r['id'])
        else:
            await conn.execute("INSERT INTO imagen (id, perfume_id, url, orden, es_principal) VALUES (gen_random_uuid(), $1, $2, 0, true)", r['id'], img)
    
    await conn.close()
    print("Database image properties updated successfully!")

if __name__ == "__main__":
    asyncio.run(update_db())
