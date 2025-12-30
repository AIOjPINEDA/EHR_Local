"""
ConsultaMed Backend - Validators Package

IMPORTANTE: Este módulo contiene la lógica de validación médica.
El desarrollador médico (Jaime) tiene control total sobre estas validaciones.
"""
from app.validators.dni import (
    validate_dni_español,
    validate_nie_español,
    validate_documento_identidad,
)

__all__ = [
    "validate_dni_español",
    "validate_nie_español",
    "validate_documento_identidad",
]
