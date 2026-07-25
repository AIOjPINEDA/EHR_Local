"""Unit tests for the practitioner registration and profile-selection endpoints."""

from collections.abc import AsyncGenerator
from typing import Any, Optional

import pytest
from httpx import ASGITransport, AsyncClient

import app.main as main_module
from app.config import settings
from app.database import get_db
from app.models.practitioner import Practitioner
from app.services.security import hash_password

pytestmark = pytest.mark.unit


class _Scalars:
    """Minimal SQLAlchemy scalars() double."""

    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return self._rows


class _Result:
    """Minimal SQLAlchemy result double for scalar and collection queries."""

    def __init__(self, value: Any = None, rows: Optional[list[Any]] = None) -> None:
        self._value = value
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self) -> Any:
        return self._value

    def scalar_one(self) -> Any:
        return self._value

    def scalars(self) -> _Scalars:
        return _Scalars(self._rows)


class _FakeSession:
    """DB session double that replays a scripted sequence of query results."""

    def __init__(self, results: Optional[list[_Result]] = None) -> None:
        self._results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, statement: object) -> _Result:
        if not self._results:
            raise AssertionError("Consulta a base de datos no esperada en este test")
        return self._results.pop(0)

    def add(self, instance: Any) -> None:
        # El default de la columna `id` se aplica en el flush real contra
        # PostgreSQL; aquí se simula para poder validar la respuesta HTTP.
        if getattr(instance, "id", None) is None:
            instance.id = "practitioner-new"
        self.added.append(instance)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, instance: Any) -> None:
        return None

    async def close(self) -> None:
        return None


def _build_practitioner(*, active: bool = True, email: str = "sara@consultamed.es") -> Practitioner:
    """Practitioner instance usable by the auth response schemas."""
    return Practitioner(
        id="practitioner-123",
        identifier_value="282886589",
        name_given="Sara Isabel",
        name_family="Muñoz Mejía",
        qualification_code="Medicina Familiar y Comunitaria",
        telecom_email=email,
        password_hash=hash_password("piloto2026"),
        active=active,
    )


def _valid_payload(**overrides: Any) -> dict[str, Any]:
    """Registration payload with the agreed administration key."""
    payload: dict[str, Any] = {
        "identifier_value": "282889999",
        "name_given": "Ana",
        "name_family": "Ruiz Gil",
        "qualification_code": "Pediatría",
        "telecom_email": "Ana@ConsultaMed.es",
        "password": "consulta2026",
        "registration_password": settings.REGISTRATION_PASSWORD,
    }
    payload.update(overrides)
    return payload


def _client_with_session(session: _FakeSession) -> AsyncClient:
    """Bind the FastAPI app to a scripted session double."""

    async def _override_get_db() -> AsyncGenerator[_FakeSession, None]:
        yield session

    main_module.app.dependency_overrides[get_db] = _override_get_db
    return AsyncClient(transport=ASGITransport(app=main_module.app), base_url="http://testserver")


@pytest.fixture(autouse=True)
def _clear_overrides() -> AsyncGenerator[None, None]:
    """Keep dependency overrides from leaking between tests."""
    yield
    main_module.app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_rejects_wrong_administration_key() -> None:
    """Sin la clave de administración el alta no debe llegar a la base de datos."""
    session = _FakeSession()  # cualquier consulta haría fallar el test

    async with _client_with_session(session) as client:
        response = await client.post(
            "/api/v1/auth/register",
            json=_valid_payload(registration_password="clave-incorrecta"),
        )

    assert response.status_code == 403
    assert response.json()["detail"] == "Clave de administración incorrecta"
    assert session.added == []


@pytest.mark.asyncio
async def test_register_creates_profile_with_hashed_password() -> None:
    """Con la clave correcta se crea el perfil y nunca se devuelve la contraseña."""
    session = _FakeSession([_Result(None), _Result(None)])  # email libre, colegiado libre

    async with _client_with_session(session) as client:
        response = await client.post("/api/v1/auth/register", json=_valid_payload())

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["telecom_email"] == "ana@consultamed.es"  # normalizado a minúsculas
    assert body["identifier_value"] == "282889999"
    assert "password" not in body
    assert "password_hash" not in body

    created = session.added[0]
    assert created.active is True
    assert created.password_hash.startswith("$2b$")
    assert created.password_hash != "consulta2026"


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email() -> None:
    """Dos perfiles con el mismo email romperían el login."""
    session = _FakeSession([_Result(_build_practitioner())])

    async with _client_with_session(session) as client:
        response = await client.post("/api/v1/auth/register", json=_valid_payload())

    assert response.status_code == 400
    assert "ya existe un perfil" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_rejects_duplicate_colegiado() -> None:
    """El Nº Colegiado identifica al profesional y es único."""
    session = _FakeSession([_Result(None), _Result(_build_practitioner())])

    async with _client_with_session(session) as client:
        response = await client.post("/api/v1/auth/register", json=_valid_payload())

    assert response.status_code == 400
    assert "Nº Colegiado" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_rejects_weak_password() -> None:
    """La contraseña mínima se valida antes de tocar la base de datos."""
    session = _FakeSession()

    async with _client_with_session(session) as client:
        response = await client.post(
            "/api/v1/auth/register",
            json=_valid_payload(password="corta1"),
        )

    assert response.status_code == 422
    assert session.added == []


@pytest.mark.asyncio
async def test_register_rejects_invalid_email() -> None:
    """El email es la credencial de acceso: debe tener formato válido."""
    session = _FakeSession()

    async with _client_with_session(session) as client:
        response = await client.post(
            "/api/v1/auth/register",
            json=_valid_payload(telecom_email="no-es-un-email"),
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_rejects_deactivated_profile() -> None:
    """Un perfil desactivado no puede iniciar sesión aunque la clave sea correcta."""
    session = _FakeSession([_Result(_build_practitioner(active=False))])

    async with _client_with_session(session) as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "sara@consultamed.es", "password": "piloto2026"},
        )

    assert response.status_code == 401
    assert "desactivado" in response.json()["detail"]


@pytest.mark.asyncio
async def test_active_token_stops_working_after_deactivation() -> None:
    """Desactivar un perfil invalida sus tokens ya emitidos."""
    active_session = _FakeSession([_Result(_build_practitioner())])

    async with _client_with_session(active_session) as client:
        login = await client.post(
            "/api/v1/auth/login",
            data={"username": "sara@consultamed.es", "password": "piloto2026"},
        )
    token = login.json()["access_token"]

    deactivated_session = _FakeSession([_Result(_build_practitioner(active=False))])
    async with _client_with_session(deactivated_session) as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "desactivado" in response.json()["detail"]


@pytest.mark.asyncio
async def test_public_profile_list_exposes_only_login_data() -> None:
    """El selector de acceso solo recibe datos profesionales, sin hashes."""
    session = _FakeSession([_Result(rows=[_build_practitioner()])])

    async with _client_with_session(session) as client:
        response = await client.get("/api/v1/auth/practitioners")

    assert response.status_code == 200, response.text
    profiles = response.json()
    assert len(profiles) == 1
    assert profiles[0]["telecom_email"] == "sara@consultamed.es"
    assert set(profiles[0]) == {
        "id",
        "name_given",
        "name_family",
        "qualification_code",
        "telecom_email",
    }
