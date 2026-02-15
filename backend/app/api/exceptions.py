"""
ConsultaMed Backend - API Exception Helpers

Funciones auxiliares para manejo consistente de errores HTTP.
"""
from typing import NoReturn
from fastapi import HTTPException, status


def raise_not_found(resource: str = "Recurso") -> NoReturn:
    """
    Lanza HTTPException 404 con mensaje en español.

    Args:
        resource: Nombre del recurso no encontrado (ej. "Paciente", "Consulta")

    Raises:
        HTTPException: 404 Not Found
    """
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} no encontrado"
    )


def raise_bad_request(detail: str) -> NoReturn:
    """
    Lanza HTTPException 400 para errores de validación.

    Args:
        detail: Mensaje descriptivo del error

    Raises:
        HTTPException: 400 Bad Request
    """
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail
    )


def raise_unauthorized(detail: str = "No autenticado") -> NoReturn:
    """
    Lanza HTTPException 401 para errores de autenticación.

    Args:
        detail: Mensaje descriptivo del error

    Raises:
        HTTPException: 401 Unauthorized
    """
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_forbidden(detail: str = "No autorizado") -> NoReturn:
    """
    Lanza HTTPException 403 para errores de autorización.

    Args:
        detail: Mensaje descriptivo del error

    Raises:
        HTTPException: 403 Forbidden
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail
    )
