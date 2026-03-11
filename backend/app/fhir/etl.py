"""Executable ETL helpers for the initial one-way HAPI subset load."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request

from sqlalchemy import select

from app.database import async_session_maker
from app.fhir.base_mapping import patient_to_fhir_resource, practitioner_to_fhir_resource
from app.fhir.clinical_mapping import (
    allergy_intolerance_to_fhir_resource,
    condition_to_fhir_resource,
    encounter_to_fhir_resource,
    medication_request_to_fhir_resource,
)
from app.models import (
    AllergyIntolerance,
    Condition,
    Encounter,
    MedicationRequest,
    Patient,
    Practitioner,
)


DEFAULT_HAPI_BASE_URL = "http://localhost:8090/fhir"
DEFAULT_ETL_API_KEY = "consultamed-local-etl"
ETL_API_KEY_HEADER = "X-Consultamed-ETL-Key"
RESOURCE_TYPE_ORDER = (
    "Patient",
    "Practitioner",
    "Encounter",
    "Condition",
    "MedicationRequest",
    "AllergyIntolerance",
)
RESOURCE_DELETE_ORDER = tuple(reversed(RESOURCE_TYPE_ORDER))
SEARCH_PAGE_SIZE = 200


@dataclass(slots=True)
class ClinicalSubsetSnapshot:
    """Source snapshot required to execute the initial FHIR ETL."""

    patients: list[Patient]
    practitioners: list[Practitioner]
    encounters: list[Encounter]
    conditions: list[Condition]
    medication_requests: list[MedicationRequest]
    allergies: list[AllergyIntolerance]


@dataclass(slots=True)
class LoadBatch:
    """One ordered batch of FHIR resources for PUT upserts."""

    resource_type: str
    resources: list[dict[str, Any]]


@dataclass(slots=True)
class LoadReport:
    """Operational summary returned after the ETL completes."""

    source_counts: dict[str, int]
    target_counts: dict[str, int]
    sample_ids: dict[str, str]


def _normalize_base_url(base_url: str | None) -> str:
    """Resolve the HAPI base URL from explicit input or environment."""
    value = (base_url or os.getenv("CONSULTAMED_HAPI_BASE_URL") or DEFAULT_HAPI_BASE_URL).strip()
    return value.rstrip("/")


def _resolve_api_key(api_key: str | None) -> str:
    """Resolve the internal ETL API key shared with the sidecar interceptor."""
    return (api_key or os.getenv("CONSULTAMED_ETL_API_KEY") or DEFAULT_ETL_API_KEY).strip()


def _json_request(
    url: str,
    *,
    method: str,
    api_key: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Perform a JSON request against the local HAPI sidecar."""
    headers = {
        "Accept": "application/fhir+json",
        ETL_API_KEY_HEADER: api_key,
    }
    data: bytes | None = None
    if payload is not None:
        headers["Content-Type"] = "application/fhir+json"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
    except error.HTTPError as exc:  # pragma: no cover - exercised in integration only
        raise RuntimeError(f"HAPI request failed with HTTP {exc.code} for {method} {url}") from exc
    except error.URLError as exc:  # pragma: no cover - exercised in integration only
        raise RuntimeError(f"HAPI sidecar is unreachable for {method} {url}: {exc.reason}") from exc

    if not body:
        return {}
    return json.loads(body)


def build_load_plan(snapshot: ClinicalSubsetSnapshot) -> list[LoadBatch]:
    """Convert the source snapshot into the deterministic FHIR load order."""
    return [
        LoadBatch("Patient", [patient_to_fhir_resource(patient) for patient in snapshot.patients]),
        LoadBatch(
            "Practitioner",
            [
                practitioner_to_fhir_resource(practitioner)
                for practitioner in snapshot.practitioners
            ],
        ),
        LoadBatch(
            "Encounter",
            [encounter_to_fhir_resource(encounter) for encounter in snapshot.encounters],
        ),
        LoadBatch(
            "Condition",
            [condition_to_fhir_resource(condition) for condition in snapshot.conditions],
        ),
        LoadBatch(
            "MedicationRequest",
            [
                medication_request_to_fhir_resource(medication_request)
                for medication_request in snapshot.medication_requests
            ],
        ),
        LoadBatch(
            "AllergyIntolerance",
            [allergy_intolerance_to_fhir_resource(allergy) for allergy in snapshot.allergies],
        ),
    ]


