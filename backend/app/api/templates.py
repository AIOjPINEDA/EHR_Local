"""
ConsultaMed Backend - Templates Endpoints
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.database import get_db
from app.api.auth import get_current_practitioner
from app.models.template import TreatmentTemplate
from app.models.practitioner import Practitioner

router = APIRouter()


# ============================================
# Schemas
# ============================================

class MedicationItem(BaseModel):
    medication: str
    dosage: str
    duration: str


class TemplateResponse(BaseModel):
    id: str
    name: str
    diagnosis_text: str
    diagnosis_code: Optional[str] = None
    medications: List[MedicationItem]
    instructions: Optional[str] = None
    is_favorite: bool
    is_global: bool = False  # True si es template del sistema


class TemplateListResponse(BaseModel):
    items: List[TemplateResponse]
    total: int


class TemplateCreate(BaseModel):
    name: str
    diagnosis_text: str
    diagnosis_code: Optional[str] = None
    medications: List[MedicationItem]
    instructions: Optional[str] = None
    is_favorite: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    diagnosis_text: Optional[str] = None
    diagnosis_code: Optional[str] = None
    medications: Optional[List[MedicationItem]] = None
    instructions: Optional[str] = None
    is_favorite: Optional[bool] = None


def _serialize_medications(medications: List[MedicationItem]) -> list[dict[str, str]]:
    """Convert medication schema objects to JSON-serializable dicts."""
    return [
        {
            "medication": medication.medication,
            "dosage": medication.dosage,
            "duration": medication.duration,
        }
        for medication in medications
    ]


def _to_medication_items(raw_medications: Optional[list[dict[str, str]]]) -> List[MedicationItem]:
    """Normalize DB medication payload into API response schema."""
    if not raw_medications:
        return []
    return [MedicationItem.model_validate(item) for item in raw_medications]


# ============================================
# Endpoints
# ============================================

@router.get("/", response_model=TemplateListResponse)
async def list_templates(
    search: Optional[str] = Query(None, description="Search by name or diagnosis"),
    favorites_only: bool = Query(False, description="Filter favorites only"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> TemplateListResponse:
    """
    List treatment templates.
    """
    # Incluir templates del usuario Y templates globales (practitioner_id IS NULL)
    query = select(TreatmentTemplate).where(
        or_(
            TreatmentTemplate.practitioner_id == current_practitioner.id,
            TreatmentTemplate.practitioner_id.is_(None)
        )
    )
    
    # Filtrar por favoritos
    if favorites_only:
        query = query.where(TreatmentTemplate.is_favorite.is_(True))
    
    # Búsqueda por nombre o diagnóstico
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                TreatmentTemplate.name.ilike(search_term),
                TreatmentTemplate.diagnosis_text.ilike(search_term),
            )
        )
    
    # Ordenar: favoritos primero, luego por nombre
    query = query.order_by(
        TreatmentTemplate.is_favorite.desc(),
        TreatmentTemplate.name.asc(),
    )
    
    # Contar total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Aplicar paginación
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return TemplateListResponse(
        items=[
            TemplateResponse(
                id=str(t.id),
                name=t.name,
                diagnosis_text=t.diagnosis_text,
                diagnosis_code=t.diagnosis_code,
                medications=_to_medication_items(t.medications),
                instructions=t.instructions,
                is_favorite=t.is_favorite,
                is_global=t.practitioner_id is None,
            )
            for t in templates
        ],
        total=total,
    )


@router.get("/match")
async def match_template(
    diagnosis: str = Query(..., min_length=2, description="Diagnosis text to match"),
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> TemplateResponse:
    """
    Find best matching template for a diagnosis.
    
    Used for auto-loading treatment when selecting diagnosis.
    """
    # Buscar template que coincida con el diagnóstico (incluye globales)
    result = await db.execute(
        select(TreatmentTemplate)
        .where(
            or_(
                TreatmentTemplate.practitioner_id == current_practitioner.id,
                TreatmentTemplate.practitioner_id.is_(None)
            ),
            TreatmentTemplate.diagnosis_text.ilike(f"%{diagnosis}%"),
        )
        .order_by(TreatmentTemplate.is_favorite.desc())
        .limit(1)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró template para este diagnóstico"
        )
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        diagnosis_text=template.diagnosis_text,
        diagnosis_code=template.diagnosis_code,
        medications=_to_medication_items(template.medications),
        instructions=template.instructions,
        is_favorite=template.is_favorite,
        is_global=template.practitioner_id is None,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> TemplateResponse:
    """
    Get template by ID (incluye templates globales).
    """
    result = await db.execute(
        select(TreatmentTemplate).where(
            TreatmentTemplate.id == template_id,
            or_(
                TreatmentTemplate.practitioner_id == current_practitioner.id,
                TreatmentTemplate.practitioner_id.is_(None)
            ),
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template no encontrado"
        )
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        diagnosis_text=template.diagnosis_text,
        diagnosis_code=template.diagnosis_code,
        medications=_to_medication_items(template.medications),
        instructions=template.instructions,
        is_favorite=template.is_favorite,
        is_global=template.practitioner_id is None,
    )


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=TemplateResponse)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> TemplateResponse:
    """
    Create new treatment template.
    """
    template = TreatmentTemplate(
        practitioner_id=current_practitioner.id,
        name=data.name,
        diagnosis_text=data.diagnosis_text,
        diagnosis_code=data.diagnosis_code,
        medications=_serialize_medications(data.medications),
        instructions=data.instructions,
        is_favorite=data.is_favorite,
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        diagnosis_text=template.diagnosis_text,
        diagnosis_code=template.diagnosis_code,
        medications=data.medications,
        instructions=template.instructions,
        is_favorite=template.is_favorite,
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> TemplateResponse:
    """
    Update template. Solo templates propios (no globales).
    """
    result = await db.execute(
        select(TreatmentTemplate).where(
            TreatmentTemplate.id == template_id,
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template no encontrado"
        )
    
    # Proteger templates globales de edición
    if template.practitioner_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden modificar templates del sistema"
        )
    
    # Verificar que pertenece al usuario actual
    if template.practitioner_id != current_practitioner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar este template"
        )
    
    # Actualizar campos
    if data.name is not None:
        template.name = data.name
    if data.diagnosis_text is not None:
        template.diagnosis_text = data.diagnosis_text
    if data.diagnosis_code is not None:
        template.diagnosis_code = data.diagnosis_code
    if data.medications is not None:
        template.medications = _serialize_medications(data.medications)
    if data.instructions is not None:
        template.instructions = data.instructions
    if data.is_favorite is not None:
        template.is_favorite = data.is_favorite
    
    await db.commit()
    await db.refresh(template)
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        diagnosis_text=template.diagnosis_text,
        diagnosis_code=template.diagnosis_code,
        medications=_to_medication_items(template.medications),
        instructions=template.instructions,
        is_favorite=template.is_favorite,
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> None:
    """
    Delete template. Solo templates propios (no globales).
    """
    result = await db.execute(
        select(TreatmentTemplate).where(
            TreatmentTemplate.id == template_id,
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template no encontrado"
        )
    
    # Proteger templates globales de eliminación
    if template.practitioner_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden eliminar templates del sistema"
        )
    
    # Verificar que pertenece al usuario actual
    if template.practitioner_id != current_practitioner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este template"
        )
    
    await db.delete(template)
    await db.commit()
