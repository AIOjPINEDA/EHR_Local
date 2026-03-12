"""Deterministic base mapping helpers for Patient and Practitioner exports."""
from datetime import date
from typing import Any, Protocol

from app.validators.dni import format_dni


PATIENT_SOURCE_IDENTIFIER_SYSTEM = "urn:consultamed:source:patient:id"
PRACTITIONER_SOURCE_IDENTIFIER_SYSTEM = "urn:consultamed:source:practitioner:id"


class PatientMappingSource(Protocol):
    """Attributes required to serialize a Patient into the agreed FHIR shape."""

    id: str
    identifier_value: str
    identifier_system: str
    name_given: str
    name_family: str
    birth_date: date
    gender: str | None
    telecom_phone: str | None
    telecom_email: str | None
    active: bool


class PractitionerMappingSource(Protocol):
    """Attributes required to serialize a Practitioner into the agreed FHIR shape."""

    id: str
    identifier_value: str
    identifier_system: str
    name_given: str
    name_family: str
    qualification_code: str | None
    telecom_email: str | None
    active: bool


def _build_reference(
    resource_type: str,
    source_id: str,
    identifier_system: str,
) -> dict[str, Any]:
    """Build a deterministic FHIR reference with source-traceable identifier data."""
    return {
        "reference": f"{resource_type}/{source_id}",
        "type": resource_type,
        "identifier": {
            "system": identifier_system,
            "value": source_id,
        },
    }


def patient_fhir_identifiers(patient: PatientMappingSource) -> list[dict[str, str]]:
    """Return the reproducible business and source identifiers for a patient."""
    return [
        {
            "system": patient.identifier_system,
            "value": format_dni(patient.identifier_value),
        },
        {
            "system": PATIENT_SOURCE_IDENTIFIER_SYSTEM,
            "value": patient.id,
        },
    ]


def practitioner_fhir_identifiers(practitioner: PractitionerMappingSource) -> list[dict[str, str]]:
    """Return the reproducible business and source identifiers for a practitioner."""
    return [
        {
            "system": practitioner.identifier_system,
            "value": practitioner.identifier_value.strip(),
        },
        {
            "system": PRACTITIONER_SOURCE_IDENTIFIER_SYSTEM,
            "value": practitioner.id,
        },
    ]


def patient_to_fhir_reference(patient: PatientMappingSource) -> dict[str, Any]:
    """Build a deterministic patient reference for future clinical resources."""
    return _build_reference("Patient", patient.id, PATIENT_SOURCE_IDENTIFIER_SYSTEM)


def practitioner_to_fhir_reference(practitioner: PractitionerMappingSource) -> dict[str, Any]:
    """Build a deterministic practitioner reference for future clinical resources."""
    return _build_reference(
        "Practitioner",
        practitioner.id,
        PRACTITIONER_SOURCE_IDENTIFIER_SYSTEM,
    )


def patient_to_fhir_resource(patient: PatientMappingSource) -> dict[str, Any]:
    """Serialize a patient into the agreed minimal FHIR R5 shape."""
    resource: dict[str, Any] = {
        "resourceType": "Patient",
        "id": patient.id,
        "identifier": patient_fhir_identifiers(patient),
        "active": patient.active,
        "name": [
            {
                "use": "official",
                "family": patient.name_family,
                "given": [patient.name_given],
            }
        ],
        "birthDate": patient.birth_date.isoformat(),
    }

    if patient.gender:
        resource["gender"] = patient.gender

    telecom: list[dict[str, str]] = []
    if patient.telecom_phone:
        telecom.append(
            {"system": "phone", "value": patient.telecom_phone, "use": "mobile"}
        )
    if patient.telecom_email:
        telecom.append({"system": "email", "value": patient.telecom_email, "use": "home"})
    if telecom:
        resource["telecom"] = telecom

    return resource


def practitioner_to_fhir_resource(practitioner: PractitionerMappingSource) -> dict[str, Any]:
    """Serialize a practitioner into the agreed minimal FHIR R5 shape."""
    resource: dict[str, Any] = {
        "resourceType": "Practitioner",
        "id": practitioner.id,
        "identifier": practitioner_fhir_identifiers(practitioner),
        "active": practitioner.active,
        "name": [
            {
                "use": "official",
                "family": practitioner.name_family,
                "given": [practitioner.name_given],
            }
        ],
    }

    if practitioner.telecom_email:
        resource["telecom"] = [
            {"system": "email", "value": practitioner.telecom_email, "use": "work"}
        ]

    if practitioner.qualification_code:
        resource["qualification"] = [{"code": {"text": practitioner.qualification_code}}]

    return resource