def validate_snapshot_references(snapshot: ClinicalSubsetSnapshot) -> None:
    """Fail fast if the operational snapshot contains broken references."""
    patient_ids = {patient.id for patient in snapshot.patients}
    practitioner_ids = {practitioner.id for practitioner in snapshot.practitioners}
    encounter_ids = {encounter.id for encounter in snapshot.encounters}

    for encounter in snapshot.encounters:
        if encounter.subject_id not in patient_ids:
            raise ValueError(
                f"Encounter {encounter.id} references missing Patient {encounter.subject_id}"
            )
        if encounter.participant_id not in practitioner_ids:
            raise ValueError(
                f"Encounter {encounter.id} references missing Practitioner {encounter.participant_id}"
            )

    for condition in snapshot.conditions:
        if condition.subject_id not in patient_ids:
            raise ValueError(
                f"Condition {condition.id} references missing Patient {condition.subject_id}"
            )
        if condition.encounter_id not in encounter_ids:
            raise ValueError(
                f"Condition {condition.id} references missing Encounter {condition.encounter_id}"
            )

    for medication_request in snapshot.medication_requests:
        if medication_request.subject_id not in patient_ids:
            raise ValueError(
                f"MedicationRequest {medication_request.id} references missing Patient "
                f"{medication_request.subject_id}"
            )
        if medication_request.encounter_id not in encounter_ids:
            raise ValueError(
                f"MedicationRequest {medication_request.id} references missing Encounter "
                f"{medication_request.encounter_id}"
            )
        if medication_request.requester_id not in practitioner_ids:
            raise ValueError(
                f"MedicationRequest {medication_request.id} references missing Practitioner "
                f"{medication_request.requester_id}"
            )

    for allergy in snapshot.allergies:
        if allergy.patient_id not in patient_ids:
            raise ValueError(
                f"AllergyIntolerance {allergy.id} references missing Patient {allergy.patient_id}"
            )


def _source_counts(snapshot: ClinicalSubsetSnapshot) -> dict[str, int]:
    """Return source counts using the agreed resource order."""
    return {
        "Patient": len(snapshot.patients),
        "Practitioner": len(snapshot.practitioners),
        "Encounter": len(snapshot.encounters),
        "Condition": len(snapshot.conditions),
        "MedicationRequest": len(snapshot.medication_requests),
        "AllergyIntolerance": len(snapshot.allergies),
    }


def _source_ids(snapshot: ClinicalSubsetSnapshot) -> dict[str, set[str]]:
    """Expose the current source ids per resource type for reconciliation."""
    return {
        "Patient": {patient.id for patient in snapshot.patients},
        "Practitioner": {practitioner.id for practitioner in snapshot.practitioners},
        "Encounter": {encounter.id for encounter in snapshot.encounters},
        "Condition": {condition.id for condition in snapshot.conditions},
        "MedicationRequest": {
            medication_request.id for medication_request in snapshot.medication_requests
        },
        "AllergyIntolerance": {allergy.id for allergy in snapshot.allergies},
    }


def _first_ids(snapshot: ClinicalSubsetSnapshot) -> dict[str, str]:
    """Expose one deterministic sample id per resource type for manual follow-up."""
    sample_ids: dict[str, str] = {}
    if snapshot.patients:
        sample_ids["Patient"] = snapshot.patients[0].id
    if snapshot.practitioners:
        sample_ids["Practitioner"] = snapshot.practitioners[0].id
    if snapshot.encounters:
        sample_ids["Encounter"] = snapshot.encounters[0].id
    if snapshot.conditions:
        sample_ids["Condition"] = snapshot.conditions[0].id
    if snapshot.medication_requests:
        sample_ids["MedicationRequest"] = snapshot.medication_requests[0].id
    if snapshot.allergies:
        sample_ids["AllergyIntolerance"] = snapshot.allergies[0].id
    return sample_ids


def _fetch_resource_count(base_url: str, resource_type: str, api_key: str) -> int:
    """Read the current HAPI count for one resource type."""
    url = f"{base_url}/{resource_type}?{parse.urlencode({'_summary': 'count'})}"
    response = _json_request(url, method="GET", api_key=api_key)
    return int(response.get("total", 0) or 0)


def _fetch_resource(
    base_url: str, resource_type: str, resource_id: str, api_key: str
) -> dict[str, Any]:
    """Fetch a single FHIR resource for post-load verification."""
    return _json_request(f"{base_url}/{resource_type}/{resource_id}", method="GET", api_key=api_key)


def _fetch_resource_ids(base_url: str, resource_type: str, api_key: str) -> list[str]:
    """List current HAPI ids for one resource type, following Bundle pagination if needed."""
    next_url = (
        f"{base_url}/{resource_type}?"
        f"{parse.urlencode({'_elements': 'id', '_count': SEARCH_PAGE_SIZE})}"
    )
    seen_urls: set[str] = set()
    resource_ids: list[str] = []

    while next_url and next_url not in seen_urls:
        seen_urls.add(next_url)
        bundle = _json_request(next_url, method="GET", api_key=api_key)
        for entry in bundle.get("entry", []):
            resource = entry.get("resource") or {}
            resource_id = resource.get("id")
            if resource_id:
                resource_ids.append(str(resource_id))

        next_url = None
        for link in bundle.get("link", []):
            if link.get("relation") == "next" and link.get("url"):
                next_url = str(link["url"])
                break

    return resource_ids


def _reconcile_stale_resources(
    snapshot: ClinicalSubsetSnapshot, base_url: str, api_key: str
) -> None:
    """Delete stale target resources in reverse dependency order so reloads converge without reset."""
    source_ids = _source_ids(snapshot)

    for resource_type in RESOURCE_DELETE_ORDER:
        stale_ids = sorted(
            set(_fetch_resource_ids(base_url, resource_type, api_key)) - source_ids[resource_type]
        )
        for resource_id in stale_ids:
            _json_request(
                f"{base_url}/{resource_type}/{resource_id}",
                method="DELETE",
                api_key=api_key,
            )


