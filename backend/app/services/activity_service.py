"""
ConsultaMed Backend - Activity Service

Agregados de actividad asistencial para el panel de urgencias.

Los cortes por día y por semana se hacen en la zona horaria de la consulta
(`CLINIC_TIMEZONE`), no en UTC: una urgencia atendida a las 01:00 pertenece al
turno de esa madrugada, no al día anterior.
"""
from datetime import date, datetime, timedelta
from typing import Mapping, Sequence
from zoneinfo import ZoneInfo

from sqlalchemy import Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.encounter import Encounter
from app.schemas.activity import (
    ActivityCount,
    ActivityDayPoint,
    ActivityWeekPoint,
    EncounterActivityResponse,
)
from app.services.base import BaseService

# Recuentos por periodo: clave -> (consultas, pacientes distintos).
PeriodCounts = Mapping[date, tuple[int, int]]

EMPTY_COUNT = (0, 0)


def week_start(day: date) -> date:
    """Lunes de la semana a la que pertenece `day` (igual que date_trunc('week'))."""
    return day - timedelta(days=day.weekday())


def build_daily_series(counts: PeriodCounts, *, end_day: date, days: int) -> list[ActivityDayPoint]:
    """
    Serie diaria continua terminada en `end_day`, rellenando con ceros.

    Sin relleno, un gráfico de barras dibujaría los días sin actividad pegados a
    los que sí la tuvieron y la lectura del ritmo asistencial sería falsa.
    """
    first_day = end_day - timedelta(days=days - 1)
    series: list[ActivityDayPoint] = []

    for offset in range(days):
        day = first_day + timedelta(days=offset)
        encounters, patients = counts.get(day, EMPTY_COUNT)
        series.append(ActivityDayPoint(date=day, encounters=encounters, patients=patients))

    return series


def build_weekly_series(
    counts: PeriodCounts, *, end_week: date, weeks: int
) -> list[ActivityWeekPoint]:
    """Serie semanal continua terminada en la semana de `end_week`, con ceros."""
    first_week = end_week - timedelta(weeks=weeks - 1)
    series: list[ActivityWeekPoint] = []

    for offset in range(weeks):
        monday = first_week + timedelta(weeks=offset)
        encounters, patients = counts.get(monday, EMPTY_COUNT)
        series.append(
            ActivityWeekPoint(week_start=monday, encounters=encounters, patients=patients)
        )

    return series


def count_for(points: Sequence[ActivityDayPoint] | Sequence[ActivityWeekPoint], key: date) -> ActivityCount:
    """Recuento de un periodo concreto dentro de una serie ya construida."""
    for point in points:
        point_key = point.date if isinstance(point, ActivityDayPoint) else point.week_start
        if point_key == key:
            return ActivityCount(encounters=point.encounters, patients=point.patients)

    return ActivityCount(encounters=0, patients=0)


class EncounterActivityService(BaseService[Encounter]):
    """Consultas agregadas sobre `Encounter` para el panel de actividad."""

    def __init__(self, db: AsyncSession, timezone_name: str) -> None:
        super().__init__(db)
        self.timezone_name = timezone_name
        self.timezone = ZoneInfo(timezone_name)

    def _local_bucket(self, granularity: str) -> ColumnElement[date]:
        """`period_start` truncado a día o semana en la hora local de la consulta."""
        local_start = func.timezone(self.timezone_name, Encounter.period_start)
        return func.date_trunc(granularity, local_start).cast(Date)

    async def _counts_by_period(self, granularity: str, since: date) -> dict[date, tuple[int, int]]:
        """
        Recuentos agrupados por día o semana desde `since` (inclusive).

        Devuelve consultas y pacientes distintos: en urgencias un mismo paciente
        puede reconsultar, y ambas cifras se leen distinto.
        """
        bucket = self._local_bucket(granularity)

        stmt = (
            select(
                bucket.label("bucket"),
                func.count(Encounter.id).label("encounters"),
                func.count(func.distinct(Encounter.subject_id)).label("patients"),
            )
            .where(bucket >= since)
            .group_by(bucket)
        )

        result = await self.db.execute(stmt)
        return {row.bucket: (int(row.encounters), int(row.patients)) for row in result}

    async def get_activity(self, *, days: int, weeks: int) -> EncounterActivityResponse:
        """Construye la respuesta completa del panel de actividad."""
        now_local = datetime.now(self.timezone)
        today = now_local.date()
        current_week = week_start(today)

        daily_counts = await self._counts_by_period("day", today - timedelta(days=days - 1))
        weekly_counts = await self._counts_by_period(
            "week", current_week - timedelta(weeks=weeks - 1)
        )

        daily = build_daily_series(daily_counts, end_day=today, days=days)
        weekly = build_weekly_series(weekly_counts, end_week=current_week, weeks=weeks)

        return EncounterActivityResponse(
            generated_at=now_local,
            timezone=self.timezone_name,
            today=count_for(daily, today),
            yesterday=count_for(daily, today - timedelta(days=1)),
            current_week=count_for(weekly, current_week),
            previous_week=count_for(weekly, current_week - timedelta(weeks=1)),
            daily=daily,
            weekly=weekly,
        )
