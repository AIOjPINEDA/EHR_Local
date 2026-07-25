"""
ConsultaMed Backend - Activity Schemas

Estadísticas de actividad asistencial: consultas atendidas y pacientes
distintos, agregadas por día y por semana.
"""
from datetime import date, datetime

from pydantic import BaseModel, Field


class ActivityCount(BaseModel):
    """Recuento de actividad de un periodo."""

    encounters: int = Field(..., description="Consultas atendidas")
    patients: int = Field(..., description="Pacientes distintos atendidos")


class ActivityDayPoint(ActivityCount):
    """Actividad de un día concreto (zona horaria de la consulta)."""

    date: date


class ActivityWeekPoint(ActivityCount):
    """Actividad de una semana, identificada por su lunes."""

    week_start: date


class EncounterActivityResponse(BaseModel):
    """
    Serie de actividad para el panel de urgencias.

    `daily` y `weekly` son series continuas: los periodos sin actividad vienen
    con ceros para que el gráfico no muestre huecos engañosos.
    """

    generated_at: datetime
    timezone: str = Field(..., description="Zona horaria usada para cortar los días")
    today: ActivityCount
    yesterday: ActivityCount
    current_week: ActivityCount
    previous_week: ActivityCount
    daily: list[ActivityDayPoint]
    weekly: list[ActivityWeekPoint]