def _verify_sample_resources(snapshot: ClinicalSubsetSnapshot, base_url: str, api_key: str) -> None:
    """Check a small sample of loaded resources for reference integrity."""
    if snapshot.encounters:
        expected = encounter_to_fhir_resource(snapshot.encounters[0])
        actual = _fetch_resource(base_url, "Encounter", snapshot.encounters[0].id, api_key)
        assert actual["subject"]["reference"] == expected["subject"]["reference"]
        assert (
            actual["participant"][0]["actor"]["reference"]
            == expected["participant"][0]["actor"]["reference"]
        )

    if snapshot.conditions:
        expected = condition_to_fhir_resource(snapshot.conditions[0])
        actual = _fetch_resource(base_url, "Condition", snapshot.conditions[0].id, api_key)
        assert actual["subject"]["reference"] == expected["subject"]["reference"]
        assert actual["encounter"]["reference"] == expected["encounter"]["reference"]

    if snapshot.medication_requests:
        expected = medication_request_to_fhir_resource(snapshot.medication_requests[0])
        actual = _fetch_resource(
            base_url,
            "MedicationRequest",
            snapshot.medication_requests[0].id,
            api_key,
        )
        assert actual["subject"]["reference"] == expected["subject"]["reference"]
        assert actual["encounter"]["reference"] == expected["encounter"]["reference"]
        assert actual["requester"]["reference"] == expected["requester"]["reference"]

    if snapshot.allergies:
        expected = allergy_intolerance_to_fhir_resource(snapshot.allergies[0])
        actual = _fetch_resource(
            base_url,
            "AllergyIntolerance",
            snapshot.allergies[0].id,
            api_key,
        )
        assert actual["patient"]["reference"] == expected["patient"]["reference"]


async def load_source_snapshot() -> ClinicalSubsetSnapshot:
    """Read the operational dataset needed for the initial HAPI load."""
    async with async_session_maker() as session:
        patients = list(
            (await session.execute(select(Patient).order_by(Patient.id))).scalars().all()
        )
        practitioners = list(
            (await session.execute(select(Practitioner).order_by(Practitioner.id))).scalars().all()
        )
        encounters = list(
            (
                await session.execute(
                    select(Encounter).order_by(Encounter.period_start, Encounter.id)
                )
            )
            .scalars()
            .all()
        )
        conditions = list(
            (
                await session.execute(
                    select(Condition).order_by(Condition.recorded_date, Condition.id)
                )
            )
            .scalars()
            .all()
        )
        medication_requests = list(
            (
                await session.execute(
                    select(MedicationRequest).order_by(
                        MedicationRequest.authored_on,
                        MedicationRequest.id,
                    )
                )
            )
            .scalars()
            .all()
        )
        allergies = list(
            (
                await session.execute(
                    select(AllergyIntolerance).order_by(
                        AllergyIntolerance.recorded_date,
                        AllergyIntolerance.id,
                    )
                )
            )
            .scalars()
            .all()
        )

    return ClinicalSubsetSnapshot(
        patients=patients,
        practitioners=practitioners,
        encounters=encounters,
        conditions=conditions,
        medication_requests=medication_requests,
        allergies=allergies,
    )


async def run_clinical_subset_etl(
    *,
    base_url: str | None = None,
    api_key: str | None = None,
) -> LoadReport:
    """Execute the deterministic one-way ETL into the local HAPI sidecar."""
    resolved_base_url = _normalize_base_url(base_url)
    resolved_api_key = _resolve_api_key(api_key)
    snapshot = await load_source_snapshot()
    validate_snapshot_references(snapshot)
    source_counts = _source_counts(snapshot)

    _reconcile_stale_resources(snapshot, resolved_base_url, resolved_api_key)

    for batch in build_load_plan(snapshot):
        for resource in batch.resources:
            resource_type = resource["resourceType"]
            resource_id = resource["id"]
            _json_request(
                f"{resolved_base_url}/{resource_type}/{resource_id}",
                method="PUT",
                api_key=resolved_api_key,
                payload=resource,
            )

    target_counts = {
        resource_type: _fetch_resource_count(resolved_base_url, resource_type, resolved_api_key)
        for resource_type in source_counts
    }

    mismatches = [
        resource_type
        for resource_type, source_count in source_counts.items()
        if target_counts.get(resource_type) != source_count
    ]
    if mismatches:
        mismatch_summary = ", ".join(
            f"{resource_type} source={source_counts[resource_type]} target={target_counts[resource_type]}"
            for resource_type in mismatches
        )
        raise RuntimeError(f"HAPI counts diverged after load: {mismatch_summary}")

    _verify_sample_resources(snapshot, resolved_base_url, resolved_api_key)
    return LoadReport(
        source_counts=source_counts,
        target_counts=target_counts,
        sample_ids=_first_ids(snapshot),
    )
