const fs = require('fs');

(async () => {
    try {
        const listRes = await fetch("http://localhost:8000/api/v1/products?limit=50");
        const json = await listRes.json();
        const map = {};
        for (const p of json.items) {
            const detailRes = await fetch(`http://localhost:8000/api/v1/products/${p.slug}`);
            const detailJson = await detailRes.json();
            const img = detailJson.imagenes?.find(i => i.es_principal)?.url || detailJson.imagenes?.[0]?.url;
            map[p.slug] = img;
        }
        fs.writeFileSync('map.json', JSON.stringify(map, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
