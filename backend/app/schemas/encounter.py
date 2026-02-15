"""
ConsultaMed Backend - Encounter Schemas (FHIR R5 Encounter Resource)

Schemas para el recurso FHIR Encounter (consulta médica).
Importa schemas atómicos de Condition y Medication de forma unidireccional.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

# ✅ Import unidireccional: encounter → condition/medication (NO al revés)
from app.schemas.condition import ConditionCreate, ConditionResponse
from app.schemas.medication import MedicationCreate, MedicationResponse


class EncounterCreate(BaseModel):
    """
    Schema para crear un Encounter (consulta médica).

    Estructura transaccional: crea Encounter + Conditions + Medications en una sola operación.
    Alineado con FHIR R5 Encounter resource.
    """
    reason_text: Optional[str] = Field(None, max_length=500, description="Motivo de consulta")

    # Campos SOAP estructurados
    subjective_text: Optional[str] = Field(None, description="Subjetivo (SOAP)")
    objective_text: Optional[str] = Field(None, description="Objetivo (SOAP)")
    assessment_text: Optional[str] = Field(None, description="Análisis/Evaluación (SOAP)")
    plan_text: Optional[str] = Field(None, description="Plan de tratamiento (SOAP)")
    recommendations_text: Optional[str] = Field(None, description="Recomendaciones")

    # Campo legacy para retrocompatibilidad
    note: Optional[str] = Field(None, description="Nota libre (legacy)")

    # Recursos FHIR atómicos vinculados al encounter
    conditions: List[ConditionCreate] = Field(
        default_factory=list,
        description="Diagnósticos vinculados a esta consulta"
    )
    medications: List[MedicationCreate] = Field(
        default_factory=list,
        description="Prescripciones vinculadas a esta consulta"
    )


class EncounterResponse(BaseModel):
    """
    Encounter response (FHIR R5 Encounter resource).

    Incluye recursos atómicos vinculados (Conditions, Medications).
    """
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Identificador único del encounter")
    subject_id: str = Field(..., description="Referencia al paciente (Patient.id)")
    status: str = Field(..., description="Estado: planned | in-progress | finished | cancelled")
    period_start: datetime = Field(..., description="Fecha/hora de inicio del encounter")

    # Motivo y notas clínicas
    reason_text: Optional[str] = Field(None, description="Motivo de consulta")
    subjective_text: Optional[str] = Field(None, description="Subjetivo (SOAP)")
    objective_text: Optional[str] = Field(None, description="Objetivo (SOAP)")
    assessment_text: Optional[str] = Field(None, description="Análisis (SOAP)")
    plan_text: Optional[str] = Field(None, description="Plan (SOAP)")
    recommendations_text: Optional[str] = Field(None, description="Recomendaciones")
    note: Optional[str] = Field(None, description="Nota consolidada (legacy)")

    # Recursos FHIR atómicos vinculados
    conditions: List[ConditionResponse] = Field(
        default_factory=list,
        description="Diagnósticos de esta consulta"
    )
    medications: List[MedicationResponse] = Field(
        default_factory=list,
        description="Prescripciones de esta consulta"
    )


class EncounterListResponse(BaseModel):
    """
    Respuesta paginada de encounters.

    Future-proof: preparado para migrar a FHIR Bundle con paginación por cursores.
    """
    items: List[EncounterResponse] = Field(..., description="Lista de encounters")
    total: int = Field(..., description="Total de resultados disponibles")
