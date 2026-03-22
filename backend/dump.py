import asyncio
import asyncpg
import json
import os
import sys

sys.path.append(os.path.abspath('.'))
from app.config import settings

async def main():
    try:
        url = str(settings.DATABASE_URL).replace('+asyncpg','')
        conn = await asyncpg.connect(url)
        rows = await conn.fetch("SELECT p.slug, i.url FROM perfume p JOIN imagen i ON p.id = i.perfume_id;")
        
        mapping = {}
        for r in rows:
            mapping[r['slug']] = r['url']
            
        with open('mapping.json', 'w') as f:
            json.dump(mapping, f, indent=2)
            
        await conn.close()
    except Exception as e:
        with open('mapping_error.txt', 'w') as f:
            f.write(str(e))
    finally:
        sys.stdout.flush()
        os._exit(0)

if __name__ == '__main__':
    asyncio.run(main())
