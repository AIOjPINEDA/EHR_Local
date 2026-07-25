"""Integration tests for the urgencias activity panel and the recent-patients view."""

from datetime import date, timedelta

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_activity_route_is_not_captured_by_encounter_id(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """/encounters/activity debe resolver al panel, no a un encounter con ese id."""
    response = await api_client.get("/api/v1/encounters/activity", headers=auth_headers)

    assert response.status_code == 200, response.text
    assert "daily" in response.json()


async def test_activity_returns_continuous_series(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """Las series vienen completas y ordenadas, con el periodo actual al final."""
    response = await api_client.get(
        "/api/v1/encounters/activity",
        params={"days": 14, "weeks": 4},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    body = response.json()

    assert len(body["daily"]) == 14
    assert len(body["weekly"]) == 4

    days = [date.fromisoformat(point["date"]) for point in body["daily"]]
    assert days == sorted(days), "la serie diaria debe ir de más antigua a más reciente"
    assert days[-1] - days[0] == timedelta(days=13), "no puede haber huecos entre días"

    weeks = [date.fromisoformat(point["week_start"]) for point in body["weekly"]]
    assert weeks == sorted(weeks)
    assert all(monday.weekday() == 0 for monday in weeks), "las semanas empiezan en lunes"


async def test_activity_totals_match_the_series(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """Los totales del panel se leen de la propia serie: no pueden discrepar."""
    response = await api_client.get("/api/v1/encounters/activity", headers=auth_headers)
    body = response.json()

    assert body["today"] == {
        "encounters": body["daily"][-1]["encounters"],
        "patients": body["daily"][-1]["patients"],
    }
    assert body["yesterday"] == {
        "encounters": body["daily"][-2]["encounters"],
        "patients": body["daily"][-2]["patients"],
    }
    assert body["current_week"] == {
        "encounters": body["weekly"][-1]["encounters"],
        "patients": body["weekly"][-1]["patients"],
    }
    assert body["timezone"]


async def test_activity_patient_count_never_exceeds_encounters(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """Un paciente que reconsulta suma consultas, no pacientes distintos."""
    response = await api_client.get("/api/v1/encounters/activity", headers=auth_headers)
    body = response.json()

    for point in body["daily"] + body["weekly"]:
        assert point["patients"] <= point["encounters"]


async def test_activity_rejects_out_of_range_window(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """La ventana está acotada para que el panel no dispare consultas enormes."""
    response = await api_client.get(
        "/api/v1/encounters/activity", params={"days": 365}, headers=auth_headers
    )

    assert response.status_code == 422


async def test_activity_requires_authentication(api_client: AsyncClient) -> None:
    """El panel expone carga asistencial: no puede ser público."""
    response = await api_client.get("/api/v1/encounters/activity")

    assert response.status_code == 401


async def test_recent_sort_returns_only_attended_patients_newest_first(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """`sort=recent` es la vista de urgencias: quién ha pasado y cuándo."""
    response = await api_client.get(
        "/api/v1/patients/", params={"sort": "recent", "limit": 20}, headers=auth_headers
    )

    assert response.status_code == 200, response.text
    items = response.json()["items"]

    assert all(item["encounter_count"] > 0 for item in items), (
        "un paciente sin consultas no tiene 'última visita' que ordenar"
    )
    assert all(item["last_encounter_at"] for item in items)

    visits = [item["last_encounter_at"] for item in items]
    assert visits == sorted(visits, reverse=True), "el más reciente va primero"


async def test_recent_sort_narrows_the_directory(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """El total refleja el filtro: atendidos son un subconjunto del directorio."""
    directory = await api_client.get(
        "/api/v1/patients/", params={"sort": "name", "limit": 1}, headers=auth_headers
    )
    attended = await api_client.get(
        "/api/v1/patients/", params={"sort": "recent", "limit": 1}, headers=auth_headers
    )

    assert attended.json()["total"] <= directory.json()["total"]


async def test_default_sort_stays_alphabetical(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """Sin `sort` el directorio sigue comportándose como antes."""
    response = await api_client.get(
        "/api/v1/patients/", params={"limit": 10}, headers=auth_headers
    )

    families = [item["name_family"] for item in response.json()["items"]]
    assert families == sorted(families, key=str.casefold)


async def test_unknown_sort_is_rejected(
    api_client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """Un valor desconocido falla en validación en vez de caer al orden por defecto."""
    response = await api_client.get(
        "/api/v1/patients/", params={"sort": "aleatorio"}, headers=auth_headers
    )

    assert response.status_code == 422
