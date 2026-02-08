"""Unit tests for PDF service normalization helpers."""

import pytest

from app.services.pdf_service import PDFService

pytestmark = pytest.mark.unit


def test_normalize_medications_accepts_prescription_payload_shape() -> None:
    """Should keep already-normalized prescription rows untouched."""
    rows = [
        {
            "name": "Paracetamol 1 g",
            "dosage": "1 comprimido cada 8 horas",
            "duration": "5 días",
        }
    ]

    normalized = PDFService._normalize_medications(rows)

    assert normalized == rows


def test_normalize_medications_maps_encounter_shape_and_duration_units() -> None:
    """Should map encounter payload keys and build human-readable duration."""
    rows = [
        {
            "medication_text": "Ibuprofeno 600 mg",
            "dosage_text": "1 comprimido cada 12 horas",
            "duration_value": 7,
            "duration_unit": "d",
        }
    ]

    normalized = PDFService._normalize_medications(rows)

    assert normalized == [
        {
            "name": "Ibuprofeno 600 mg",
            "dosage": "1 comprimido cada 12 horas",
            "duration": "7 días",
        }
    ]


def test_normalize_medications_skips_empty_rows() -> None:
    """Should drop rows that do not contain meaningful medication data."""
    rows = [
        {"name": "", "dosage": "", "duration": ""},
        {"name": "Paracetamol 1 g", "dosage": "1 comprimido cada 8 horas", "duration": "5 días"},
    ]

    normalized = PDFService._normalize_medications(rows)

    assert normalized == [
        {
            "name": "Paracetamol 1 g",
            "dosage": "1 comprimido cada 8 horas",
            "duration": "5 días",
        }
    ]


def test_generate_prescription_preview_includes_patient_gender() -> None:
    """Preview payload should expose patient gender for UI/PDF consistency."""
    service = PDFService()

    preview = service.generate_prescription_preview(
        patient={
            "full_name": "Ana Pérez",
            "identifier_value": "12345678Z",
            "age": 34,
            "gender": "Femenino",
        },
        practitioner={
            "full_name": "Laura Gómez",
            "identifier_value": "COL123",
            "qualification_code": "MED",
        },
        encounter={"date": "08/02/2026", "diagnosis": "Amigdalitis aguda"},
        medications=[],
        instructions="Reposo e hidratación",
    )

    assert preview["patient"]["gender"] == "Femenino"
