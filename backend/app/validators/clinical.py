"""
ConsultaMed Backend - Validaciones Clínicas

LÓGICA MÉDICA - TÚ (JAIME) CONTROLAS ESTE ARCHIVO

Este módulo contiene validaciones relacionadas con la lógica clínica.
Aquí puedes añadir reglas de negocio médico específicas.
"""
from typing import Optional
from datetime import date


def calculate_age(birth_date: date) -> int:
    """
    Calcula la edad a partir de la fecha de nacimiento.
    
    Args:
        birth_date: Fecha de nacimiento
        
    Returns:
        Edad en años
    """
    today = date.today()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


def validate_birth_date(birth_date: date) -> tuple[bool, Optional[str]]:
    """
    Valida que la fecha de nacimiento sea razonable.
    
    Args:
        birth_date: Fecha de nacimiento a validar
        
    Returns:
        Tuple de (es_válido, mensaje_error)
    """
    today = date.today()
    
    # No puede ser en el futuro
    if birth_date > today:
        return False, "La fecha de nacimiento no puede ser en el futuro"
    
    # No puede ser más de 150 años (paciente demasiado antiguo)
    age = calculate_age(birth_date)
    if age > 150:
        return False, "La fecha de nacimiento indica una edad mayor a 150 años"
    
    # No puede ser negativa (año actual)
    if age < 0:
        return False, "Fecha de nacimiento inválida"
    
    return True, None


def validate_gender(gender: Optional[str]) -> tuple[bool, Optional[str]]:
    """
    Valida que el género sea un valor FHIR válido.
    
    Valores permitidos: male, female, other, unknown
    """
    if gender is None:
        return True, None
    
    valid_genders = {"male", "female", "other", "unknown"}
    
    if gender.lower() not in valid_genders:
        return False, f"Género inválido. Valores permitidos: {', '.join(valid_genders)}"
    
    return True, None


def validate_criticality(criticality: Optional[str]) -> tuple[bool, Optional[str]]:
    """
    Valida la criticidad de una alergia según FHIR.
    
    Valores permitidos: low, high, unable-to-assess
    """
    if criticality is None:
        return True, None
    
    valid_values = {"low", "high", "unable-to-assess"}
    
    if criticality.lower() not in valid_values:
        return False, f"Criticidad inválida. Valores permitidos: {', '.join(valid_values)}"
    
    return True, None


def validate_allergy_category(category: Optional[str]) -> tuple[bool, Optional[str]]:
    """
    Valida la categoría de una alergia según FHIR.
    
    Valores permitidos: food, medication, environment, biologic
    """
    if category is None:
        return True, None
    
    valid_values = {"food", "medication", "environment", "biologic"}
    
    if category.lower() not in valid_values:
        return False, f"Categoría inválida. Valores permitidos: {', '.join(valid_values)}"
    
    return True, None


# =============================================================================
# FUTURO: Validaciones de interacciones medicamentosas
# =============================================================================

def check_medication_allergy_interaction(
    medication_name: str,
    patient_allergies: list[str]
) -> tuple[bool, Optional[str]]:
    """
    FUTURO: Verifica si un medicamento puede interactuar con las alergias del paciente.
    
    Esta función se implementará cuando se añadan las tablas de relación
    medicamento-alérgeno.
    
    Args:
        medication_name: Nombre del medicamento a prescribir
        patient_allergies: Lista de alergias activas del paciente
        
    Returns:
        Tuple de (hay_interaccion, mensaje_advertencia)
    """
    # TODO: Implementar cuando se añada la base de datos de interacciones
    
    # Por ahora, solo detectamos penicilinas básicas
    penicilinas = ["penicilina", "amoxicilina", "ampicilina"]
    
    medication_lower = medication_name.lower()
    
    for alergia in patient_allergies:
        alergia_lower = alergia.lower()
        
        # Si tiene alergia a penicilina y se prescribe una penicilina
        if "penicilina" in alergia_lower:
            for pen in penicilinas:
                if pen in medication_lower:
                    return True, f"⚠️ ADVERTENCIA: El paciente es alérgico a {alergia}. " \
                                f"El medicamento {medication_name} pertenece al grupo de penicilinas."
    
    return False, None


# =============================================================================
# FUTURO: Validaciones de dosis
# =============================================================================

def validate_dosage_format(dosage_text: str) -> tuple[bool, Optional[str]]:
    """
    Valida que el texto de dosificación tenga un formato razonable.
    
    Esta es una validación básica. No verifica dosis clínicas correctas.
    """
    if not dosage_text or len(dosage_text.strip()) < 3:
        return False, "La pauta de dosificación es demasiado corta"
    
    if len(dosage_text) > 500:
        return False, "La pauta de dosificación es demasiado larga"
    
    return True, None
