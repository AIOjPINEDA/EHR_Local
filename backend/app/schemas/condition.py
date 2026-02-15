"""
ConsultaMed Backend - Condition Schemas (FHIR R5 Condition Resource)

Schemas atómicos para el recurso FHIR Condition.
Un Condition existe independientemente de si está vinculado a un Encounter.
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ConditionCreate(BaseModel):
    """
    Schema para crear una Condition (diagnóstico).

    Alineado con FHIR R5 Condition resource.
    """
    code_text: str = Field(..., min_length=1, max_length=200, description="Texto del diagnóstico")
    code_coding_code: Optional[str] = Field(
        None,
        max_length=50,
        description="Código CIE-10 u otro sistema de codificación"
    )


class ConditionResponse(BaseModel):
    """
    Condition response (FHIR R5 Condition resource).

    Representa un diagnóstico clínico como recurso atómico independiente.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Identificador único de la condición")
    code_text: str = Field(..., description="Texto del diagnóstico")
    code_coding_code: Optional[str] = Field(None, description="Código de clasificación (CIE-10, etc)")
    clinical_status: str = Field(..., description="Estado clínico: active | resolved | inactive")
