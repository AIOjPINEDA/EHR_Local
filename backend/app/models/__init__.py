"""
ConsultaMed Backend - Models Package
"""
from app.models.practitioner import Practitioner
from app.models.patient import Patient
from app.models.allergy import AllergyIntolerance
from app.models.encounter import Encounter
from app.models.condition import Condition
from app.models.medication_request import MedicationRequest
from app.models.template import TreatmentTemplate

__all__ = [
    "Practitioner",
    "Patient",
    "AllergyIntolerance",
    "Encounter",
    "Condition",
    "MedicationRequest",
    "TreatmentTemplate",
]
