"""Integration tests for runtime DB connectivity and authentication flow."""

import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.main import app

pytestmark = pytest.mark.integration

INTEGRATION_FLAG = "RUN_INTEGRATION"


def _integration_enabled() -> bool:
    """Enable integration tests only on explicit opt-in."""
    return os.getenv(INTEGRATION_FLAG, "0") == "1"


async def _query_runtime_identity() -> tuple[str, str]:
    """Return current runtime user and database from configured DATABASE_URL."""
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    try:
        async with engine.connect() as connection:
            row = (await connection.execute(text("SELECT current_user, current_database()"))).one()
    finally:
        await engine.dispose()
    return row[0], row[1]


@pytest.fixture(scope="module", autouse=True)
async def _require_runtime_database() -> None:
    """Skip when integration mode is off or runtime DB is unavailable."""
    if not _integration_enabled():
        pytest.skip("Integration tests disabled. Set RUN_INTEGRATION=1 to run them.")

    try:
        await _query_runtime_identity()
    except SQLAlchemyError as exc:
        pytest.skip(f"Runtime database unavailable for integration tests: {exc}")


@pytest.fixture()
async def api_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client bound to FastAPI app for end-to-end request flow."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


async def test_runtime_database_url_connects_to_live_database() -> None:
    """DATABASE_URL should resolve to a reachable runtime database."""
    current_user, current_database = await _query_runtime_identity()
    assert current_user
    assert current_database


async def test_seed_practitioner_login_returns_token_and_profile(
    api_client: AsyncClient,
) -> None:
    """Seed login must work against the real runtime database."""
    email = os.getenv("TEST_EMAIL", "sara@consultamed.es")
    password = os.getenv("PILOT_PASSWORD", "piloto2026")

    login_response = await api_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )

    assert login_response.status_code == 200, login_response.text
    payload = login_response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"
    assert payload["practitioner"]["telecom_email"] == email

