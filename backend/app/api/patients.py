"""
ConsultaMed Backend - Patients Endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()


@router.get("/")
async def list_patients(
    search: Optional[str] = Query(None, min_length=2, description="Search by name or DNI"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List patients with optional search.
    
    - Search by partial name or DNI (minimum 2 characters)
    - Paginated results
    """
    # TODO: Implement patient search with PatientService
    return {
        "items": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """
    Get patient by ID.
    
    Returns full patient data including allergies and recent encounters.
    """
    # TODO: Implement with PatientService
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Patient not found"
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_patient():
    """
    Create new patient.
    
    Validates:
    - DNI format (Spanish DNI/NIE)
    - DNI uniqueness
    - Required fields
    """
    # TODO: Implement with PatientService and DNI validator
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.put("/{patient_id}")
async def update_patient(patient_id: str):
    """
    Update patient data.
    """
    # TODO: Implement
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.post("/{patient_id}/allergies", status_code=status.HTTP_201_CREATED)
async def add_allergy(patient_id: str):
    """
    Add allergy to patient.
    """
    # TODO: Implement
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.delete("/{patient_id}/allergies/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_allergy(patient_id: str, allergy_id: str):
    """
    Remove allergy from patient.
    """
    # TODO: Implement
    pass
