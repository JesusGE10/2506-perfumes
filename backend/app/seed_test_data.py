"""
Seed script — loads test perfumes, brands, categories, delivery zones.
Run from the backend directory:
    python -m app.seed_test_data

Or via Docker:
    docker exec -it <backend_container> python -m app.seed_test_data
"""

import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import text

from app.database import async_session_maker
from app.modules.brands.models import Marca
from app.modules.categories.models import Categoria
from app.modules.products.models import (
    FamiliaOlfativaEnum,
    GeneroEnum,
    NotaOlfativa,
    Perfume,
    PerfumeNota,
    Presentacion,
    TipoNotaEnum,
)
from app.modules.orders.models import ZonaEnvio


# ── Helpers ────────────────────────────────────────────────────────────────

def slugify(s: str) -> str:
    import re, unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^\w\s-]", "", s.lower())
    return re.sub(r"[-\s]+", "-", s).strip("-")


# ── Static Data ────────────────────────────────────────────────────────────

BRANDS = [
    "Chanel", "Dior", "Lancôme", "Maison Margiela",
    "Amouage", "Tom Ford", "Lattafa", "Rasasi",
]

CATEGORIES = [
    ("Eau de Parfum",      "Concentración alta, larga duración"),
    ("Eau de Toilette",    "Concentración media, uso diario"),
    ("Perfume Árabe",      "Fragancias orientales de alta calidad"),
    ("Nicho",              "Fragancias exclusivas y de autor"),
    ("Colección Privée",   "Ediciones limitadas y especiales"),
]

DELIVERY_ZONES = [
    ("Delivery en Caracas",     Decimal("5.00")),
    ("Envio a Nivel Nacional",  Decimal("0.00")),
]

# NOTE_CATALOG: (nombre, familia)
NOTE_CATALOG = [
    ("Bergamota",     FamiliaOlfativaEnum.CITRICO),
    ("Limón",         FamiliaOlfativaEnum.CITRICO),
    ("Mandarina",     FamiliaOlfativaEnum.CITRICO),
    ("Pomelo",        FamiliaOlfativaEnum.CITRICO),
    ("Litchi",        FamiliaOlfativaEnum.FRESCO),
    ("Menta",         FamiliaOlfativaEnum.FRESCO),
    ("Lavanda",       FamiliaOlfativaEnum.FRESCO),
    ("Jazmín",        FamiliaOlfativaEnum.FLORAL),
    ("Rosa",          FamiliaOlfativaEnum.FLORAL),
    ("Iris",          FamiliaOlfativaEnum.FLORAL),
    ("Rosa de Damasco",     FamiliaOlfativaEnum.FLORAL),
    ("Rosa Oriental",       FamiliaOlfativaEnum.FLORAL),
    ("Peonía",        FamiliaOlfativaEnum.FLORAL),
    ("Magnolia",      FamiliaOlfativaEnum.FLORAL),
    ("Jazmín sambac", FamiliaOlfativaEnum.FLORAL),
    ("Helicriso",     FamiliaOlfativaEnum.FLORAL),
    ("Rosa árabe",    FamiliaOlfativaEnum.FLORAL),
    ("Cedro",         FamiliaOlfativaEnum.AMADERADO),
    ("Sándalo",       FamiliaOlfativaEnum.AMADERADO),
    ("Vetiver",       FamiliaOlfativaEnum.AMADERADO),
    ("Pachulí",       FamiliaOlfativaEnum.AMADERADO),
    ("Madera de ébano",   FamiliaOlfativaEnum.AMADERADO),
    ("Madera de Oud",     FamiliaOlfativaEnum.AMADERADO),
    ("Musgo de roble",    FamiliaOlfativaEnum.AMADERADO),
    ("Cachemira",     FamiliaOlfativaEnum.AMADERADO),
    ("Oud",           FamiliaOlfativaEnum.ORIENTAL),
    ("Ámbar",         FamiliaOlfativaEnum.ORIENTAL),
    ("Ámbar gris",    FamiliaOlfativaEnum.ORIENTAL),
    ("Almizcle",      FamiliaOlfativaEnum.ORIENTAL),
    ("Almizcle blanco",   FamiliaOlfativaEnum.DULCE),
    ("Incienso",      FamiliaOlfativaEnum.ORIENTAL),
    ("Benjuí",        FamiliaOlfativaEnum.ORIENTAL),
    ("Azafrán",       FamiliaOlfativaEnum.ESPECIADO),
    ("Cardamomo",     FamiliaOlfativaEnum.ESPECIADO),
    ("Pimienta negra",    FamiliaOlfativaEnum.ESPECIADO),
    ("Pimienta rosa", FamiliaOlfativaEnum.ESPECIADO),
    ("Nuez moscada",  FamiliaOlfativaEnum.ESPECIADO),
    ("Bayas de enebro",   FamiliaOlfativaEnum.ESPECIADO),
    ("Vainilla",      FamiliaOlfativaEnum.DULCE),
    ("Praline",       FamiliaOlfativaEnum.DULCE),
    ("Coco",          FamiliaOlfativaEnum.DULCE),
    ("Madera",        FamiliaOlfativaEnum.AMADERADO),
    ("Lirio del valle",   FamiliaOlfativaEnum.FLORAL),
    ("Grosella negra",    FamiliaOlfativaEnum.FRESCO),
    ("Pera",          FamiliaOlfativaEnum.FRESCO),
]

