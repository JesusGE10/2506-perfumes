"""
FastAPI application factory.

Creates and configures the main application instance with:
- CORS middleware
- Health check endpoint
- Router includes (added as modules are implemented)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup: nothing to initialize yet (DB pool is lazy)
    yield
    # Shutdown: dispose engine to release connections
    from app.database import engine

    await engine.dispose()


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""

    app = FastAPI(
        title="Perfumería Fina — API",
        description="API REST para la plataforma de e-commerce de perfumería fina.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Exception Handlers ---
    register_exception_handlers(app)

    # --- Health Check ---
    @app.get("/api/v1/health", tags=["health"])
    async def health_check():
        return {"status": "ok"}

    # --- Routers (Phase 2) ---
    from app.modules.auth.router import router as auth_router
    from app.modules.brands.router import router as brands_router
    from app.modules.categories.router import router as categories_router
    from app.modules.products.router import router as products_router
    from app.modules.orders.router import router as orders_router

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(brands_router, prefix="/api/v1")
    app.include_router(categories_router, prefix="/api/v1")
    app.include_router(products_router, prefix="/api/v1")
    app.include_router(orders_router, prefix="/api/v1")

    # --- Routers (Phase 3) ---
    from app.modules.promotions.router import router as promotions_router

    app.include_router(promotions_router, prefix="/api/v1")

    # --- Routers (Phase 5) ---
    from app.modules.metrics.router import router as metrics_router

    app.include_router(metrics_router, prefix="/api/v1")

    # --- Routers (Phase 6 — Media & Store config) ---
    from app.modules.media.router import router as media_router
    from app.modules.store.router import router as store_router

    app.include_router(media_router, prefix="/api/v1")
    app.include_router(store_router, prefix="/api/v1")

    return app



# Application instance used by uvicorn
app = create_app()
