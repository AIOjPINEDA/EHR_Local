"""Unit tests for SOAP helper functions used in encounter/prescription flows."""
from types import SimpleNamespace

import pytest

from app.api.encounters import _build_legacy_note, _clean_text
from app.api.prescriptions import (
    _build_prescription_filename,
    _format_gender_label,
    _resolve_encounter_instructions,
)

pytestmark = pytest.mark.unit


def test_clean_text_normalizes_whitespace() -> None:
    """The text helper should trim and collapse empty values to None."""
    assert _clean_text("  hola  ") == "hola"
    assert _clean_text("   ") is None
    assert _clean_text(None) is None


def test_build_legacy_note_prefers_explicit_note() -> None:
    """Explicit note should always take priority over generated SOAP note."""
    generated = _build_legacy_note(
        note=" Nota directa ",
        subjective_text="S",
        objective_text="O",
        assessment_text="A",
        plan_text="P",
        recommendations_text="R",
    )
    assert generated == "Nota directa"


def test_build_legacy_note_builds_ordered_sections() -> None:
    """Generated legacy note should keep a stable SOAP section order."""
    generated = _build_legacy_note(
        note=None,
        subjective_text="s1",
        objective_text="o1",
        assessment_text="a1",
        plan_text="p1",
        recommendations_text="r1",
    )
    assert generated == (
        "Subjetivo: s1\n"
        "Objetivo: o1\n"
        "Análisis: a1\n"
        "Plan: p1\n"
        "Recomendaciones: r1"
    )


def test_resolve_encounter_instructions_uses_priority() -> None:
    """Prescription instructions must follow recommendations > plan > note."""
    encounter = SimpleNamespace(recommendations_text="rec", plan_text="plan", note="note")
    assert _resolve_encounter_instructions(encounter) == "rec"

    encounter = SimpleNamespace(recommendations_text="  ", plan_text="plan", note="note")
    assert _resolve_encounter_instructions(encounter) == "plan"

    encounter = SimpleNamespace(recommendations_text=None, plan_text=None, note=" note ")
    assert _resolve_encounter_instructions(encounter) == "note"

    encounter = SimpleNamespace(recommendations_text=None, plan_text=None, note=None)
    assert _resolve_encounter_instructions(encounter) == ""


def test_format_gender_label_maps_supported_values() -> None:
    """Prescription gender label should be human-readable in Spanish."""
    assert _format_gender_label("male") == "Masculino"
    assert _format_gender_label("female") == "Femenino"
    assert _format_gender_label("other") == "Otro"
    assert _format_gender_label("unknown") == "No especificado"
    assert _format_gender_label(None) == "No especificado"


def test_build_prescription_filename_uses_date_and_patient_name() -> None:
    """Prescription filename should include issue date and patient full name slug."""
    filename = _build_prescription_filename(
        patient_name="José Pérez Gómez",
        issued_on="2026-02-08",
    )
    assert filename == "receta_20260208_jose-perez-gomez.pdf"
