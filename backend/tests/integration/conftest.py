"""Shared fixtures for opt-in integration tests against the runtime database."""

import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.database import engine
from app.main import app

INTEGRATION_FLAG = "RUN_INTEGRATION"

SEED_EMAIL = os.getenv("TEST_EMAIL", "sara@consultamed.es")
SEED_PASSWORD = os.getenv("PILOT_PASSWORD", "piloto2026")


def integration_enabled() -> bool:
    """Enable integration tests only on explicit opt-in."""
    return os.getenv(INTEGRATION_FLAG, "0") == "1"


async def query_runtime_identity() -> tuple[str, str]:
    """Return current runtime user and database from configured DATABASE_URL."""
    probe_engine = create_async_engine(settings.DATABASE_URL, future=True)
    try:
        async with probe_engine.connect() as connection:
            row = (await connection.execute(text("SELECT current_user, current_database()"))).one()
    finally:
        await probe_engine.dispose()
    return row[0], row[1]


# Ámbito de función a propósito: pytest-asyncio 0.23 ata el event loop de un
# fixture async con ámbito de módulo al primer módulo que lo usa, y el resto
# falla con "fixture <event_loop> not found". La sonda cuesta milisegundos.
@pytest.fixture(autouse=True)
async def _require_runtime_database() -> None:
    """Skip when integration mode is off or runtime DB is unavailable."""
    if not integration_enabled():
        pytest.skip("Integration tests disabled. Set RUN_INTEGRATION=1 to run them.")

    try:
        await query_runtime_identity()
    except SQLAlchemyError as exc:
        pytest.skip(f"Runtime database unavailable for integration tests: {exc}")


@pytest.fixture(autouse=True)
async def _recycle_engine_pool() -> AsyncGenerator[None, None]:
    """
    Devuelve el pool del engine global al terminar cada test.

    `app.database.engine` se crea una sola vez a nivel de módulo, pero cada test
    corre en su propio event loop: reutilizar conexiones abiertas en un loop ya
    cerrado rompe asyncpg.
    """
    yield
    await engine.dispose()


@pytest.fixture()
async def api_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client bound to FastAPI app for end-to-end request flow."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture()
async def auth_headers(api_client: AsyncClient) -> dict[str, str]:
    """Bearer header for the seeded practitioner."""
    response = await api_client.post(
        "/api/v1/auth/login",
        data={"username": SEED_EMAIL, "password": SEED_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
