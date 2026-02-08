"""
ConsultaMed Backend - Prescriptions Endpoints (PDF Generation)
"""
import io
import re
import unicodedata
from datetime import date
from typing import Any

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


def _resolve_encounter_instructions(encounter: Encounter) -> str:
    """Resolve instructions with SOAP-aware fallback priority."""
    candidates = [
        encounter.recommendations_text,
        encounter.plan_text,
        encounter.note,
    ]
    for value in candidates:
        if value and value.strip():
            return value.strip()
    return ""


def _format_gender_label(gender: str | None) -> str:
    """Format patient gender code into a human-readable Spanish label."""
    if not gender:
        return "No especificado"

    labels = {
        "male": "Masculino",
        "female": "Femenino",
        "other": "Otro",
        "unknown": "No especificado",
    }
    return labels.get(gender.lower(), "No especificado")


def _build_prescription_filename(patient_name: str, issued_on: date | str) -> str:
    """Build a stable PDF filename including issue date and patient name."""
    issue_date = date.fromisoformat(issued_on) if isinstance(issued_on, str) else issued_on

    normalized = unicodedata.normalize("NFKD", patient_name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_name.strip().lower()).strip("-") or "paciente"

    return f"receta_{issue_date.strftime('%Y%m%d')}_{slug}.pdf"


async def _get_encounter_or_404(db: AsyncSession, encounter_id: str) -> Encounter:
    """Carga una consulta con relaciones o retorna 404 si no existe."""
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
            detail="Consulta no encontrada",
        )

    return encounter


def _build_prescription_payload(
    encounter: Encounter,
    current_practitioner: Practitioner,
) -> dict[str, Any]:
    """Construye payload normalizado compartido por preview y PDF."""
    patient = encounter.patient
    diagnosis_text = ", ".join(c.code_text for c in encounter.conditions) if encounter.conditions else ""

    return {
        "patient": {
            "full_name": f"{patient.name_given} {patient.name_family}",
            "identifier_value": patient.identifier_value,
            "age": patient.age,
            "gender": _format_gender_label(patient.gender),
        },
        "practitioner": {
            "full_name": f"{current_practitioner.name_given} {current_practitioner.name_family}",
            "identifier_value": current_practitioner.identifier_value,
            "qualification_code": current_practitioner.qualification_code,
        },
        "encounter": {
            "date": encounter.period_start.strftime("%d/%m/%Y"),
            "diagnosis": diagnosis_text,
        },
        "medications": [
            {
                "name": medication.medication_text,
                "dosage": medication.dosage_text,
                "duration": (
                    f"{medication.duration_value} {'días' if medication.duration_unit == 'd' else medication.duration_unit}"
                    if medication.duration_value
                    else ""
                ),
            }
            for medication in encounter.medications
        ],
        "instructions": _resolve_encounter_instructions(encounter),
    }


@router.get("/{encounter_id}/preview")
async def get_prescription_preview(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> dict[str, Any]:
    """
    Get prescription data for preview.
    
    Returns structured data for frontend preview component.
    """
    encounter = await _get_encounter_or_404(db, encounter_id)
    payload = _build_prescription_payload(encounter, current_practitioner)

    return pdf_service.generate_prescription_preview(
        patient=payload["patient"],
        practitioner=payload["practitioner"],
        encounter=payload["encounter"],
        medications=payload["medications"],
        instructions=payload["instructions"],
    )


@router.get("/{encounter_id}/pdf")
async def download_prescription_pdf(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    current_practitioner: Practitioner = Depends(get_current_practitioner),
) -> StreamingResponse:
    """
    Generate prescription PDF.
    
    Uses WeasyPrint to generate PDF from HTML template.
    """
    encounter = await _get_encounter_or_404(db, encounter_id)

    if not encounter.medications:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consulta no tiene medicamentos para generar receta"
        )

    payload = _build_prescription_payload(encounter, current_practitioner)

    # Generar PDF
    pdf_bytes = pdf_service.generate_prescription_pdf(
        patient=payload["patient"],
        practitioner=payload["practitioner"],
        encounter=payload["encounter"],
        medications=payload["medications"],
        instructions=payload["instructions"],
    )

    issued_on = encounter.period_start.date()
    filename = _build_prescription_filename(
        patient_name=payload["patient"]["full_name"],
        issued_on=issued_on,
    )
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )
