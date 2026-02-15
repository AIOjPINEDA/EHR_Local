"""
ConsultaMed Backend - Medication Schemas (FHIR R5 MedicationRequest Resource)

Schemas atómicos para el recurso FHIR MedicationRequest.
Un MedicationRequest existe independientemente de si está vinculado a un Encounter.
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MedicationCreate(BaseModel):
    """
    Schema para crear una MedicationRequest (prescripción).

    Alineado con FHIR R5 MedicationRequest resource.
    """
    medication_text: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Nombre del medicamento"
    )
    dosage_text: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Pauta de dosificación"
    )
    duration_value: Optional[int] = Field(
        None,
        ge=1,
        description="Valor de duración del tratamiento"
    )
    duration_unit: Optional[str] = Field(
        None,
        max_length=20,
        description="Unidad de duración: días, semanas, meses"
    )


class MedicationResponse(BaseModel):
    """
    MedicationRequest response (FHIR R5 MedicationRequest resource).

    Representa una prescripción médica como recurso atómico independiente.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Identificador único de la prescripción")
    medication_text: str = Field(..., description="Nombre del medicamento")
    dosage_text: str = Field(..., description="Pauta de dosificación")
    duration_value: Optional[int] = Field(None, description="Valor de duración")
    duration_unit: Optional[str] = Field(None, description="Unidad de duración")
    status: str = Field(
        ...,
        description="Estado de la prescripción: active | completed | cancelled"
    )
