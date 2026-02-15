"""
ConsultaMed Backend - Encounters Endpoints
"""
from typing import Optional, List, cast
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.auth import get_current_practitioner
from app.api.exceptions import raise_not_found
from app.models.practitioner import Practitioner
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.condition import Condition
from app.models.medication_request import MedicationRequest

# Schemas atómicos FHIR-compatible
from app.schemas.encounter import (
    EncounterCreate,
    EncounterUpdate,
    EncounterResponse,
    EncounterListResponse,
)

router = APIRouter()


# ============================================
# Helper Functions
# ============================================


def _clean_text(value: Optional[str]) -> Optional[str]:
    """Normalize optional free-text fields."""
    if value is None:
        return None
    text = value.strip()
    return text or None


def _build_legacy_note(
    note: Optional[str],
    subjective_text: Optional[str],
    objective_text: Optional[str],
    assessment_text: Optional[str],
    plan_text: Optional[str],
    recommendations_text: Optional[str],
    existing_note: Optional[str] = None,
) -> Optional[str]:
    """
    Keep `note` backward-compatible when frontend sends structured SOAP fields.

    Prioridad:
      1. Nota explícita enviada por el cliente.
      2. Síntesis de campos SOAP (si al menos uno tiene contenido).
      3. Nota existente preservada (para no perder datos legacy durante edición).
    """
    explicit_note = _clean_text(note)
    if explicit_note:
        return explicit_note

    sections = [
        ("Subjetivo", _clean_text(subjective_text)),
        ("Objetivo", _clean_text(objective_text)),
        ("Análisis", _clean_text(assessment_text)),
        ("Plan", _clean_text(plan_text)),
        ("Recomendaciones", _clean_text(recommendations_text)),
    ]
    lines = [f"{title}: {content}" for title, content in sections if content]
    if lines:
        return "\n".join(lines)

    # Preservar nota legacy existente si no hay datos nuevos
    return existing_note


async def _ensure_patient_exists(db: AsyncSession, patient_id: str) -> None:
    """Verifica que el paciente exista antes de operar sobre sus consultas."""
    patient_stmt = select(Patient.id).where(Patient.id == patient_id)
    patient_result = await db.execute(patient_stmt)
    if patient_result.scalar_one_or_none() is None:
        raise_not_found("Paciente")


def _apply_soap_fields(
    encounter: Encounter,
    data: EncounterCreate | EncounterUpdate,
) -> None:
    """Aplica campos SOAP y nota legacy a un Encounter."""
    # Capturar nota existente ANTES de sobreescribir campos
    existing_note = encounter.note

    encounter.reason_text = _clean_text(data.reason_text)
    encounter.subjective_text = _clean_text(data.subjective_text)
    encounter.objective_text = _clean_text(data.objective_text)
    encounter.assessment_text = _clean_text(data.assessment_text)
    encounter.plan_text = _clean_text(data.plan_text)
    encounter.recommendations_text = _clean_text(data.recommendations_text)
    encounter.note = _build_legacy_note(
        note=data.note,
        subjective_text=encounter.subjective_text,
        objective_text=encounter.objective_text,
        assessment_text=encounter.assessment_text,
        plan_text=encounter.plan_text,
        recommendations_text=encounter.recommendations_text,
        existing_note=existing_note,
    )


def _create_conditions(
    db: AsyncSession,
    data: EncounterCreate | EncounterUpdate,
    *,
    subject_id: str,
    encounter_id: str,
) -> None:
    """Crea recursos Condition vinculados a un Encounter."""
    for cond_data in data.conditions:
        db.add(Condition(
            subject_id=subject_id,
            encounter_id=encounter_id,
            code_text=cond_data.code_text,
            code_coding_code=cond_data.code_coding_code,
        ))


def _create_medications(
    db: AsyncSession,
    data: EncounterCreate | EncounterUpdate,
    *,
    subject_id: str,
    encounter_id: str,
    requester_id: str,
) -> None:
    """Crea recursos MedicationRequest vinculados a un Encounter."""
    for med_data in data.medications:
        db.add(MedicationRequest(
            subject_id=subject_id,
            encounter_id=encounter_id,
            requester_id=requester_id,
            medication_text=med_data.medication_text,
            dosage_text=med_data.dosage_text,
            duration_value=med_data.duration_value,
            duration_unit=med_data.duration_unit,
        ))


