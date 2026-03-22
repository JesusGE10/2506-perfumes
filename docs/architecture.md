# Arquitectura del Sistema — Plataforma E-commerce de Perfumería Fina

> Documento generado por el **Software Architect** a partir del [Análisis del Producto](file:///c:/Users/jesus/Desktop/Desarrollo%20Antigravity/perfumes_2506/docs/product_analysis.md).
> Define la arquitectura técnica completa que guiará la fase de desarrollo.

---

## 1. Arquitectura de Alto Nivel

### 1.1 Diagrama General

```mermaid
graph TB
    subgraph "Cliente (Browser)"
        FE["Next.js Frontend<br/>App Router · SSR · Mobile-first"]
    end

    subgraph "EasyPanel — Servicios"
        BE["FastAPI Backend<br/>REST API · Python 3.12"]
        DB["PostgreSQL 16<br/>Base de datos"]
        N8N["n8n<br/>Automation Engine"]
        MINIO["MinIO / S3-Compatible<br/>Object Storage"]
    end

    subgraph "Servicios Externos"
        WA["WhatsApp Business API"]
        TG["Telegram Bot API"]
        GS["Google Sheets API"]
        AI["OpenAI / LLM API"]
    end

    FE -->|"HTTPS / REST"| BE
    BE -->|"SQL (SQLAlchemy)"| DB
    BE -->|"Upload/Download"| MINIO
    BE -->|"HTTP Webhooks"| N8N
    N8N -->|"REST callbacks"| BE
    N8N --> WA
    N8N --> TG
    N8N --> GS
    BE -->|"LLM prompts"| AI
```

### 1.2 Principios Arquitectónicos

| Principio | Aplicación |
|---|---|
| **Monolito modular** | Un solo backend FastAPI organizado en módulos aislados por funcionalidad |
| **API-first** | El frontend consume exclusivamente la API REST; toda la lógica vive en el backend |
| **Separación negocio / automatización** | La lógica de negocio core vive en FastAPI; las automatizaciones operativas se delegan a n8n vía webhooks |
| **Mobile-first** | El frontend se diseña desde el viewport móvil hacia arriba |
| **Feature isolation** | Cada módulo (products, orders, promotions…) encapsula sus modelos, rutas, servicios y schemas |

### 1.3 Flujo de Datos Principal

```mermaid
sequenceDiagram
    participant C as Cliente
    participant FE as Next.js
    participant BE as FastAPI
    participant DB as PostgreSQL
    participant S3 as MinIO
    participant N8N as n8n
    participant WA as WhatsApp
    participant TG as Telegram

    C->>FE: Navega catálogo
    FE->>BE: GET /api/v1/products
    BE->>DB: SELECT perfumes
    BE->>S3: Resolve image URLs
    BE-->>FE: JSON (productos + URLs)
    FE-->>C: Renderiza catálogo

    C->>FE: Finaliza pedido
    FE->>BE: POST /api/v1/orders
    BE->>DB: INSERT pedido
    BE->>DB: UPDATE stock
    BE->>N8N: POST webhook (order_completed)
    BE-->>FE: 201 Created (order_id)

    N8N->>N8N: Genera factura PDF
    N8N->>WA: Envía factura al cliente
    N8N->>TG: Notifica al admin
    N8N->>BE: PATCH /api/v1/orders/{id}/status
```

---

## 2. Estructura del Frontend

### 2.1 Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **Next.js** | 15.x | Framework React con App Router, SSR, SSG |
| **React** | 19.x | Librería UI |
| **TypeScript** | 5.x | Tipado estático |
| **CSS Modules** | — | Estilos con scope por componente |
| **Zustand** | 5.x | Estado global ligero (carrito) |
| **React Hook Form** | 7.x | Formularios de checkout |
| **Zod** | 3.x | Validación de schemas |

### 2.2 Estructura de Carpetas

```
frontend/
├── public/
│   └── fonts/
├── src/
│   ├── app/                          # App Router (páginas)
│   │   ├── layout.tsx                # Layout raíz
│   │   ├── page.tsx                  # Home
│   │   ├── productos/
│   │   │   ├── page.tsx              # Listado con filtros
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Detalle de producto
│   │   ├── checkout/
│   │   │   └── page.tsx              # Checkout
│   │   ├── admin/
│   │   │   ├── layout.tsx            # Layout admin (auth guard)
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── productos/
│   │   │   │   ├── page.tsx          # CRUD productos
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Editar producto
│   │   │   ├── pedidos/
│   │   │   │   └── page.tsx          # Listado de pedidos
│   │   │   ├── marcas/
│   │   │   │   └── page.tsx          # CRUD marcas
│   │   │   ├── categorias/
│   │   │   │   └── page.tsx          # CRUD categorías
│   │   │   ├── ofertas/
│   │   │   │   └── page.tsx          # CRUD ofertas
│   │   │   ├── metricas/
│   │   │   │   └── page.tsx          # Métricas ingresos + productos
│   │   │   └── login/
│   │   │       └── page.tsx          # Login admin
│   │   └── api/                      # Route handlers (si se necesitan)
│   ├── components/
│   │   ├── ui/                       # Componentes base reutilizables
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   ├── Dropdown/
│   │   │   └── Skeleton/
│   │   ├── layout/                   # Componentes de estructura
│   │   │   ├── Navbar/
│   │   │   ├── Footer/
│   │   │   └── Sidebar/
│   │   ├── product/                  # Componentes del dominio de productos
│   │   │   ├── ProductCard/
│   │   │   ├── ProductGrid/
│   │   │   ├── ProductModal/
│   │   │   ├── ProductFilters/
│   │   │   ├── SearchBar/
│   │   │   └── NotesBadges/
│   │   ├── cart/                     # Componentes del carrito
│   │   │   ├── CartSidebar/
│   │   │   ├── CartItem/
│   │   │   └── CartSummary/
│   │   ├── checkout/                 # Componentes del checkout
│   │   │   ├── CheckoutForm/
│   │   │   ├── DeliveryZoneSelect/
│   │   │   └── OrderSummary/
│   │   └── admin/                    # Componentes del panel admin
│   │       ├── AdminTable/
│   │       ├── ProductForm/
│   │       ├── MetricsChart/
│   │       └── OrderDetail/
│   ├── hooks/                        # Custom hooks
│   │   ├── useProducts.ts
│   │   ├── useCart.ts
│   │   ├── useSearch.ts
│   │   └── useAuth.ts
│   ├── lib/                          # Utilidades y configuración
│   │   ├── api.ts                    # Cliente HTTP (fetch wrapper)
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── stores/                       # Zustand stores
│   │   └── cartStore.ts
│   ├── types/                        # Tipos TypeScript
│   │   ├── product.ts
│   │   ├── order.ts
│   │   └── api.ts
│   └── styles/                       # Estilos globales
│       ├── globals.css
│       ├── variables.css             # Design tokens (colores, tipografía)
│       └── reset.css
├── next.config.ts
├── tsconfig.json
├── package.json
└── Dockerfile
```

### 2.3 Páginas Principales

| Ruta | Página | Descripción |
|---|---|---|
| `/` | Home | Hero banner, perfumes destacados, categorías rápidas |
| `/productos` | Catálogo | Grid con filtros laterales (familia, género, marca), ordenamiento |
| `/productos/[slug]` | Detalle | Galería, notas olfativas, selector de presentación, "Añadir al carrito" |
| `/checkout` | Checkout | Resumen de carrito + formulario de envío + botón "Finalizar pedido" |
| `/admin/login` | Login Admin | Formulario email/password |
| `/admin` | Dashboard | Métricas de ingresos y productos |
| `/admin/productos` | CRUD Productos | Tabla con ABM completo |
| `/admin/pedidos` | Pedidos | Listado con estados y detalle |
| `/admin/marcas` | CRUD Marcas | ABM de marcas |
| `/admin/categorias` | CRUD Categorías | ABM de categorías |
| `/admin/ofertas` | CRUD Ofertas | ABM de promociones |
| `/admin/metricas` | Métricas | Dashboard con gráficos y exportación |

---

## 3. Estructura del Backend

### 3.1 Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **Python** | 3.12 | Lenguaje principal |
| **FastAPI** | 0.115.x | Framework web |
| **SQLAlchemy** | 2.x | ORM (modelo async) |
| **Alembic** | 1.x | Migraciones de BD |
| **Pydantic** | 2.x | Validación y schemas |
| **python-jose** | — | JWT para autenticación admin |
| **Passlib + bcrypt** | — | Hashing de contraseñas |
| **boto3** | — | Cliente S3 para MinIO |
| **httpx** | — | Cliente HTTP async (webhooks a n8n, calls a LLM) |
| **Pillow** | — | Procesamiento y optimización de imágenes |
| **pytest** | — | Testing |
| **uvicorn** | — | Servidor ASGI |

### 3.2 Estructura de Carpetas

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app factory
│   ├── config.py                     # Settings (Pydantic BaseSettings)
│   ├── database.py                   # Engine, SessionLocal, Base
│   ├── dependencies.py               # Dependencias comunes (get_db, get_current_admin)
│   │
│   ├── modules/                      # Módulos de funcionalidad aislados
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # POST /login, GET /me
│   │   │   ├── service.py            # Lógica de autenticación
│   │   │   ├── schemas.py            # LoginRequest, TokenResponse
│   │   │   └── models.py             # AdminUser
│   │   │
│   │   ├── products/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # CRUD endpoints
│   │   │   ├── service.py            # Lógica de negocio
│   │   │   ├── schemas.py            # ProductCreate, ProductResponse, etc.
│   │   │   └── models.py             # Perfume, Presentacion, Imagen
│   │   │
│   │   ├── categories/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py             # Categoria
│   │   │
│   │   ├── brands/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py             # Marca
│   │   │
│   │   ├── orders/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # POST /orders, GET /orders, PATCH /orders/{id}/status
│   │   │   ├── service.py            # Cálculo de totales, delivery, creación
│   │   │   ├── schemas.py
│   │   │   └── models.py             # Pedido, PedidoItem, ZonaEnvio
│   │   │
│   │   ├── promotions/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py             # Promocion, PromocionProducto
│   │   │
│   │   ├── search/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # GET /search?q=
│   │   │   └── service.py            # Full-text search con PostgreSQL
│   │   │
│   │   ├── media/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # POST /media/upload, DELETE /media/{id}
│   │   │   └── service.py            # Upload a MinIO, optimización de imagen
│   │   │
│   │   ├── metrics/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # GET /metrics/income, GET /metrics/products
│   │   │   └── service.py            # Agregaciones SQL para dashboards
│   │   │
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # POST /ai/suggestions
│   │   │   └── service.py            # Prompt a LLM con datos de inventario/ventas
│   │   │
│   │   └── webhooks/
│   │       ├── __init__.py
│   │       ├── router.py             # Endpoints de callback desde n8n
│   │       └── service.py            # Disparar eventos hacia n8n
│   │
│   └── core/                         # Utilidades transversales
│       ├── __init__.py
│       ├── security.py               # JWT, hashing
│       ├── exceptions.py             # Excepciones personalizadas
│       ├── pagination.py             # Paginación genérica
│       └── events.py                 # Dispatcher de eventos hacia n8n
│
├── alembic/                          # Migraciones de BD
│   ├── versions/
│   └── env.py
├── tests/
│   ├── conftest.py
│   ├── test_products.py
│   ├── test_orders.py
│   └── ...
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── .env.example
```

### 3.3 Patrón de Módulo

Cada módulo dentro de `app/modules/` sigue el mismo patrón:

```mermaid
graph LR
    R["router.py<br/>(rutas HTTP)"] --> S["service.py<br/>(lógica de negocio)"]
    S --> M["models.py<br/>(modelos SQLAlchemy)"]
    R --> SC["schemas.py<br/>(Pydantic schemas)"]
    SC --> S
```

- **`router.py`** — Define los endpoints HTTP. No contiene lógica de negocio.
- **`service.py`** — Contiene toda la lógica de negocio. Recibe la sesión de BD como dependencia.
- **`models.py`** — Modelos SQLAlchemy (tablas de BD).
- **`schemas.py`** — Schemas Pydantic para validación de entrada/salida.

---

## 4. Visión General del Esquema de Base de Datos

### 4.1 Diagrama Entidad-Relación

```mermaid
erDiagram
    MARCA ||--o{ PERFUME : "tiene"
    CATEGORIA ||--o{ PERFUME : "clasifica"
    PERFUME ||--o{ PRESENTACION : "tiene"
    PERFUME ||--o{ IMAGEN : "tiene"
    PERFUME }o--o{ NOTA_OLFATIVA : "tiene (salida/corazón/fondo)"
    PEDIDO ||--|{ PEDIDO_ITEM : "contiene"
    PRESENTACION ||--o{ PEDIDO_ITEM : "referencia"
    ZONA_ENVIO ||--o{ PEDIDO : "aplica a"
    PROMOCION }o--o{ PERFUME : "aplica a"
    PROMOCION }o--o{ PRESENTACION : "aplica a"

    MARCA {
        uuid id PK
        string nombre UK
        string pais_origen
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIA {
        uuid id PK
        string nombre UK
        string descripcion
        string slug UK
        timestamp created_at
    }

    PERFUME {
        uuid id PK
        string nombre
        string slug UK
        uuid marca_id FK
        uuid categoria_id FK
        string genero "hombre/mujer/unisex"
        text descripcion
        boolean activo
        boolean destacado
        boolean es_arabe
        boolean es_nuevo
        timestamp created_at
        timestamp updated_at
    }

    NOTA_OLFATIVA {
        uuid id PK
        string nombre UK
        string familia "citrico/amaderado/floral/oriental/dulce"
    }

    PERFUME_NOTA {
        uuid perfume_id FK
        uuid nota_id FK
        string tipo "salida/corazon/fondo"
    }

    PRESENTACION {
        uuid id PK
        uuid perfume_id FK
        integer tamano_ml
        decimal precio
        integer stock
        timestamp updated_at
    }

    IMAGEN {
        uuid id PK
        uuid perfume_id FK
        string url
        integer orden
        boolean es_principal
    }

    PEDIDO {
        uuid id PK
        string cliente_nombre
        string cliente_telefono
        string direccion
        uuid zona_envio_id FK
        decimal costo_envio
        decimal subtotal
        decimal descuento_total
        decimal total
        string estado "pendiente/confirmado/enviado/entregado/cancelado"
        string metodo_pago
        timestamp created_at
        timestamp updated_at
    }

    PEDIDO_ITEM {
        uuid id PK
        uuid pedido_id FK
        uuid presentacion_id FK
        integer cantidad
        decimal precio_unitario
        decimal descuento
    }

    ZONA_ENVIO {
        uuid id PK
        string nombre UK
        decimal costo
        boolean activa
    }

    PROMOCION {
        uuid id PK
        string nombre
        string tipo "individual/global/paquete"
        decimal descuento_porcentaje
        decimal descuento_fijo
        date fecha_inicio
        date fecha_fin
        boolean activa
        timestamp created_at
    }

    ADMIN_USER {
        uuid id PK
        string email UK
        string password_hash
        string nombre
        timestamp created_at
        timestamp last_login
    }

    CHECKOUT_INICIADO {
        uuid id PK
        jsonb carrito_data
        string cliente_telefono
        boolean finalizado
        timestamp created_at
        timestamp updated_at
    }
```

### 4.2 Notas sobre el Esquema

- **UUIDs** como claves primarias para evitar IDs secuenciales predecibles.
- **`slug`** en `perfume` y `categoria` para URLs amigables al SEO.
- **`PERFUME_NOTA`** tabla pivote con campo `tipo` (salida/corazón/fondo) para asociar notas olfativas a cada capa del perfume.
- **`CHECKOUT_INICIADO`** registra carritos que iniciaron checkout pero no finalizaron, para el workflow de carrito abandonado (W5).
- **`PROMOCION`** soporta 3 tipos: individual (un perfume), global (todos), paquete (conjunto de productos).
- **`ZONA_ENVIO`** tabla configurable con nombre y costo para el cálculo de delivery.
- **Soft delete** no se implementa en MVP; se usa el campo `activo` en `PERFUME` y `activa` en `ZONA_ENVIO` y `PROMOCION` para deshabilitar registros.

### 4.3 Índices Recomendados

| Tabla | Índice | Tipo | Propósito |
|---|---|---|---|
| `perfume` | `nombre, descripcion` | GIN (tsvector) | Full-text search |
| `perfume` | `marca_id` | B-tree | Filtro por marca |
| `perfume` | `categoria_id` | B-tree | Filtro por categoría |
| `perfume` | `genero` | B-tree | Filtro por género |
| `perfume` | `es_arabe` | B-tree | Filtro "Árabes" |
| `perfume` | `es_nuevo` | B-tree | Filtro "Lo más nuevo" |
| `presentacion` | `perfume_id` | B-tree | FK lookup |
| `pedido` | `estado` | B-tree | Filtro de pedidos por estado |
| `pedido` | `created_at` | B-tree | Métricas por fecha |

---

## 5. Estructura de la API

### 5.1 Convenciones

| Aspecto | Convención |
|---|---|
| **Base URL** | `/api/v1` |
| **Formato** | JSON |
| **Autenticación** | Bearer JWT (solo endpoints admin) |
| **Paginación** | Query params `?page=1&size=20` → respuesta con `{ items, total, page, size, pages }` |
| **Errores** | `{ detail: string, code: string }` con HTTP status codes estándar |
| **Versionado** | Prefijo `/v1` en la URL |

### 5.2 Endpoints por Módulo

#### Públicos (sin autenticación)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/products` | Listar perfumes con filtros y paginación |
| `GET` | `/api/v1/products/{slug}` | Detalle de un perfume |
| `GET` | `/api/v1/products/featured` | Perfumes destacados (home) |
| `GET` | `/api/v1/products/newest` | Perfumes más nuevos |
| `GET` | `/api/v1/products/top` | Top 20 de la semana (por ventas) |
| `GET` | `/api/v1/categories` | Listar categorías |
| `GET` | `/api/v1/brands` | Listar marcas |
| `GET` | `/api/v1/search?q={query}` | Búsqueda predictiva |
| `GET` | `/api/v1/delivery-zones` | Zonas de envío con costos |
| `POST` | `/api/v1/orders` | Crear pedido (checkout) |
| `GET` | `/api/v1/promotions/active` | Promociones activas |

#### Admin (requieren JWT)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Login administrador |
| `GET` | `/api/v1/auth/me` | Perfil del admin autenticado |
| — | — | — |
| `POST` | `/api/v1/admin/products` | Crear perfume |
| `PUT` | `/api/v1/admin/products/{id}` | Actualizar perfume |
| `DELETE` | `/api/v1/admin/products/{id}` | Eliminar perfume |
| — | — | — |
| `POST` | `/api/v1/admin/brands` | Crear marca |
| `PUT` | `/api/v1/admin/brands/{id}` | Actualizar marca |
| `DELETE` | `/api/v1/admin/brands/{id}` | Eliminar marca |
| — | — | — |
| `POST` | `/api/v1/admin/categories` | Crear categoría |
| `PUT` | `/api/v1/admin/categories/{id}` | Actualizar categoría |
| `DELETE` | `/api/v1/admin/categories/{id}` | Eliminar categoría |
| — | — | — |
| `GET` | `/api/v1/admin/orders` | Listar pedidos |
| `GET` | `/api/v1/admin/orders/{id}` | Detalle de pedido |
| `PATCH` | `/api/v1/admin/orders/{id}/status` | Cambiar estado de pedido |
| — | — | — |
| `POST` | `/api/v1/admin/promotions` | Crear promoción |
| `PUT` | `/api/v1/admin/promotions/{id}` | Actualizar promoción |
| `DELETE` | `/api/v1/admin/promotions/{id}` | Eliminar promoción |
| — | — | — |
| `POST` | `/api/v1/admin/media/upload` | Subir imagen |
| `DELETE` | `/api/v1/admin/media/{id}` | Eliminar imagen |
| — | — | — |
| `GET` | `/api/v1/admin/metrics/income` | Métricas de ingresos |
| `GET` | `/api/v1/admin/metrics/products` | Métricas de productos (rotación, stock bajo) |
| `GET` | `/api/v1/admin/metrics/export` | Exportar métricas a Google Sheets |
| — | — | — |
| `POST` | `/api/v1/admin/ai/suggestions` | Sugerencias de ofertas con IA |
| — | — | — |
| `POST` | `/api/v1/admin/delivery-zones` | Crear zona de envío |
| `PUT` | `/api/v1/admin/delivery-zones/{id}` | Actualizar zona |
| `DELETE` | `/api/v1/admin/delivery-zones/{id}` | Eliminar zona |

#### Webhooks (internos entre backend ↔ n8n)

| Método | Endpoint | Dirección | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/webhooks/n8n/order-status` | n8n → Backend | n8n actualiza el estado de un pedido |
| `POST` | `/api/v1/webhooks/n8n/stock-update` | n8n → Backend | n8n actualiza stock (desde Google Sheets) |

### 5.3 Filtros del Catálogo

`GET /api/v1/products` soporta los siguientes query params:

| Param | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `category` | string | `oriental` | Filtrar por slug de categoría |
| `brand` | string | `dior` | Filtrar por slug de marca |
| `gender` | enum | `hombre` | Filtrar por género |
| `family` | string | `amaderado` | Filtrar por familia olfativa |
| `is_arab` | bool | `true` | Solo perfumes árabes |
| `min_price` | decimal | `20.00` | Precio mínimo |
| `max_price` | decimal | `150.00` | Precio máximo |
| `sort_by` | enum | `price_asc`, `newest`, `name` | Ordenamiento |
| `q` | string | `sauvage` | Búsqueda por texto |
| `page` | int | `1` | Página actual |
| `size` | int | `20` | Items por página |

---

## 6. Módulos de Funcionalidades (Feature Modules)

### 6.1 Mapa de Dependencias

```mermaid
graph TD
    AUTH["auth"]
    PROD["products"]
    CAT["categories"]
    BRAND["brands"]
    ORD["orders"]
    PROMO["promotions"]
    SEARCH["search"]
    MEDIA["media"]
    METRICS["metrics"]
    AI_MOD["ai"]
    WH["webhooks"]
    CORE["core (security, events, pagination)"]

    PROD --> CAT
    PROD --> BRAND
    PROD --> MEDIA
    ORD --> PROD
    ORD --> PROMO
    ORD --> WH
    SEARCH --> PROD
    METRICS --> ORD
    METRICS --> PROD
    AI_MOD --> PROD
    AI_MOD --> METRICS
    WH --> CORE

    AUTH --> CORE
    PROD --> CORE
    ORD --> CORE
```

### 6.2 Detalle por Módulo

| Módulo | Responsabilidad | Dependencias |
|---|---|---|
| **auth** | Login admin, generación/validación JWT, hash passwords | core.security |
| **products** | CRUD perfumes, presentaciones, notas olfativas, asociación con imágenes | categories, brands, media, core |
| **categories** | CRUD categorías con slug generation | core |
| **brands** | CRUD marcas | core |
| **orders** | Crear pedido, calcular subtotales, aplicar descuentos, calcular envío, disparar evento `order_completed` | products, promotions, webhooks, core |
| **promotions** | CRUD promociones (individual/global/paquete), cálculo de descuentos aplicables | core |
| **search** | Full-text search en PostgreSQL usando `tsvector` sobre nombre, marca, descripción | products |
| **media** | Upload de imágenes a MinIO, redimensionado con Pillow, generación de URLs presignadas | core |
| **metrics** | Consultas SQL agregadas: ingresos por período, top productos, rotación, alertas de stock bajo | orders, products |
| **ai** | Envía datos de inventario/ventas a un LLM; retorna sugerencias de productos para promocionar | products, metrics |
| **webhooks** | Dispatcher de eventos HTTP hacia n8n; endpoints de callback para que n8n actualice el sistema | core.events |

---

## 7. Arquitectura de Automatización (n8n)

### 7.1 Principio de Separación

```
┌──────────────────────┐       ┌──────────────────────┐
│     FastAPI Backend   │       │        n8n           │
│                       │       │                      │
│  • Lógica de negocio  │──────▶│  • Automatizaciones   │
│  • Validaciones       │ HTTP  │  • Notificaciones     │
│  • CRUD               │Webhoo │  • Integraciones      │
│  • Cálculos           │  ks   │  • PDF generation     │
│  • Auth               │       │  • Messaging          │
└──────────────────────┘       └──────────────────────┘
```

> El backend **nunca** envía mensajes de WhatsApp, Telegram o emails directamente. Solo dispara webhooks con los datos necesarios. n8n gestiona toda la comunicación externa.

### 7.2 Workflows Detallados

#### W1 — Generación de Factura PDF

```mermaid
graph LR
    A["Webhook Trigger<br/>(order_completed)"] --> B["Formatear datos<br/>del pedido"]
    B --> C["Generar PDF<br/>(HTML to PDF node)"]
    C --> D["Guardar PDF<br/>en MinIO"]
    D --> E["Trigger W2<br/>(factura lista)"]
```

**Datos de entrada (payload del webhook):**
```json
{
  "order_id": "uuid",
  "cliente_nombre": "string",
  "cliente_telefono": "string",
  "direccion": "string",
  "zona_envio": "string",
  "costo_envio": 5.00,
  "items": [
    {
      "perfume": "Sauvage",
      "marca": "Dior",
      "tamano_ml": 100,
      "cantidad": 1,
      "precio_unitario": 85.00,
      "descuento": 0
    }
  ],
  "subtotal": 85.00,
  "descuento_total": 0,
  "total": 90.00,
  "metodo_pago": "transferencia",
  "fecha": "2026-03-16T20:00:00Z"
}
```

#### W2 — Confirmación por WhatsApp

```mermaid
graph LR
    A["Trigger: Factura generada"] --> B["Construir mensaje<br/>con template"]
    B --> C["Adjuntar PDF"]
    C --> D["Enviar vía<br/>WhatsApp Business API"]
```

#### W3 — Notificación Nueva Venta

```mermaid
graph LR
    A["Webhook Trigger<br/>(order_completed)"] --> B["Formatear resumen"]
    B --> C["Enviar a Telegram<br/>(Bot API)"]
```

#### W4 — Sincronización de Inventario (Google Sheets → DB)

```mermaid
graph LR
    A["Google Sheets Trigger<br/>(row updated)"] --> B["Leer datos<br/>(perfume_id, stock)"]
    B --> C["PATCH /api/v1/webhooks/n8n/stock-update"]
    C --> D{"Stock < 10?"}
    D -->|Sí| E["Trigger W7"]
    D -->|No| F["Fin"]
```

#### W5 — Carrito Abandonado

```mermaid
graph LR
    A["Schedule Trigger<br/>(cada 30 min)"] --> B["Query: checkouts<br/>sin finalizar > 2h"]
    B --> C{"¿Hay resultados?"}
    C -->|Sí| D["Enviar alerta<br/>al admin (Telegram)"]
    C -->|No| E["Fin"]
```

#### W6 — Reposición de Stock

```mermaid
graph LR
    A["Webhook Trigger<br/>(stock_replenished)"] --> B["Buscar usuarios<br/>interesados"]
    B --> C["Enviar notificación<br/>(WhatsApp/Telegram)"]
```

#### W7 — Notificación de Stock Bajo

```mermaid
graph LR
    A["Webhook Trigger<br/>(low_stock)"] --> B["Formatear alerta<br/>(producto, stock actual)"]
    B --> C["Enviar a Telegram<br/>(admin)"]
```

### 7.3 Eventos del Backend → n8n

| Evento | Trigger en Backend | Payload |
|---|---|---|
| `order_completed` | Al crear un pedido exitosamente | Datos completos del pedido |
| `stock_updated` | Al actualizar stock de una presentación | perfume_id, presentacion_id, nuevo stock |
| `low_stock` | Cuando stock < 10 tras una venta o actualización | perfume, presentación, stock actual |
| `stock_replenished` | Cuando stock pasa de 0 a > 0 | perfume, presentación, stock nuevo |
| `checkout_started` | Al registrar un checkout iniciado | carrito_data, teléfono, timestamp |

---

## 8. Arquitectura de Almacenamiento de Archivos

### 8.1 Estrategia

| Tipo de archivo | Almacenamiento | Acceso |
|---|---|---|
| Imágenes de productos | MinIO (S3-compatible) | URLs presignadas o bucket público con CDN |
| Facturas PDF generadas | MinIO (bucket privado) | URL presignada temporal (enviada por n8n via WhatsApp) |
| Logo y assets estáticos | Frontend `/public` o MinIO | Servidos como assets estáticos |

### 8.2 Estructura de Buckets (MinIO)

```
perfumeria-media/
├── products/
│   ├── {perfume_id}/
│   │   ├── main.webp           # Imagen principal
│   │   ├── gallery-1.webp      # Galería
│   │   ├── gallery-2.webp
│   │   └── ...
├── invoices/
│   ├── {year}/{month}/
│   │   ├── {order_id}.pdf
│   │   └── ...
└── brands/
    ├── {brand_id}/
    │   └── logo.webp
```

### 8.3 Pipeline de Procesamiento de Imágenes

```mermaid
graph LR
    A["Admin sube imagen<br/>(JPEG/PNG)"] --> B["Backend recibe<br/>multipart/form-data"]
    B --> C["Pillow: redimensionar<br/>+ convertir a WebP"]
    C --> D["Generar thumbnail<br/>(300x300)"]
    D --> E["Upload a MinIO<br/>(original + thumb)"]
    E --> F["Guardar URL<br/>en tabla imagen"]
```

- **Formato target**: WebP (soporte de compresión superior, menor tamaño).
- **Resoluciones**: Original optimizado (max 1200px ancho) + thumbnail (300x300).
- **Lazy loading**: El frontend carga thumbnails en el grid y pide la imagen completa solo en el detalle.

---

## 9. Arquitectura de Despliegue

### 9.1 Diagrama de Despliegue (EasyPanel)

```mermaid
graph TB
    subgraph "EasyPanel (VPS)"
        subgraph "Servicios de Aplicación"
            FE_SVC["frontend<br/>Next.js<br/>Puerto: 3000"]
            BE_SVC["backend<br/>FastAPI + Uvicorn<br/>Puerto: 8000"]
        end
        subgraph "Datos"
            DB_SVC["postgres<br/>PostgreSQL 16<br/>Puerto: 5432"]
            S3_SVC["minio<br/>Object Storage<br/>Puerto: 9000/9001"]
        end
        subgraph "Automatización"
            N8N_SVC["n8n<br/>Workflow Engine<br/>Puerto: 5678"]
        end
        PROXY["Traefik / EasyPanel Proxy<br/>HTTPS · SSL auto"]
    end

    INTERNET["Internet"] -->|"HTTPS"| PROXY
    PROXY -->|"/"| FE_SVC
    PROXY -->|"/api"| BE_SVC
    PROXY -->|"/n8n"| N8N_SVC
    PROXY -->|"/storage"| S3_SVC
    BE_SVC --> DB_SVC
    BE_SVC --> S3_SVC
    BE_SVC --> N8N_SVC
    N8N_SVC --> BE_SVC
```

### 9.2 Servicios y Configuración

| Servicio | Imagen Base | Recursos mínimos | Puertos |
|---|---|---|---|
| **frontend** | `node:20-alpine` + build Next.js | 512MB RAM, 0.5 CPU | 3000 |
| **backend** | `python:3.12-slim` + uvicorn | 512MB RAM, 0.5 CPU | 8000 |
| **postgres** | `postgres:16-alpine` | 512MB RAM, 0.5 CPU | 5432 |
| **minio** | `minio/minio:latest` | 256MB RAM, 0.25 CPU | 9000, 9001 |
| **n8n** | `n8nio/n8n:latest` | 512MB RAM, 0.5 CPU | 5678 |

### 9.3 Variables de Entorno

```env
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/perfumeria
SECRET_KEY=<random-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=480
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
MINIO_BUCKET=perfumeria-media
N8N_WEBHOOK_BASE_URL=http://n8n:5678/webhook
OPENAI_API_KEY=<key>
CORS_ORIGINS=https://tudominio.com

# Frontend
NEXT_PUBLIC_API_URL=https://tudominio.com/api/v1
NEXT_PUBLIC_STORAGE_URL=https://tudominio.com/storage

# n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<password>
WEBHOOK_URL=https://tudominio.com/n8n
```

### 9.4 Dockerfiles

**Backend (`backend/Dockerfile`):**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY alembic.ini .
COPY ./alembic ./alembic

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend (`frontend/Dockerfile`):**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### 9.5 Estrategia de Red

- Todo el tráfico externo entra por el proxy de EasyPanel (Traefik) con HTTPS automático.
- Los servicios se comunican internamente mediante la red privada de EasyPanel (por nombre de servicio).
- MinIO puede exponerse públicamente para servir imágenes o mantenerse privado con URLs presignadas.
