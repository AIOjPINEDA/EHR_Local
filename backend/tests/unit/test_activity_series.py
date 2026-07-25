"""Unit tests for the activity series builders used by the urgencias panel."""

from datetime import date

import pytest

from app.config import Settings
from app.schemas.activity import ActivityDayPoint, ActivityWeekPoint
from app.services.activity_service import (
    build_daily_series,
    build_weekly_series,
    count_for,
    week_start,
)

pytestmark = pytest.mark.unit


class TestWeekStart:
    """Las semanas empiezan en lunes, igual que date_trunc('week') en Postgres."""

    def test_monday_maps_to_itself(self) -> None:
        """Un lunes es el inicio de su propia semana."""
        assert week_start(date(2026, 7, 20)) == date(2026, 7, 20)

    def test_sunday_maps_to_previous_monday(self) -> None:
        """El domingo cierra la semana que abrió el lunes anterior."""
        assert week_start(date(2026, 7, 26)) == date(2026, 7, 20)

    def test_midweek_maps_to_its_monday(self) -> None:
        """Cualquier día intermedio cae en la semana de su lunes."""
        assert week_start(date(2026, 7, 23)) == date(2026, 7, 20)


class TestDailySeries:
    """La serie diaria debe ser continua para no falsear el ritmo asistencial."""

    def test_series_covers_every_day_in_range(self) -> None:
        """Se devuelve un punto por día, sin huecos."""
        series = build_daily_series({}, end_day=date(2026, 7, 25), days=7)

        assert len(series) == 7
        assert series[0].date == date(2026, 7, 19)
        assert series[-1].date == date(2026, 7, 25)

    def test_days_without_activity_are_zero_filled(self) -> None:
        """Un día sin urgencias vale 0, no desaparece del gráfico."""
        counts = {date(2026, 7, 25): (4, 3)}
        series = build_daily_series(counts, end_day=date(2026, 7, 25), days=3)

        assert [point.encounters for point in series] == [0, 0, 4]
        assert [point.patients for point in series] == [0, 0, 3]

    def test_counts_outside_the_window_are_ignored(self) -> None:
        """Un recuento anterior a la ventana no se cuela en el primer día."""
        counts = {date(2026, 1, 1): (99, 99), date(2026, 7, 24): (2, 2)}
        series = build_daily_series(counts, end_day=date(2026, 7, 25), days=2)

        assert [point.encounters for point in series] == [2, 0]

    def test_single_day_window_is_valid(self) -> None:
        """El caso mínimo (solo hoy) no degenera."""
        series = build_daily_series({date(2026, 7, 25): (1, 1)}, end_day=date(2026, 7, 25), days=1)

        assert len(series) == 1
        assert series[0].encounters == 1


class TestWeeklySeries:
    """Serie semanal continua, identificada por el lunes de cada semana."""

    def test_series_covers_every_week_in_range(self) -> None:
        """Se devuelve un punto por semana, del más antiguo al más reciente."""
        series = build_weekly_series({}, end_week=date(2026, 7, 20), weeks=4)

        assert [point.week_start for point in series] == [
            date(2026, 6, 29),
            date(2026, 7, 6),
            date(2026, 7, 13),
            date(2026, 7, 20),
        ]

    def test_weeks_without_activity_are_zero_filled(self) -> None:
        """Una semana sin actividad vale 0."""
        counts = {date(2026, 7, 20): (18, 15)}
        series = build_weekly_series(counts, end_week=date(2026, 7, 20), weeks=2)

        assert [point.encounters for point in series] == [0, 18]
        assert [point.patients for point in series] == [0, 15]


class TestCountFor:
    """Los totales del panel se leen de la serie ya construida, sin más consultas."""

    def test_reads_a_day_from_the_daily_series(self) -> None:
        """El total de un día concreto sale de su punto."""
        series = [
            ActivityDayPoint(date=date(2026, 7, 24), encounters=2, patients=2),
            ActivityDayPoint(date=date(2026, 7, 25), encounters=5, patients=4),
        ]

        assert count_for(series, date(2026, 7, 25)).encounters == 5
        assert count_for(series, date(2026, 7, 25)).patients == 4

    def test_reads_a_week_from_the_weekly_series(self) -> None:
        """Los pacientes distintos por semana no se suman desde los días."""
        series = [ActivityWeekPoint(week_start=date(2026, 7, 20), encounters=18, patients=15)]

        assert count_for(series, date(2026, 7, 20)).patients == 15

    def test_missing_period_reads_as_zero(self) -> None:
        """Un periodo fuera de la serie vale 0, no rompe el panel."""
        series = [ActivityDayPoint(date=date(2026, 7, 25), encounters=5, patients=4)]

        assert count_for(series, date(2020, 1, 1)).encounters == 0


class TestClinicTimezoneSetting:
    """El corte de los días depende de la zona horaria configurada."""

    def test_default_timezone_is_spain(self) -> None:
        """Por defecto la consulta opera en hora peninsular."""
        assert Settings(_env_file=None).CLINIC_TIMEZONE == "Europe/Madrid"

    def test_invalid_timezone_is_rejected_at_startup(self) -> None:
        """Una zona mal escrita debe fallar al arrancar, no en cada petición."""
        with pytest.raises(ValueError, match="CLINIC_TIMEZONE"):
            Settings(_env_file=None, CLINIC_TIMEZONE="Europa/Madrid")
