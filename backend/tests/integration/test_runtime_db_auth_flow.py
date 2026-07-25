"""Integration tests for runtime DB connectivity and authentication flow."""

import os
from collections.abc import AsyncGenerator

import pytest
from httpx import AsyncClient

from app.config import settings
from app.database import async_session_maker
from app.services.practitioner_service import PractitionerService
from tests.integration.conftest import query_runtime_identity

pytestmark = pytest.mark.integration

# Perfil desechable para el flujo de alta; se borra antes y después del test.
# El dominio es real a propósito: email-validator rechaza TLD reservados (.test).
TEST_PROFILE_EMAIL = "integration.profile@consultamed.es"
TEST_PROFILE_PASSWORD = "integracion2026"


async def test_runtime_database_url_connects_to_live_database() -> None:
    """DATABASE_URL should resolve to a reachable runtime database."""
    current_user, current_database = await query_runtime_identity()
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


async def _purge_test_profile() -> None:
    """Elimina el perfil desechable si quedó de una ejecución anterior."""
    async with async_session_maker() as session:
        service = PractitionerService(session)
        practitioner = await service.get_by_email(TEST_PROFILE_EMAIL)
        if practitioner:
            await service.delete(practitioner.id)


@pytest.fixture()
async def clean_test_profile() -> AsyncGenerator[None, None]:
    """Garantiza que el perfil de prueba no exista antes ni después del test."""
    await _purge_test_profile()
    yield
    await _purge_test_profile()


async def test_new_profile_can_register_login_and_be_deactivated(
    api_client: AsyncClient,
    clean_test_profile: None,
) -> None:
    """Alta de perfil, acceso y baja administrativa contra la base de datos real."""
    register_response = await api_client.post(
        "/api/v1/auth/register",
        json={
            "identifier_value": "999999999",
            "name_given": "Perfil",
            "name_family": "Integración",
            "qualification_code": "Medicina General",
            "telecom_email": TEST_PROFILE_EMAIL,
            "password": TEST_PROFILE_PASSWORD,
            "registration_password": settings.REGISTRATION_PASSWORD,
        },
    )
    assert register_response.status_code == 201, register_response.text
    practitioner_id = register_response.json()["id"]

    login_response = await api_client.post(
        "/api/v1/auth/login",
        data={"username": TEST_PROFILE_EMAIL, "password": TEST_PROFILE_PASSWORD},
    )
    assert login_response.status_code == 200, login_response.text
    token = login_response.json()["access_token"]

    me_response = await api_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["telecom_email"] == TEST_PROFILE_EMAIL

    listed = await api_client.get("/api/v1/auth/practitioners")
    assert listed.status_code == 200
    assert TEST_PROFILE_EMAIL in [profile["telecom_email"] for profile in listed.json()]

    # Baja administrativa: solo desde código, nunca desde la UI.
    async with async_session_maker() as session:
        await PractitionerService(session).set_active(practitioner_id, False)

    blocked_login = await api_client.post(
        "/api/v1/auth/login",
        data={"username": TEST_PROFILE_EMAIL, "password": TEST_PROFILE_PASSWORD},
    )
    assert blocked_login.status_code == 401

    listed_after = await api_client.get("/api/v1/auth/practitioners")
    assert TEST_PROFILE_EMAIL not in [profile["telecom_email"] for profile in listed_after.json()]


async def test_registration_requires_administration_key(api_client: AsyncClient) -> None:
    """La clave de alta es obligatoria también contra la base de datos real."""
    response = await api_client.post(
        "/api/v1/auth/register",
        json={
            "identifier_value": "999999998",
            "name_given": "Sin",
            "name_family": "Autorización",
            "telecom_email": "sin.autorizacion@consultamed.es",
            "password": "loquesea2026",
            "registration_password": "clave-incorrecta",
        },
    )

    assert response.status_code == 403

