"""Unit tests for PatientService.update validation behavior."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.patient_service import PatientService

pytestmark = pytest.mark.unit


def _build_patient() -> SimpleNamespace:
    """Return a minimal mutable patient-like object for service tests."""
    return SimpleNamespace(
        id="patient-1",
        name_given="Sara",
        name_family="Muñoz",
        birth_date=date(1990, 5, 15),
        gender="female",
        telecom_phone="600000000",
        telecom_email="sara@example.com",
    )


@pytest.mark.asyncio
async def test_update_rejects_null_required_field() -> None:
    """Service must reject null for required DB fields instead of crashing at commit."""
    service = PatientService(AsyncMock())
    patient = _build_patient()
    service.get_by_id = AsyncMock(return_value=patient)  # type: ignore[method-assign]
    service.commit_and_refresh = AsyncMock()  # type: ignore[method-assign]

    with pytest.raises(ValueError, match="name_given"):
        await service.update("patient-1", {"name_given": None})

    service.commit_and_refresh.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_rejects_empty_required_string() -> None:
    """Service must reject empty strings in required text fields."""
    service = PatientService(AsyncMock())
    patient = _build_patient()
    service.get_by_id = AsyncMock(return_value=patient)  # type: ignore[method-assign]
    service.commit_and_refresh = AsyncMock()  # type: ignore[method-assign]

    with pytest.raises(ValueError, match="name_family"):
        await service.update("patient-1", {"name_family": "   "})

    service.commit_and_refresh.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_allows_clearing_optional_fields() -> None:
    """Optional fields can be cleared explicitly with null values."""
    service = PatientService(AsyncMock())
    patient = _build_patient()
    service.get_by_id = AsyncMock(return_value=patient)  # type: ignore[method-assign]
    service.commit_and_refresh = AsyncMock()  # type: ignore[method-assign]

    updated = await service.update(
        "patient-1",
        {"gender": None, "telecom_phone": None, "telecom_email": None},
    )

    assert updated is patient
    assert patient.gender is None
    assert patient.telecom_phone is None
    assert patient.telecom_email is None
    service.commit_and_refresh.assert_awaited_once_with(patient)
