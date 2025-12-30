"""
ConsultaMed Backend - Patients Endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.auth import get_current_practitioner
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
):
    """
    List patients with optional search.
    
    - Search by partial name or DNI (minimum 2 characters)
    - Paginated results
    """
    service = PatientService(db)
    
    if search:
        patients, total = await service.search(search, limit, offset)
    else:
        patients, total = await service.search("", limit, offset)
    
    # Convert to response format
    items = []
    for p in patients:
        items.append(PatientSummary(
            id=p.id,
            identifier_value=p.identifier_value,
            name_given=p.name_given,
            name_family=p.name_family,
            birth_date=p.birth_date,
            age=p.age,
            gender=p.gender,
            telecom_phone=p.telecom_phone,
            has_allergies=p.has_allergies,
            allergy_count=len([a for a in p.allergies if a.clinical_status == "active"]),
        ))
    
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
):
    """
    Get patient by ID.
    
    Returns full patient data including allergies and recent encounters.
    """
    service = PatientService(db)
    patient = await service.get_by_id(patient_id)
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    return patient


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PatientResponse)
async def create_patient(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
):
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
        return patient
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
):
    """
    Update patient data.
    """
    service = PatientService(db)
    
    # Filter out None values
    update_data = {k: v for k, v in patient_data.model_dump().items() if v is not None}
    
    patient = await service.update(patient_id, update_data)
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    return patient


@router.get("/{patient_id}/allergies", response_model=list[AllergyResponse])
async def list_allergies(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
):
    """
    List patient allergies.
    """
    service = PatientService(db)
    patient = await service.get_by_id(patient_id)
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    return patient.allergies


@router.post("/{patient_id}/allergies", status_code=status.HTTP_201_CREATED, response_model=AllergyResponse)
async def add_allergy(
    patient_id: str,
    allergy_data: AllergyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
):
    """
    Add allergy to patient.
    """
    service = PatientService(db)
    
    # Check patient exists
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    allergy = await service.add_allergy(patient_id, allergy_data.model_dump())
    return allergy


@router.delete("/{patient_id}/allergies/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_allergy(
    patient_id: str,
    allergy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Practitioner = Depends(get_current_practitioner),
):
    """
    Remove allergy from patient.
    """
    service = PatientService(db)
    
    success = await service.remove_allergy(patient_id, allergy_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alergia no encontrada"
        )
