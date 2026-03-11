"""Unit tests for the initial clinical subset ETL mapping and orchestration."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.fhir.clinical_mapping import SOAP_EXTENSION_URL, encounter_to_fhir_resource
from app.fhir.clinical_mapping import allergy_intolerance_to_fhir_resource, condition_to_fhir_resource
from app.fhir.clinical_mapping import medication_request_to_fhir_resource
from app.fhir.etl import ClinicalSubsetSnapshot, build_load_plan, validate_snapshot_references


pytestmark = pytest.mark.unit


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "backend").is_dir() and (candidate / "frontend").is_dir():
            return candidate
    raise AssertionError("Unable to locate repository root from test path.")


def _build_encounter() -> SimpleNamespace:
    return SimpleNamespace(
        id="enc-123",
        status="finished",
        class_code="AMB",
        subject_id="pat-123",
        participant_id="prac-123",
        period_start=datetime(2026, 3, 11, 9, 30, tzinfo=timezone.utc),
        period_end=datetime(2026, 3, 11, 10, 0, tzinfo=timezone.utc),
        reason_text="control",
        subjective_text="molestia cervical",
        objective_text="sin signos de alarma",
        assessment_text="contractura muscular",
        plan_text="reposo relativo",
        recommendations_text="hidratarse",
        note="nota legacy",
    )


def test_encounter_mapping_keeps_deterministic_references_and_soap_extension() -> None:
    """Encounter export should keep stable references plus the transitional SOAP extension."""
    resource = encounter_to_fhir_resource(_build_encounter())

    assert resource["id"] == "enc-123"
    assert resource["status"] == "completed"
    assert resource["subject"]["reference"] == "Patient/pat-123"
    assert resource["participant"][0]["actor"]["reference"] == "Practitioner/prac-123"
    assert resource["reason"] == [{"concept": {"text": "control"}}]
    assert resource["extension"] == [
        {
            "url": SOAP_EXTENSION_URL,
            "extension": [
                {"url": "subjective", "valueString": "molestia cervical"},
                {"url": "objective", "valueString": "sin signos de alarma"},
                {"url": "assessment", "valueString": "contractura muscular"},
                {"url": "plan", "valueString": "reposo relativo"},
                {"url": "recommendations", "valueString": "hidratarse"},
                {"url": "legacy-note", "valueString": "nota legacy"},
            ],
        }
    ]


@pytest.mark.parametrize(
    ("local_status", "expected_fhir_status"),
    [
        ("planned", "planned"),
        ("in-progress", "in-progress"),
        ("on-hold", "on-hold"),
        ("discharged", "discharged"),
        ("finished", "completed"),
        ("cancelled", "cancelled"),
    ],
)
def test_encounter_mapping_normalizes_confirmed_local_statuses_to_fhir_r5(
    local_status: str,
    expected_fhir_status: str,
) -> None:
    """Confirmed ConsultaMed encounter statuses should map to valid FHIR R5 EncounterStatus codes."""
    encounter = _build_encounter()
    encounter.status = local_status

    resource = encounter_to_fhir_resource(encounter)

    assert resource["status"] == expected_fhir_status


def test_encounter_mapping_rejects_unknown_local_status() -> None:
    """Unexpected local statuses should fail fast instead of reaching HAPI with invalid codes."""
    encounter = _build_encounter()
    encounter.status = "finished-locally"

    with pytest.raises(ValueError, match="Unsupported Encounter.status"):
        encounter_to_fhir_resource(encounter)


def test_condition_medication_and_allergy_mapping_keep_traceable_links() -> None:
    """Clinical resources should reuse the deterministic Patient/Practitioner/Encounter references."""
    condition = condition_to_fhir_resource(
        SimpleNamespace(
            id="cond-123",
            subject_id="pat-123",
            encounter_id="enc-123",
            code_text="Lumbalgia",
            code_coding_code="M54.5",
            code_coding_system="http://hl7.org/fhir/sid/icd-10",
            code_coding_display="Low back pain",
            clinical_status="active",
            recorded_date=datetime(2026, 3, 11, 10, 15, tzinfo=timezone.utc),
        )
    )
    medication = medication_request_to_fhir_resource(
        SimpleNamespace(
            id="med-123",
            status="active",
            intent="order",
            subject_id="pat-123",
            encounter_id="enc-123",
            requester_id="prac-123",
            medication_text="Ibuprofeno 600 mg",
            medication_code="387458008",
            medication_system="http://snomed.info/sct",
            dosage_text="1 comprimido cada 8 horas",
            dosage_timing_code="TID",
            duration_value=5,
            duration_unit="d",
            authored_on=datetime(2026, 3, 11, 10, 20, tzinfo=timezone.utc),
        )
    )
    allergy = allergy_intolerance_to_fhir_resource(
        SimpleNamespace(
            id="alg-123",
            patient_id="pat-123",
            clinical_status="active",
            type="allergy",
            category="medication",
            criticality="high",
            code_text="Penicilina",
            code_coding_code="91936005",
            code_coding_system="http://snomed.info/sct",
            recorded_date=datetime(2026, 3, 10, 9, 0, tzinfo=timezone.utc),
        )
    )

    assert condition["subject"]["reference"] == "Patient/pat-123"
    assert condition["encounter"]["reference"] == "Encounter/enc-123"
    assert medication["subject"]["reference"] == "Patient/pat-123"
    assert medication["encounter"]["reference"] == "Encounter/enc-123"
    assert medication["requester"]["reference"] == "Practitioner/prac-123"
    assert medication["medication"] == {
        "concept": {
            "text": "Ibuprofeno 600 mg",
            "coding": [{"system": "http://snomed.info/sct", "code": "387458008"}],
        }
    }
    assert allergy["patient"]["reference"] == "Patient/pat-123"
    assert allergy["category"] == ["medication"]
    assert allergy["criticality"] == "high"


def test_load_plan_orders_foundational_resources_before_clinical_subset() -> None:
    """The ETL should always upsert Patient/Practitioner before dependent clinical resources."""
    snapshot = ClinicalSubsetSnapshot(
        patients=[SimpleNamespace(id="pat-123", identifier_value="12345678Z", identifier_system="urn:oid:1", name_given="Sara", name_family="Pérez", birth_date=datetime(1990, 1, 1).date(), gender="female", telecom_phone=None, telecom_email=None, active=True)],
        practitioners=[SimpleNamespace(id="prac-123", identifier_value="COL-1", identifier_system="urn:oid:2", name_given="Laura", name_family="García", qualification_code=None, telecom_email=None, active=True)],
        encounters=[_build_encounter()],
        conditions=[],
        medication_requests=[],
        allergies=[],
    )

    plan = build_load_plan(snapshot)
    assert [batch.resource_type for batch in plan] == [
        "Patient",
        "Practitioner",
        "Encounter",
        "Condition",
        "MedicationRequest",
        "AllergyIntolerance",
    ]


def test_reference_validation_fails_fast_on_orphan_clinical_links() -> None:
    """Broken source references should abort the ETL before any PUT reaches HAPI."""
    snapshot = ClinicalSubsetSnapshot(
        patients=[],
        practitioners=[],
        encounters=[_build_encounter()],
        conditions=[],
        medication_requests=[],
        allergies=[],
    )

    with pytest.raises(ValueError, match="Encounter enc-123 references missing Patient pat-123"):
        validate_snapshot_references(snapshot)


def test_shell_loader_wires_reset_reload_workflow() -> None:
    """Repository script should keep the simple reset/reload path for the HAPI ETL."""
    script = (_repo_root() / "scripts" / "load-hapi-clinical-subset.sh").read_text(encoding="utf-8")

    assert "--reset" in script
    assert ".venv/bin/python" in script
    assert "setup-local-db.sh" in script
    assert "start-hapi-sidecar.sh" in script
    assert "CONSULTAMED_ETL_API_KEY" in script
    assert "greenlet" in script
    assert "scripts/load_hapi_clinical_subset.py" in script