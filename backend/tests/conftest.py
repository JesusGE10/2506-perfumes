"""
Pytest fixtures for the backend test suite.

Provides:
- `app`: the FastAPI application instance.
- `client`: an async HTTP test client (httpx.AsyncClient).
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app as fastapi_app


@pytest.fixture
def app():
    """Return the FastAPI application instance."""
    return fastapi_app


@pytest.fixture
async def client(app):
    """Return an async HTTP test client bound to the app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
