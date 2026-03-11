"""Deterministic clinical mapping helpers for the initial HAPI subset export."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

from app.fhir.base_mapping import (
    PATIENT_SOURCE_IDENTIFIER_SYSTEM,
    PRACTITIONER_SOURCE_IDENTIFIER_SYSTEM,
)


ENCOUNTER_SOURCE_IDENTIFIER_SYSTEM = "urn:consultamed:source:encounter:id"
CONDITION_SOURCE_IDENTIFIER_SYSTEM = "urn:consultamed:source:condition:id"
MEDICATION_REQUEST_SOURCE_IDENTIFIER_SYSTEM = "urn:consultamed:source:medication-request:id"
ALLERGY_INTOLERANCE_SOURCE_IDENTIFIER_SYSTEM = "urn:consultamed:source:allergy-intolerance:id"
SOAP_EXTENSION_URL = "https://consultamed.es/fhir/StructureDefinition/encounter-soap-transitional"

LOCAL_TO_FHIR_ENCOUNTER_STATUS = {
    "planned": "planned",
    "in-progress": "in-progress",
    "on-hold": "on-hold",
    "discharged": "discharged",
    "finished": "completed",
    "cancelled": "cancelled",
    "completed": "completed",
    "discontinued": "discontinued",
    "entered-in-error": "entered-in-error",
    "unknown": "unknown",
}


class EncounterMappingSource(Protocol):
    """Attributes required to serialize an Encounter into the agreed FHIR shape."""

    id: str
    status: str
    class_code: str
    subject_id: str
    participant_id: str
    period_start: datetime
    period_end: datetime | None
    reason_text: str | None
    subjective_text: str | None
    objective_text: str | None
    assessment_text: str | None
    plan_text: str | None
    recommendations_text: str | None
    note: str | None


class ConditionMappingSource(Protocol):
    """Attributes required to serialize a Condition into the agreed FHIR shape."""

    id: str
    subject_id: str
    encounter_id: str
    code_text: str
    code_coding_code: str | None
    code_coding_system: str | None
    code_coding_display: str | None
    clinical_status: str
    recorded_date: datetime


class MedicationRequestMappingSource(Protocol):
    """Attributes required to serialize a MedicationRequest into the agreed FHIR shape."""

    id: str
    status: str
    intent: str
    subject_id: str
    encounter_id: str
    requester_id: str
    medication_text: str
    medication_code: str | None
    medication_system: str | None
    dosage_text: str
    dosage_timing_code: str | None
    duration_value: int | None
    duration_unit: str | None
    authored_on: datetime


class AllergyIntoleranceMappingSource(Protocol):
    """Attributes required to serialize an AllergyIntolerance into the agreed FHIR shape."""

    id: str
    patient_id: str
    clinical_status: str
    type: str | None
    category: str | None
    criticality: str | None
    code_text: str
    code_coding_code: str | None
    code_coding_system: str | None
    recorded_date: datetime


def _clean_text(value: str | None) -> str | None:
    """Trim optional text fields while keeping empty values out of the payload."""
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _format_fhir_datetime(value: datetime) -> str:
    """Serialize datetimes consistently for FHIR payloads."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _normalize_encounter_status(status: str) -> str:
    """Map local ConsultaMed encounter lifecycle values to valid FHIR R5 codes."""
    normalized = status.strip().lower()
    try:
        return LOCAL_TO_FHIR_ENCOUNTER_STATUS[normalized]
    except KeyError as exc:
        allowed_statuses = ", ".join(sorted(LOCAL_TO_FHIR_ENCOUNTER_STATUS))
        raise ValueError(
            f"Unsupported Encounter.status '{status}' for FHIR ETL. Allowed values: {allowed_statuses}."
        ) from exc


def _build_reference(resource_type: str, source_id: str, identifier_system: str) -> dict[str, Any]:
    """Build a deterministic FHIR reference with source-traceable identifier data."""
    return {
        "reference": f"{resource_type}/{source_id}",
        "type": resource_type,
        "identifier": {"system": identifier_system, "value": source_id},
    }


def _build_source_identifier(identifier_system: str, source_id: str) -> dict[str, str]:
    """Return the source-traceable identifier for a FHIR resource."""
    return {"system": identifier_system, "value": source_id}


def encounter_to_fhir_reference(encounter: EncounterMappingSource) -> dict[str, Any]:
    """Build a deterministic encounter reference for related clinical resources."""
    return _build_reference("Encounter", encounter.id, ENCOUNTER_SOURCE_IDENTIFIER_SYSTEM)


def build_encounter_soap_extension(encounter: EncounterMappingSource) -> dict[str, Any] | None:
    """Serialize the transitional SOAP representation agreed for the initial ETL."""
    sections = [
        ("subjective", _clean_text(encounter.subjective_text)),
        ("objective", _clean_text(encounter.objective_text)),
        ("assessment", _clean_text(encounter.assessment_text)),
        ("plan", _clean_text(encounter.plan_text)),
        ("recommendations", _clean_text(encounter.recommendations_text)),
        ("legacy-note", _clean_text(encounter.note)),
    ]
    values = [{"url": name, "valueString": value} for name, value in sections if value]
    if not values:
        return None
    return {"url": SOAP_EXTENSION_URL, "extension": values}


