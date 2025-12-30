"""
ConsultaMed Backend - Templates Endpoints
"""
from typing import Optional, List
from uuid import UUID

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
):
    """
    List treatment templates.
    """
    query = select(TreatmentTemplate).where(
        TreatmentTemplate.practitioner_id == current_practitioner.id
    )
    
    # Filtrar por favoritos
    if favorites_only:
        query = query.where(TreatmentTemplate.is_favorite == True)
    
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
                medications=t.medications or [],
                instructions=t.instructions,
                is_favorite=t.is_favorite,
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
):
    """
    Find best matching template for a diagnosis.
    
    Used for auto-loading treatment when selecting diagnosis.
    """
    # Buscar template que coincida con el diagnóstico
    result = await db.execute(
        select(TreatmentTemplate)
        .where(
            TreatmentTemplate.practitioner_id == current_practitioner.id,
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
        medications=template.medications or [],
        instructions=template.instructions,
        is_favorite=template.is_favorite,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
):
    """
    Get template by ID.
    """
    result = await db.execute(
        select(TreatmentTemplate).where(
            TreatmentTemplate.id == template_id,
            TreatmentTemplate.practitioner_id == current_practitioner.id,
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
        medications=template.medications or [],
        instructions=template.instructions,
        is_favorite=template.is_favorite,
    )


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=TemplateResponse)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
):
    """
    Create new treatment template.
    """
    template = TreatmentTemplate(
        practitioner_id=current_practitioner.id,
        name=data.name,
        diagnosis_text=data.diagnosis_text,
        diagnosis_code=data.diagnosis_code,
        medications=[m.model_dump() for m in data.medications],
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
):
    """
    Update template.
    """
    result = await db.execute(
        select(TreatmentTemplate).where(
            TreatmentTemplate.id == template_id,
            TreatmentTemplate.practitioner_id == current_practitioner.id,
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template no encontrado"
        )
    
    # Actualizar campos
    if data.name is not None:
        template.name = data.name
    if data.diagnosis_text is not None:
        template.diagnosis_text = data.diagnosis_text
    if data.diagnosis_code is not None:
        template.diagnosis_code = data.diagnosis_code
    if data.medications is not None:
        template.medications = [m.model_dump() for m in data.medications]
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
        medications=template.medications or [],
        instructions=template.instructions,
        is_favorite=template.is_favorite,
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
):
    """
    Delete template.
    """
    result = await db.execute(
        select(TreatmentTemplate).where(
            TreatmentTemplate.id == template_id,
            TreatmentTemplate.practitioner_id == current_practitioner.id,
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template no encontrado"
        )
    
    await db.delete(template)
    await db.commit()
