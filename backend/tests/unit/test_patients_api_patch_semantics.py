"""Unit tests for PATCH semantics in patients API endpoint."""
from datetime import date, datetime
from types import SimpleNamespace

import pytest

import app.api.patients as patients_api
from app.schemas.patient import PatientUpdate

pytestmark = pytest.mark.unit


def _build_patient_response_source() -> SimpleNamespace:
    """Create a minimal patient-like object accepted by PatientResponse.model_validate."""
    return SimpleNamespace(
        id="patient-1",
        identifier_value="12345678Z",
        name_given="Sara",
        name_family="Muñoz",
        birth_date=date(1990, 5, 15),
        gender="female",
        telecom_phone="600000000",
        telecom_email="sara@example.com",
        age=35,
        allergies=[],
        meta_created_at=datetime(2026, 2, 1, 10, 0, 0),
        meta_updated_at=datetime(2026, 2, 1, 10, 0, 0),
    )


@pytest.mark.asyncio
async def test_update_patient_preserves_explicit_null_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Explicit null in PATCH payload must reach the service layer (clear-intent)."""
    captured: dict[str, object] = {}
    patient_obj = _build_patient_response_source()

    class FakePatientService:
        def __init__(self, db: object) -> None:
            self.db = db

        async def update(self, patient_id: str, data: dict[str, object]) -> SimpleNamespace | None:
            captured["patient_id"] = patient_id
            captured["data"] = data
            return patient_obj

    monkeypatch.setattr(patients_api, "PatientService", FakePatientService)

    payload = PatientUpdate.model_validate({"gender": None})
    result = await patients_api.update_patient("patient-1", payload, db=object(), current_user=object())

    assert captured["patient_id"] == "patient-1"
    assert captured["data"] == {"gender": None}
    assert result.id == "patient-1"


@pytest.mark.asyncio
async def test_update_patient_omits_fields_not_sent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fields omitted in PATCH payload should not be sent to the service layer."""
    captured: dict[str, object] = {}
    patient_obj = _build_patient_response_source()

    class FakePatientService:
        def __init__(self, db: object) -> None:
            self.db = db

        async def update(self, patient_id: str, data: dict[str, object]) -> SimpleNamespace | None:
            captured["data"] = data
            return patient_obj

    monkeypatch.setattr(patients_api, "PatientService", FakePatientService)

    payload = PatientUpdate.model_validate({})
    await patients_api.update_patient("patient-1", payload, db=object(), current_user=object())

    assert captured["data"] == {}
