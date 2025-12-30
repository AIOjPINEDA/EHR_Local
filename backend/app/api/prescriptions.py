"""
ConsultaMed Backend - Prescriptions Endpoints (PDF Generation)
"""
import io
from datetime import date

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.auth import get_current_practitioner
from app.models.encounter import Encounter
from app.models.practitioner import Practitioner
from app.services.pdf_service import PDFService

router = APIRouter()
pdf_service = PDFService()


@router.get("/{encounter_id}/preview")
async def get_prescription_preview(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
):
    """
    Get prescription data for preview.
    
    Returns structured data for frontend preview component.
    """
    # Cargar encounter con relaciones
    result = await db.execute(
        select(Encounter)
        .options(
            selectinload(Encounter.patient),
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter_id)
    )
    encounter = result.scalar_one_or_none()
    
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consulta no encontrada"
        )
    
    patient = encounter.patient
    
    # Construir diagnóstico
    diagnosis_text = ", ".join([c.code_text for c in encounter.conditions]) if encounter.conditions else ""
    
    return pdf_service.generate_prescription_preview(
        patient={
            "full_name": f"{patient.name_given} {patient.name_family}",
            "identifier_value": patient.identifier_value,
            "age": patient.age,
        },
        practitioner={
            "full_name": f"{current_practitioner.name_given} {current_practitioner.name_family}",
            "identifier_value": current_practitioner.identifier_value,
            "qualification_code": current_practitioner.qualification_code,
        },
        encounter={
            "date": encounter.period_start.strftime("%d/%m/%Y"),
            "diagnosis": diagnosis_text,
        },
        medications=[
            {
                "name": m.medication_text,
                "dosage": m.dosage_text,
                "duration": f"{m.duration_value} {'días' if m.duration_unit == 'd' else m.duration_unit}" if m.duration_value else "",
            }
            for m in encounter.medications
        ],
        instructions=encounter.note or "",
    )


@router.get("/{encounter_id}/pdf")
async def download_prescription_pdf(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
):
    """
    Generate and download prescription PDF.
    
    Uses WeasyPrint to generate PDF from HTML template.
    """
    # Cargar encounter con relaciones
    result = await db.execute(
        select(Encounter)
        .options(
            selectinload(Encounter.patient),
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter_id)
    )
    encounter = result.scalar_one_or_none()
    
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consulta no encontrada"
        )
    
    if not encounter.medications:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consulta no tiene medicamentos para generar receta"
        )
    
    patient = encounter.patient
    
    # Construir diagnóstico
    diagnosis_text = ", ".join([c.code_text for c in encounter.conditions]) if encounter.conditions else ""
    
    # Generar PDF
    pdf_bytes = pdf_service.generate_prescription_pdf(
        patient={
            "full_name": f"{patient.name_given} {patient.name_family}",
            "identifier_value": patient.identifier_value,
            "age": patient.age,
        },
        practitioner={
            "full_name": f"{current_practitioner.name_given} {current_practitioner.name_family}",
            "identifier_value": current_practitioner.identifier_value,
            "qualification_code": current_practitioner.qualification_code,
        },
        encounter={
            "date": encounter.period_start.strftime("%d/%m/%Y"),
            "diagnosis": diagnosis_text,
        },
        medications=[
            {
                "name": m.medication_text,
                "dosage": m.dosage_text,
                "duration": f"{m.duration_value} {'días' if m.duration_unit == 'd' else m.duration_unit}" if m.duration_value else "",
            }
            for m in encounter.medications
        ],
        instructions=encounter.note or "",
    )
    
    # Nombre de archivo: receta_DNI_fecha.pdf
    filename = f"receta_{patient.identifier_value}_{date.today().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
