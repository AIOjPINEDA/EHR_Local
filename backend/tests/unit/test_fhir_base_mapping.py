"""Unit tests for deterministic base FHIR mapping of Patient and Practitioner."""
from datetime import date
from types import SimpleNamespace

import pytest

from app.fhir.base_mapping import patient_to_fhir_reference, patient_to_fhir_resource
from app.fhir.base_mapping import practitioner_to_fhir_reference, practitioner_to_fhir_resource

pytestmark = pytest.mark.unit


def _build_patient() -> SimpleNamespace:
    """Create a patient sample with stable source data."""
    return SimpleNamespace(
        id="0f56f8de-7fd9-466e-9f1a-b7fca2c8db0d",
        identifier_value="12345678z",
        identifier_system="urn:oid:1.3.6.1.4.1.19126.3",
        name_given="Sara",
        name_family="Muñoz",
        birth_date=date(1990, 5, 15),
        gender="female",
        telecom_phone="600000000",
        telecom_email="sara@example.com",
        active=True,
    )


def _build_practitioner() -> SimpleNamespace:
    """Create a practitioner sample with stable source data."""
    return SimpleNamespace(
        id="d8f1d4ac-2b62-4737-b440-059de8aa945d",
        identifier_value="COL-9988",
        identifier_system="urn:oid:2.16.724.4.9.10.5",
        name_given="Laura",
        name_family="Gómez",
        qualification_code="MED",
        telecom_email="laura@consultamed.es",
        active=True,
    )


def test_patient_mapping_is_repeatable_and_traceable() -> None:
    """Patient export should keep UUID and traceable identifiers across runs."""
    patient = _build_patient()

    first = patient_to_fhir_resource(patient)
    second = patient_to_fhir_resource(patient)

    assert first == second
    assert first["id"] == patient.id
    assert first["identifier"] == [
        {
            "system": "urn:oid:1.3.6.1.4.1.19126.3",
            "value": "12345678Z",
        },
        {
            "system": "urn:consultamed:source:patient:id",
            "value": patient.id,
        },
    ]
    assert first["birthDate"] == "1990-05-15"
    assert first["telecom"] == [
        {"system": "phone", "value": "600000000", "use": "mobile"},
        {"system": "email", "value": "sara@example.com", "use": "home"},
    ]


def test_practitioner_mapping_is_repeatable_and_traceable() -> None:
    """Practitioner export should keep UUID and qualification/email mapping."""
    practitioner = _build_practitioner()

    first = practitioner_to_fhir_resource(practitioner)
    second = practitioner_to_fhir_resource(practitioner)

    assert first == second
    assert first["id"] == practitioner.id
    assert first["identifier"] == [
        {
            "system": "urn:oid:2.16.724.4.9.10.5",
            "value": "COL-9988",
        },
        {
            "system": "urn:consultamed:source:practitioner:id",
            "value": practitioner.id,
        },
    ]
    assert first["qualification"] == [{"code": {"text": "MED"}}]
    assert first["telecom"] == [
        {"system": "email", "value": "laura@consultamed.es", "use": "work"}
    ]


def test_patient_and_practitioner_references_are_deterministic() -> None:
    """Reference builders should stay reproducible for later clinical mapping."""
    patient = _build_patient()
    practitioner = _build_practitioner()

    encounter_like = {
        "subject": patient_to_fhir_reference(patient),
        "participant": [{"actor": practitioner_to_fhir_reference(practitioner)}],
    }

    assert encounter_like == {
        "subject": {
            "reference": f"Patient/{patient.id}",
            "type": "Patient",
            "identifier": {
                "system": "urn:consultamed:source:patient:id",
                "value": patient.id,
            },
        },
        "participant": [
            {
                "actor": {
                    "reference": f"Practitioner/{practitioner.id}",
                    "type": "Practitioner",
                    "identifier": {
                        "system": "urn:consultamed:source:practitioner:id",
                        "value": practitioner.id,
                    },
                }
            }
        ],
    }