PRODUCTS = [
    {
        "nombre":    "Éclat d'Or",
        "descripcion": "Una fragancia luminosa y elegante con notas doradas de bergamota, jazmín y cedro. Perfecta para ocasiones especiales.",
        "genero":    GeneroEnum.MUJER,
        "es_nuevo":  True,
        "destacado": True,
        "es_arabe":  False,
        "brand":     "Lancôme",
        "category":  "Eau de Parfum",
        "presentaciones": [
            {"tamano_ml": 30,  "precio": Decimal("65.00"),  "stock": 20},
            {"tamano_ml": 50,  "precio": Decimal("110.00"), "stock": 15},
            {"tamano_ml": 100, "precio": Decimal("150.00"), "stock": 8},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Bergamota", "Limón"],
            TipoNotaEnum.CORAZON:  ["Jazmín", "Rosa", "Iris"],
            TipoNotaEnum.FONDO:    ["Cedro", "Ámbar", "Almizcle"],
        },
    },
    {
        "nombre":    "Rose Mystique",
        "descripcion": "Una rosa fresca con un giro moderno. Litchi, rosa y sándalo crean una fragancia romántica e irresistible.",
        "genero":    GeneroEnum.MUJER,
        "es_nuevo":  False,
        "destacado": True,
        "es_arabe":  False,
        "brand":     "Chanel",
        "category":  "Eau de Parfum",
        "presentaciones": [
            {"tamano_ml": 50,  "precio": Decimal("95.00"),  "stock": 12},
            {"tamano_ml": 100, "precio": Decimal("130.00"), "stock": 10},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Litchi", "Rosa de Damasco"],
            TipoNotaEnum.CORAZON:  ["Rosa Oriental", "Peonía"],
            TipoNotaEnum.FONDO:    ["Sándalo", "Almizcle blanco"],
        },
    },
    {
        "nombre":    "Noir Intense",
        "descripcion": "Una fragancia oscura y sofisticada para el hombre moderno. Especias orientales sobre una base de cuero y ámbar.",
        "genero":    GeneroEnum.HOMBRE,
        "es_nuevo":  False,
        "destacado": True,
        "es_arabe":  False,
        "brand":     "Dior",
        "category":  "Eau de Parfum",
        "presentaciones": [
            {"tamano_ml": 50,  "precio": Decimal("120.00"), "stock": 18},
            {"tamano_ml": 100, "precio": Decimal("180.00"), "stock": 6},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Cardamomo", "Pimienta negra"],
            TipoNotaEnum.CORAZON:  ["Vetiver", "Lavanda"],
            TipoNotaEnum.FONDO:    ["Oud", "Ámbar"],
        },
    },
    {
        "nombre":    "Santal Royal",
        "descripcion": "Un sándalo suave y cremoso con destellos de vainilla y madera. Elegancia sin esfuerzo.",
        "genero":    GeneroEnum.UNISEX,
        "es_nuevo":  True,
        "destacado": True,
        "es_arabe":  False,
        "brand":     "Tom Ford",
        "category":  "Nicho",
        "presentaciones": [
            {"tamano_ml": 50,  "precio": Decimal("130.00"), "stock": 10},
            {"tamano_ml": 100, "precio": Decimal("165.00"), "stock": 7},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Bergamota", "Cardamomo"],
            TipoNotaEnum.CORAZON:  ["Sándalo", "Iris"],
            TipoNotaEnum.FONDO:    ["Vainilla", "Cachemira", "Ámbar"],
        },
    },
    {
        "nombre":    "Oud & Vanille",
        "descripcion": "La fusión del oud árabe con la dulzura de la vainilla. Una experiencia olfativa única y adictiva.",
        "genero":    GeneroEnum.UNISEX,
        "es_nuevo":  False,
        "destacado": False,
        "es_arabe":  True,
        "brand":     "Lattafa",
        "category":  "Perfume Árabe",
        "presentaciones": [
            {"tamano_ml": 30,  "precio": Decimal("45.00"),  "stock": 25},
            {"tamano_ml": 100, "precio": Decimal("127.50"), "stock": 14},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Azafrán", "Bergamota"],
            TipoNotaEnum.CORAZON:  ["Oud", "Rosa árabe"],
            TipoNotaEnum.FONDO:    ["Vainilla", "Madera de ébano", "Almizcle"],
        },
    },
    {
        "nombre":    "Fleur de Nuit",
        "descripcion": "Una mujer segura y cautivadora. Notas de bergamota, jazmín sambac y ámbar profundo. Para la noche.",
        "genero":    GeneroEnum.MUJER,
        "es_nuevo":  True,
        "destacado": False,
        "es_arabe":  False,
        "brand":     "Maison Margiela",
        "category":  "Nicho",
        "presentaciones": [
            {"tamano_ml": 50,  "precio": Decimal("117.00"), "stock": 9},
            {"tamano_ml": 100, "precio": Decimal("165.00"), "stock": 5},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Pimienta rosa", "Bergamota"],
            TipoNotaEnum.CORAZON:  ["Jazmín sambac", "Magnolia"],
            TipoNotaEnum.FONDO:    ["Ámbar", "Pachulí", "Benjuí"],
        },
    },
    {
        "nombre":    "Ambre Doré",
        "descripcion": "Ámbar dorado envuelto en especias y madera. Una fragancia cálida que perdura largo tiempo en la piel.",
        "genero":    GeneroEnum.HOMBRE,
        "es_nuevo":  False,
        "destacado": False,
        "es_arabe":  True,
        "brand":     "Amouage",
        "category":  "Perfume Árabe",
        "presentaciones": [
            {"tamano_ml": 30,  "precio": Decimal("55.00"),  "stock": 20},
            {"tamano_ml": 100, "precio": Decimal("161.00"), "stock": 11},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Mandarina", "Nuez moscada"],
            TipoNotaEnum.CORAZON:  ["Ámbar gris", "Sándalo"],
            TipoNotaEnum.FONDO:    ["Madera de Oud", "Vainilla", "Incienso"],
        },
    },
    {
        "nombre":    "Rasasi Hawas",
        "descripcion": "Fresco, acuático y magnético. El perfume árabe más popular por su longevidad y magnetismo.",
        "genero":    GeneroEnum.HOMBRE,
        "es_nuevo":  False,
        "destacado": True,
        "es_arabe":  True,
        "brand":     "Rasasi",
        "category":  "Perfume Árabe",
        "presentaciones": [
            {"tamano_ml": 100, "precio": Decimal("75.00"), "stock": 30},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Menta", "Bergamota", "Lavanda"],
            TipoNotaEnum.CORAZON:  ["Coco", "Jazmín"],
            TipoNotaEnum.FONDO:    ["Ámbar", "Almizcle", "Madera"],
        },
    },
    {
        "nombre":    "La Vie est Belle",
        "descripcion": "La fragancia del optimismo. Una gourmand floral que celebra la feminidad y la alegría de vivir.",
        "genero":    GeneroEnum.MUJER,
        "es_nuevo":  False,
        "destacado": False,
        "es_arabe":  False,
        "brand":     "Lancôme",
        "category":  "Eau de Parfum",
        "presentaciones": [
            {"tamano_ml": 30, "precio": Decimal("58.00"),  "stock": 22},
            {"tamano_ml": 50, "precio": Decimal("85.00"),  "stock": 15},
            {"tamano_ml": 75, "precio": Decimal("115.00"), "stock": 8},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Grosella negra", "Pera"],
            TipoNotaEnum.CORAZON:  ["Iris", "Jazmín", "Lirio del valle"],
            TipoNotaEnum.FONDO:    ["Praline", "Vainilla", "Pachulí", "Sándalo"],
        },
    },
    {
        "nombre":    "Bois Sauvage",
        "descripcion": "Madera salvaje y fresca. Vetiver, cedro y musgo crean una fragancia forestal y libre.",
        "genero":    GeneroEnum.HOMBRE,
        "es_nuevo":  True,
        "destacado": False,
        "es_arabe":  False,
        "brand":     "Tom Ford",
        "category":  "Nicho",
        "presentaciones": [
            {"tamano_ml": 50,  "precio": Decimal("140.00"), "stock": 8},
        ],
        "notas": {
            TipoNotaEnum.SALIDA:   ["Pomelo", "Bayas de enebro"],
            TipoNotaEnum.CORAZON:  ["Cedro", "Helicriso"],
            TipoNotaEnum.FONDO:    ["Vetiver", "Musgo de roble", "Pachulí"],
        },
    },
]


