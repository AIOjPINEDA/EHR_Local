"""
ConsultaMed Backend - Practitioner Schemas (FHIR Practitioner)
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.services.security import (
    BCRYPT_MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
    password_byte_length,
)


class PractitionerResponse(BaseModel):
    """Datos del profesional devueltos al cliente autenticado."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    identifier_value: str
    name_given: str
    name_family: str
    qualification_code: Optional[str]
    telecom_email: Optional[str]


class PractitionerPublicSummary(BaseModel):
    """
    Perfil mínimo expuesto antes del login (selector de la pantalla de acceso).

    Solo contiene datos profesionales (nombre, especialidad y email de acceso);
    nunca información clínica ni el hash de contraseña.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str
    name_given: str
    name_family: str
    qualification_code: Optional[str]
    telecom_email: Optional[str]


class PractitionerCreate(BaseModel):
    """Alta de un nuevo perfil profesional, autorizada por la clave de administración."""

    identifier_value: str = Field(..., min_length=3, max_length=20, description="Nº Colegiado")
    name_given: str = Field(..., min_length=1, max_length=100)
    name_family: str = Field(..., min_length=1, max_length=100)
    qualification_code: Optional[str] = Field(
        None, max_length=50, description="Especialidad médica"
    )
    telecom_email: EmailStr = Field(..., max_length=100, description="Email de acceso")
    password: str = Field(
        ...,
        min_length=MIN_PASSWORD_LENGTH,
        max_length=BCRYPT_MAX_PASSWORD_BYTES,
        description="Contraseña de acceso del profesional",
    )
    registration_password: str = Field(
        ...,
        min_length=1,
        description="Clave de alta entregada por administración",
    )

    @field_validator("identifier_value", "name_given", "name_family", "qualification_code")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        """Normaliza espacios accidentales al copiar datos del colegiado."""
        return value.strip() if value is not None else None

    @field_validator("identifier_value", "name_given", "name_family")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        """Un campo obligatorio con solo espacios debe fallar como campo vacío."""
        if not value:
            raise ValueError("El campo es obligatorio")
        return value

    @field_validator("password")
    @classmethod
    def enforce_bcrypt_limit(cls, value: str) -> str:
        """`max_length` cuenta caracteres; bcrypt cuenta bytes (acentos ocupan 2)."""
        if password_byte_length(value) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError(
                f"La contraseña no puede superar {BCRYPT_MAX_PASSWORD_BYTES} bytes"
            )
        return value


class TokenResponse(BaseModel):
    """Respuesta de login con token de acceso."""

    access_token: str
    token_type: str = "bearer"
    practitioner: PractitionerResponse
