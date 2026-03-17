"""Unit tests for local JWT auth flow with the runtime JWT library."""
from collections.abc import AsyncGenerator
from datetime import timedelta

import bcrypt
import jwt
import pytest
from httpx import ASGITransport, AsyncClient

import app.main as main_module
from app.api.auth import create_access_token
from app.database import get_db
from app.models.practitioner import Practitioner

pytestmark = pytest.mark.unit


class _ScalarResult:
    """Minimal SQLAlchemy scalar result double."""

    def __init__(self, value: Practitioner | None) -> None:
        self._value = value

    def scalar_one_or_none(self) -> Practitioner | None:
        return self._value


class _FakeSession:
    """DB session double returning a fixed practitioner for auth lookups."""

    def __init__(self, practitioner: Practitioner | None) -> None:
        self._practitioner = practitioner

    async def execute(self, statement: object) -> _ScalarResult:
        return _ScalarResult(self._practitioner)

    async def close(self) -> None:
        return None


def _build_practitioner() -> Practitioner:
    """Create a practitioner model instance compatible with auth responses."""
    password_hash = bcrypt.hashpw(b"piloto2026", bcrypt.gensalt()).decode("utf-8")
    return Practitioner(
        id="practitioner-123",
        identifier_value="COL-12345",
        name_given="Sara",
        name_family="Martin",
        qualification_code="family-medicine",
        telecom_email="sara@consultamed.es",
        password_hash=password_hash,
        active=True,
    )


@pytest.fixture()
async def auth_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with DB dependency overridden for auth route tests."""
    practitioner = _build_practitioner()

    async def _override_get_db() -> AsyncGenerator[_FakeSession, None]:
        yield _FakeSession(practitioner)

    main_module.app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=main_module.app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    main_module.app.dependency_overrides.clear()


def test_create_access_token_uses_current_contract() -> None:
    """Issued tokens must keep sub, exp, and configured algorithm semantics."""
    token = create_access_token({"sub": "practitioner-123"}, expires_delta=timedelta(minutes=5))

    header = jwt.get_unverified_header(token)
    payload = jwt.decode(
        token,
        main_module.settings.JWT_SECRET_KEY,
        algorithms=[main_module.settings.JWT_ALGORITHM],
    )

    assert header["alg"] == main_module.settings.JWT_ALGORITHM
    assert payload["sub"] == "practitioner-123"
    assert isinstance(payload["exp"], int)


@pytest.mark.asyncio
async def test_login_returns_bearer_token_decodable_by_runtime_library(
    auth_client: AsyncClient,
) -> None:
    """Login must keep the current bearer response contract."""
    response = await auth_client.post(
        "/api/v1/auth/login",
        data={"username": "sara@consultamed.es", "password": "piloto2026"},
    )

    assert response.status_code == 200, response.text
    body = response.json()

    assert body["token_type"] == "bearer"
    assert body["practitioner"]["id"] == "practitioner-123"
    decoded = jwt.decode(
        body["access_token"],
        main_module.settings.JWT_SECRET_KEY,
        algorithms=[main_module.settings.JWT_ALGORITHM],
    )
    assert decoded["sub"] == "practitioner-123"


@pytest.mark.asyncio
async def test_auth_me_accepts_bearer_token_from_login(auth_client: AsyncClient) -> None:
    """The /auth/me endpoint must accept the issued bearer token unchanged."""
    login_response = await auth_client.post(
        "/api/v1/auth/login",
        data={"username": "sara@consultamed.es", "password": "piloto2026"},
    )
    token = login_response.json()["access_token"]

    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["telecom_email"] == "sara@consultamed.es"


@pytest.mark.asyncio
async def test_protected_endpoint_rejects_invalid_bearer_token(auth_client: AsyncClient) -> None:
    """Protected endpoints must keep rejecting malformed or invalid bearer tokens."""
    response = await auth_client.get(
        "/api/v1/patients/",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"
