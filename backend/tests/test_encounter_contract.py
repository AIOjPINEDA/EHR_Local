"""
ConsultaMed Backend - Encounter Contract Tests

Validates that EncounterResponse schema meets frontend requirements.
"""


def test_encounter_response_has_subject_id():
    """EncounterResponse must include subject_id for frontend navigation."""
    from app.api.encounters import EncounterResponse
    
    assert "subject_id" in EncounterResponse.model_fields, (
        "EncounterResponse must include subject_id for frontend navigation"
    )


def test_encounter_response_has_required_fields():
    """EncounterResponse must include all required fields for frontend."""
    from app.api.encounters import EncounterResponse
    
    required_fields = ["id", "status", "period_start", "subject_id"]
    for field in required_fields:
        assert field in EncounterResponse.model_fields, (
            f"EncounterResponse must include {field}"
        )