def encounter_to_fhir_resource(encounter: EncounterMappingSource) -> dict[str, Any]:
    """Serialize an Encounter into the agreed minimal FHIR R5 shape."""
    resource: dict[str, Any] = {
        "resourceType": "Encounter",
        "id": encounter.id,
        "identifier": [
            _build_source_identifier(ENCOUNTER_SOURCE_IDENTIFIER_SYSTEM, encounter.id),
        ],
        "status": _normalize_encounter_status(encounter.status),
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": encounter.class_code,
        },
        "subject": _build_reference("Patient", encounter.subject_id, PATIENT_SOURCE_IDENTIFIER_SYSTEM),
        "participant": [
            {
                "actor": _build_reference(
                    "Practitioner",
                    encounter.participant_id,
                    PRACTITIONER_SOURCE_IDENTIFIER_SYSTEM,
                )
            }
        ],
        "period": {"start": _format_fhir_datetime(encounter.period_start)},
    }

    if encounter.period_end:
        resource["period"]["end"] = _format_fhir_datetime(encounter.period_end)

    reason_text = _clean_text(encounter.reason_text)
    if reason_text:
        resource["reason"] = [{"concept": {"text": reason_text}}]

    soap_extension = build_encounter_soap_extension(encounter)
    if soap_extension:
        resource["extension"] = [soap_extension]

    return resource


def condition_to_fhir_resource(condition: ConditionMappingSource) -> dict[str, Any]:
    """Serialize a Condition into the agreed minimal FHIR R5 shape."""
    code: dict[str, Any] = {"text": condition.code_text}
    if condition.code_coding_code:
        coding = {
            "system": condition.code_coding_system or "http://hl7.org/fhir/sid/icd-10",
            "code": condition.code_coding_code,
        }
        if condition.code_coding_display:
            coding["display"] = condition.code_coding_display
        code["coding"] = [coding]

    return {
        "resourceType": "Condition",
        "id": condition.id,
        "identifier": [
            _build_source_identifier(CONDITION_SOURCE_IDENTIFIER_SYSTEM, condition.id),
        ],
        "clinicalStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": condition.clinical_status,
                }
            ]
        },
        "code": code,
        "subject": _build_reference("Patient", condition.subject_id, PATIENT_SOURCE_IDENTIFIER_SYSTEM),
        "encounter": _build_reference(
            "Encounter",
            condition.encounter_id,
            ENCOUNTER_SOURCE_IDENTIFIER_SYSTEM,
        ),
        "recordedDate": _format_fhir_datetime(condition.recorded_date),
    }


def medication_request_to_fhir_resource(
    medication_request: MedicationRequestMappingSource,
) -> dict[str, Any]:
    """Serialize a MedicationRequest into the agreed minimal FHIR R5 shape."""
    concept: dict[str, Any] = {"text": medication_request.medication_text}
    if medication_request.medication_code:
        concept["coding"] = [
            {
                "system": medication_request.medication_system or "http://snomed.info/sct",
                "code": medication_request.medication_code,
            }
        ]

    dosage_instruction: dict[str, Any] = {"text": medication_request.dosage_text}
    if medication_request.dosage_timing_code or (
        medication_request.duration_value and medication_request.duration_unit
    ):
        timing: dict[str, Any] = {}
        if medication_request.dosage_timing_code:
            timing["code"] = {"text": medication_request.dosage_timing_code}
        if medication_request.duration_value and medication_request.duration_unit:
            timing["repeat"] = {
                "boundsDuration": {
                    "value": medication_request.duration_value,
                    "unit": medication_request.duration_unit,
                    "system": "http://unitsofmeasure.org",
                    "code": medication_request.duration_unit,
                }
            }
        dosage_instruction["timing"] = timing

    return {
        "resourceType": "MedicationRequest",
        "id": medication_request.id,
        "identifier": [
            _build_source_identifier(
                MEDICATION_REQUEST_SOURCE_IDENTIFIER_SYSTEM,
                medication_request.id,
            ),
        ],
        "status": medication_request.status,
        "intent": medication_request.intent,
        "subject": _build_reference(
            "Patient",
            medication_request.subject_id,
            PATIENT_SOURCE_IDENTIFIER_SYSTEM,
        ),
        "encounter": _build_reference(
            "Encounter",
            medication_request.encounter_id,
            ENCOUNTER_SOURCE_IDENTIFIER_SYSTEM,
        ),
        "requester": _build_reference(
            "Practitioner",
            medication_request.requester_id,
            PRACTITIONER_SOURCE_IDENTIFIER_SYSTEM,
        ),
        "authoredOn": _format_fhir_datetime(medication_request.authored_on),
        "medication": {"concept": concept},
        "dosageInstruction": [dosage_instruction],
    }


def allergy_intolerance_to_fhir_resource(
    allergy: AllergyIntoleranceMappingSource,
) -> dict[str, Any]:
    """Serialize an AllergyIntolerance into the agreed minimal FHIR R5 shape."""
    code: dict[str, Any] = {"text": allergy.code_text}
    if allergy.code_coding_code:
        code["coding"] = [
            {
                "system": allergy.code_coding_system or "http://snomed.info/sct",
                "code": allergy.code_coding_code,
            }
        ]

    resource: dict[str, Any] = {
        "resourceType": "AllergyIntolerance",
        "id": allergy.id,
        "identifier": [
            _build_source_identifier(
                ALLERGY_INTOLERANCE_SOURCE_IDENTIFIER_SYSTEM,
                allergy.id,
            ),
        ],
        "clinicalStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    "code": allergy.clinical_status,
                }
            ]
        },
        "patient": _build_reference("Patient", allergy.patient_id, PATIENT_SOURCE_IDENTIFIER_SYSTEM),
        "code": code,
        "recordedDate": _format_fhir_datetime(allergy.recorded_date),
    }

    if allergy.type:
        resource["type"] = allergy.type
    if allergy.category:
        resource["category"] = [allergy.category]
    if allergy.criticality:
        resource["criticality"] = allergy.criticality

    return resource