# ── Main ───────────────────────────────────────────────────────────────────

async def seed():
    async with async_session_maker() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT COUNT(*) FROM perfume"))
        count = result.scalar()
        if count and count > 0:
            print(f"✓ Already seeded ({count} perfumes found). Skipping.")
            return

        print("🌱 Seeding test data...")

        # ── Delivery Zones ──
        zone_exists = await session.execute(text("SELECT COUNT(*) FROM zona_envio"))
        if not zone_exists.scalar():
            for zone_name, cost in DELIVERY_ZONES:
                zone = ZonaEnvio(
                    id=uuid.uuid4(),
                    nombre=zone_name,
                    costo=cost,
                    activa=True,
                )
                session.add(zone)
            await session.flush()
            print(f"  ✓ {len(DELIVERY_ZONES)} delivery zones")

        # ── Brands ──
        brand_map: dict[str, Marca] = {}
        for name in BRANDS:
            brand = Marca(id=uuid.uuid4(), nombre=name, slug=slugify(name))
            session.add(brand)
            brand_map[name] = brand
        await session.flush()
        print(f"  ✓ {len(BRANDS)} brands")

        # ── Categories ──
        cat_map: dict[str, Categoria] = {}
        for name, desc in CATEGORIES:
            cat = Categoria(id=uuid.uuid4(), nombre=name, slug=slugify(name), descripcion=desc)
            session.add(cat)
            cat_map[name] = cat
        await session.flush()
        print(f"  ✓ {len(CATEGORIES)} categories")

        # ── Olfactive Notes catalog ──
        nota_map: dict[str, NotaOlfativa] = {}
        for nombre, familia in NOTE_CATALOG:
            nota = NotaOlfativa(id=uuid.uuid4(), nombre=nombre, familia=familia)
            session.add(nota)
            nota_map[nombre] = nota
        await session.flush()
        print(f"  ✓ {len(NOTE_CATALOG)} olfactive notes")

        # ── Products ──
        for p_data in PRODUCTS:
            perfume = Perfume(
                id=uuid.uuid4(),
                nombre=p_data["nombre"],
                slug=slugify(p_data["nombre"]),
                descripcion=p_data["descripcion"],
                genero=p_data["genero"],
                es_nuevo=p_data["es_nuevo"],
                destacado=p_data["destacado"],
                es_arabe=p_data["es_arabe"],
                activo=True,
                marca_id=brand_map[p_data["brand"]].id,
                categoria_id=cat_map[p_data["category"]].id,
            )
            session.add(perfume)
            await session.flush()

            # Presentaciones
            for pres_data in p_data["presentaciones"]:
                pres = Presentacion(
                    id=uuid.uuid4(),
                    perfume_id=perfume.id,
                    tamano_ml=pres_data["tamano_ml"],
                    precio=pres_data["precio"],
                    stock=pres_data["stock"],
                )
                session.add(pres)

            # Notas via PerfumeNota pivot
            for tipo, nombres in p_data["notas"].items():
                for nombre in nombres:
                    if nombre in nota_map:
                        pnota = PerfumeNota(
                            perfume_id=perfume.id,
                            nota_id=nota_map[nombre].id,
                            tipo=tipo,
                        )
                        session.add(pnota)

            await session.flush()

        await session.commit()
        print(f"  ✓ {len(PRODUCTS)} perfumes with presentations and notes")
        print("\n✅ Seed complete! Test data loaded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
