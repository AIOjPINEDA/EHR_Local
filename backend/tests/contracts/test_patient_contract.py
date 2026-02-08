"""
ConsultaMed Backend - Patient Contract Tests

Validates that PatientSummary schema meets frontend navigation table requirements.
"""
import pytest

pytestmark = pytest.mark.contract


def test_patient_summary_includes_encounter_metrics():
    """PatientSummary must include encounter count and last encounter date."""
    from app.schemas.patient import PatientSummary

    required_fields = [
        "id",
        "identifier_value",
        "name_given",
        "name_family",
        "age",
        "encounter_count",
        "last_encounter_at",
    ]
    for field in required_fields:
        assert field in PatientSummary.model_fields, (
            f"PatientSummary must include {field}"
        )
