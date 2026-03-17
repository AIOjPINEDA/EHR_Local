"""Unit tests for the unauthenticated health check endpoint."""

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

import app.database as database_module
import app.main as main_module

pytestmark = pytest.mark.unit


class _FakeSession:
    """Minimal async session double that records executed statements."""

    def __init__(self, statements: list[str]) -> None:
        self._statements = statements

    async def execute(self, statement: object) -> None:
        self._statements.append(str(statement))

    async def close(self) -> None:
        return None


class _HealthySessionContext:
    """Async session context manager used to emulate a reachable database."""

    def __init__(self, statements: list[str]) -> None:
        self._session = _FakeSession(statements)

    async def __aenter__(self) -> _FakeSession:
        return self._session

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> bool:
        return False


class _BrokenSessionContext:
    """Async session context manager used to emulate a refused DB connection."""

    async def __aenter__(self) -> _FakeSession:
        raise ConnectionRefusedError("database is down")

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> bool:
        return False


@pytest.mark.asyncio
async def test_health_check_runs_select_one_and_returns_healthy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The health endpoint must execute a real probe query before reporting healthy."""
    statements: list[str] = []
    monkeypatch.setattr(main_module, "async_session_maker", lambda: _HealthySessionContext(statements))

    transport = ASGITransport(app=main_module.app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
    assert statements == ["SELECT 1"]


@pytest.mark.asyncio
async def test_health_check_returns_503_when_database_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The health endpoint must surface DB outages as an unhealthy 503 response."""
    monkeypatch.setattr(main_module, "async_session_maker", lambda: _BrokenSessionContext())

    transport = ASGITransport(app=main_module.app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy", "detail": "Database unavailable"}


@pytest.mark.asyncio
async def test_get_db_translates_connection_refused_into_http_503(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DB dependency must raise a semantically correct 503 when connection bootstrap fails."""
    monkeypatch.setattr(database_module, "async_session_maker", lambda: _BrokenSessionContext())

    with pytest.raises(HTTPException) as exc_info:
        await anext(database_module.get_db())

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Database unavailable"
