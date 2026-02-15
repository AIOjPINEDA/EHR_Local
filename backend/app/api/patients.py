"""
ConsultaMed Backend - Patients Endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.auth import get_current_practitioner
from app.api.exceptions import raise_not_found, raise_bad_request
from app.models.practitioner import Practitioner
from app.services.patient_service import PatientService
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientListResponse,
    PatientSummary,
    AllergyCreate,
    AllergyResponse,
)

router = APIRouter()


@router.get("/", response_model=PatientListResponse)
async def list_patients(
    search: Optional[str] = Query(None, min_length=2, description="Search by name or DNI"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> PatientListResponse:
    """
    List patients with optional search.
    
    - Search by partial name or DNI (minimum 2 characters)
    - Paginated results
    """
    service = PatientService(db)
    patients, total = await service.search(search or "", limit, offset)

    encounter_stats = await service.get_encounter_stats([p.id for p in patients])

    items = []
    for patient in patients:
        encounter_count, last_encounter_at = encounter_stats.get(patient.id, (0, None))
        items.append(
            PatientSummary(
                id=patient.id,
                identifier_value=patient.identifier_value,
                name_given=patient.name_given,
                name_family=patient.name_family,
                birth_date=patient.birth_date,
                age=patient.age,
                gender=patient.gender,
                telecom_phone=patient.telecom_phone,
                has_allergies=patient.has_allergies,
                allergy_count=sum(
                    1 for allergy in patient.allergies if allergy.clinical_status == "active"
                ),
                encounter_count=encounter_count,
                last_encounter_at=last_encounter_at,
            )
        )
    
    return PatientListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> PatientResponse:
    """
    Get patient by ID.
    
    Returns full patient data including allergies and recent encounters.
    """
    service = PatientService(db)
    patient = await service.get_by_id(patient_id)

    if not patient:
        raise_not_found("Paciente")

    return PatientResponse.model_validate(patient)


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PatientResponse)
async def create_patient(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> PatientResponse:
    """
    Create new patient.
    
    Validates:
    - DNI format (Spanish DNI/NIE)
    - DNI uniqueness
    - Required fields
    """
    service = PatientService(db)
    
    try:
        patient = await service.create(patient_data.model_dump())
        return PatientResponse.model_validate(patient)
    except ValueError as e:
        raise_bad_request(str(e))


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> PatientResponse:
    """
    Update patient data.
    """
    service = PatientService(db)
    
    # Filter out None values
    update_data = {k: v for k, v in patient_data.model_dump().items() if v is not None}
    
    try:
        patient = await service.update(patient_id, update_data)
    except ValueError as e:
        raise_bad_request(str(e))

    if not patient:
        raise_not_found("Paciente")

    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}/allergies", response_model=list[AllergyResponse])
async def list_allergies(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> list[AllergyResponse]:
    """
    List patient allergies.
    """
    service = PatientService(db)
    patient = await service.get_by_id(patient_id)

    if not patient:
        raise_not_found("Paciente")

    return [AllergyResponse.model_validate(allergy) for allergy in patient.allergies]


@router.post("/{patient_id}/allergies", status_code=status.HTTP_201_CREATED, response_model=AllergyResponse)
async def add_allergy(
    patient_id: str,
    allergy_data: AllergyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> AllergyResponse:
    """
    Add allergy to patient.
    """
    service = PatientService(db)
    
    # Check patient exists
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise_not_found("Paciente")

    allergy = await service.add_allergy(patient_id, allergy_data.model_dump())
    return AllergyResponse.model_validate(allergy)


@router.delete("/{patient_id}/allergies/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_allergy(
    patient_id: str,
    allergy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
) -> None:
    """
    Remove allergy from patient.
    """
    service = PatientService(db)

    success = await service.remove_allergy(patient_id, allergy_id)

    if not success:
        raise_not_found("Alergia")