async def _reload_encounter(db: AsyncSession, encounter_id: str) -> Encounter:
    """Recarga un Encounter con sus relaciones (conditions, medications)."""
    stmt = (
        select(Encounter)
        .options(
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ============================================
# Endpoints
# ============================================

@router.get("/patient/{patient_id}", response_model=EncounterListResponse)
async def list_patient_encounters(
    patient_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> EncounterListResponse:
    """
    List all encounters for a patient.
    
    Returns encounters with conditions and medications.
    """
    await _ensure_patient_exists(db, patient_id)
    
    # Get encounters with related data
    stmt = (
        select(Encounter)
        .options(
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.subject_id == patient_id)
        .order_by(Encounter.period_start.desc())
        .limit(limit)
        .offset(offset)
    )
    
    result = await db.execute(stmt)
    encounters = result.scalars().all()
    
    # Get total count
    count_stmt = select(func.count(Encounter.id)).where(Encounter.subject_id == patient_id)
    count_result = await db.execute(count_stmt)
    total = int(count_result.scalar_one() or 0)
    
    return EncounterListResponse(
        items=cast(List[EncounterResponse], list(encounters)),
        total=total,
    )


@router.get("/{encounter_id}", response_model=EncounterResponse)
async def get_encounter(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> EncounterResponse:
    """
    Get encounter by ID with full details.
    """
    stmt = (
        select(Encounter)
        .options(
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter_id)
    )
    
    result = await db.execute(stmt)
    encounter = result.scalar_one_or_none()

    if not encounter:
        raise_not_found("Consulta")

    return cast(EncounterResponse, encounter)


@router.post("/patient/{patient_id}", status_code=status.HTTP_201_CREATED, response_model=EncounterResponse)
async def create_encounter(
    patient_id: str,
    encounter_data: EncounterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> EncounterResponse:
    """
    Create new encounter for patient (FHIR Create interaction).

    Creates Encounter + Condition(s) + MedicationRequest(s).
    """
    await _ensure_patient_exists(db, patient_id)

    encounter = Encounter(
        subject_id=patient_id,
        participant_id=current_user.id,
        status="finished",
    )
    _apply_soap_fields(encounter, encounter_data)
    db.add(encounter)
    await db.flush()  # Obtener encounter.id

    _create_conditions(db, encounter_data, subject_id=patient_id, encounter_id=encounter.id)
    _create_medications(
        db, encounter_data,
        subject_id=patient_id, encounter_id=encounter.id, requester_id=current_user.id,
    )

    await db.commit()
    return cast(EncounterResponse, await _reload_encounter(db, encounter.id))


@router.put("/{encounter_id}", response_model=EncounterResponse)
async def update_encounter(
    encounter_id: str,
    encounter_data: EncounterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> EncounterResponse:
    """
    Update an existing encounter (FHIR R5 Update interaction).

    Reemplaza campos SOAP y sub-recursos (Conditions, Medications)
    mediante estrategia delete + recreate.
    """
    # 1. Fetch con relaciones
    stmt = (
        select(Encounter)
        .options(
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter_id)
    )
    result = await db.execute(stmt)
    encounter = result.scalar_one_or_none()
    if not encounter:
        raise_not_found("Consulta")

    # 2. Actualizar campos SOAP
    _apply_soap_fields(encounter, encounter_data)

    # 3. Reemplazar Conditions (delete + recreate)
    for cond in list(encounter.conditions):
        await db.delete(cond)
    await db.flush()
    _create_conditions(
        db, encounter_data,
        subject_id=encounter.subject_id, encounter_id=encounter.id,
    )

    # 4. Reemplazar Medications (delete + recreate)
    for med in list(encounter.medications):
        await db.delete(med)
    await db.flush()
    _create_medications(
        db, encounter_data,
        subject_id=encounter.subject_id, encounter_id=encounter.id,
        requester_id=current_user.id,
    )

    # 5. Commit & reload
    await db.commit()
    return cast(EncounterResponse, await _reload_encounter(db, encounter.id))
