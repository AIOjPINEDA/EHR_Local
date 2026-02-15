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

# ✅ Usar schemas atómicos FHIR-compatible
from app.schemas.encounter import (
    EncounterCreate,
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
) -> Optional[str]:
    """
    Keep `note` backward-compatible when frontend sends structured SOAP fields.
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
    return "\n".join(lines) if lines else None


async def _ensure_patient_exists(db: AsyncSession, patient_id: str) -> None:
    """Verifica que el paciente exista antes de operar sobre sus consultas."""
    patient_stmt = select(Patient.id).where(Patient.id == patient_id)
    patient_result = await db.execute(patient_stmt)
    if patient_result.scalar_one_or_none() is None:
        raise_not_found("Paciente")


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
    Create new encounter for patient.
    
    Creates:
    - Encounter record
    - Condition(s) for diagnoses
    - MedicationRequest(s) for prescriptions
    """
    await _ensure_patient_exists(db, patient_id)
    
    # Create encounter
    reason_text = _clean_text(encounter_data.reason_text)
    subjective_text = _clean_text(encounter_data.subjective_text)
    objective_text = _clean_text(encounter_data.objective_text)
    assessment_text = _clean_text(encounter_data.assessment_text)
    plan_text = _clean_text(encounter_data.plan_text)
    recommendations_text = _clean_text(encounter_data.recommendations_text)
    note = _build_legacy_note(
        note=encounter_data.note,
        subjective_text=subjective_text,
        objective_text=objective_text,
        assessment_text=assessment_text,
        plan_text=plan_text,
        recommendations_text=recommendations_text,
    )

    encounter = Encounter(
        subject_id=patient_id,
        participant_id=current_user.id,
        reason_text=reason_text,
        subjective_text=subjective_text,
        objective_text=objective_text,
        assessment_text=assessment_text,
        plan_text=plan_text,
        recommendations_text=recommendations_text,
        note=note,
        status="finished",
    )
    db.add(encounter)
    await db.flush()  # Get encounter.id
    
    # Create conditions
    for cond_data in encounter_data.conditions:
        condition = Condition(
            subject_id=patient_id,
            encounter_id=encounter.id,
            code_text=cond_data.code_text,
            code_coding_code=cond_data.code_coding_code,
        )
        db.add(condition)
    
    # Create medications
    for med_data in encounter_data.medications:
        medication = MedicationRequest(
            subject_id=patient_id,
            encounter_id=encounter.id,
            requester_id=current_user.id,
            medication_text=med_data.medication_text,
            dosage_text=med_data.dosage_text,
            duration_value=med_data.duration_value,
            duration_unit=med_data.duration_unit,
        )
        db.add(medication)
    
    await db.commit()
    
    # Reload with relationships
    stmt = (
        select(Encounter)
        .options(
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter.id)
    )
    result = await db.execute(stmt)
    return cast(EncounterResponse, result.scalar_one())
