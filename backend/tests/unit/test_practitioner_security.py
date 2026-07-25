"""Unit tests for practitioner password and profile-deletion rules."""

import pytest

from app.config import Settings
from app.services.practitioner_service import describe_deletion_block, normalize_email
from app.services.security import (
    BCRYPT_MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
    hash_password,
    matches_registration_password,
    verify_password,
)

pytestmark = pytest.mark.unit


class TestPasswordHashing:
    """Hashing helpers shared by login, registro y CLI administrativa."""

    def test_hash_and_verify_roundtrip(self) -> None:
        """Una contraseña válida debe verificarse contra su propio hash."""
        password_hash = hash_password("consulta2026")

        assert password_hash.startswith("$2b$")
        assert verify_password("consulta2026", password_hash) is True

    def test_verify_rejects_wrong_password(self) -> None:
        """Una contraseña distinta nunca debe validar."""
        assert verify_password("otra-clave", hash_password("consulta2026")) is False

    def test_verify_without_stored_hash_is_false(self) -> None:
        """Un perfil sin hash almacenado no puede autenticarse."""
        assert verify_password("consulta2026", None) is False

    def test_verify_with_corrupt_hash_is_false(self) -> None:
        """Un hash con formato inválido se rechaza en lugar de romper el login."""
        assert verify_password("consulta2026", "no-es-un-hash-bcrypt") is False

    def test_hash_rejects_short_password(self) -> None:
        """La longitud mínima se aplica también fuera de la API (CLI)."""
        with pytest.raises(ValueError, match=f"al menos {MIN_PASSWORD_LENGTH}"):
            hash_password("corta1")

    def test_hash_rejects_password_over_bcrypt_limit(self) -> None:
        """bcrypt ignora lo que exceda de 72 bytes: se rechaza en vez de truncar."""
        with pytest.raises(ValueError, match=str(BCRYPT_MAX_PASSWORD_BYTES)):
            hash_password("á" * 40)  # 80 bytes en UTF-8


class TestRegistrationPassword:
    """Clave de alta entregada por administración."""

    def test_exact_match_is_accepted(self) -> None:
        """La clave correcta autoriza el alta."""
        assert matches_registration_password("Guadalix", "Guadalix") is True

    def test_surrounding_whitespace_is_ignored(self) -> None:
        """La clave se copia a mano: los espacios sobrantes no deben bloquear."""
        assert matches_registration_password("  Guadalix\n", "Guadalix") is True

    def test_wrong_password_is_rejected(self) -> None:
        """Cualquier otro valor debe fallar."""
        assert matches_registration_password("guadalix", "Guadalix") is False
        assert matches_registration_password("Guadal", "Guadalix") is False
        assert matches_registration_password("", "Guadalix") is False

    def test_default_registration_password_is_the_agreed_one(self) -> None:
        """El valor por defecto es el que administración entrega hoy."""
        assert Settings(_env_file=None).REGISTRATION_PASSWORD == "Guadalix"

    def test_blank_registration_password_is_rejected(self) -> None:
        """Una clave vacía abriría el alta a cualquiera."""
        with pytest.raises(ValueError, match="REGISTRATION_PASSWORD must be set"):
            Settings(_env_file=None, REGISTRATION_PASSWORD="   ")


class TestProfileDeletionRules:
    """Reglas de borrado definitivo de un perfil profesional."""

    def test_profile_without_links_can_be_deleted(self) -> None:
        """Sin registros vinculados el borrado es seguro."""
        counts = {"encounters": 0, "medication_requests": 0, "templates": 0}

        assert describe_deletion_block(counts) is None

    def test_encounters_block_deletion(self) -> None:
        """La firma de una consulta debe seguir siendo atribuible."""
        counts = {"encounters": 3, "medication_requests": 0, "templates": 0}
        reason = describe_deletion_block(counts)

        assert reason is not None
        assert "3 consulta(s)" in reason
        assert "deactivate" in reason

    def test_prescriptions_block_deletion(self) -> None:
        """Las recetas emitidas también anclan responsabilidad clínica."""
        counts = {"encounters": 0, "medication_requests": 2, "templates": 0}
        reason = describe_deletion_block(counts)

        assert reason is not None
        assert "2 prescripción(es)" in reason

    def test_templates_alone_do_not_block_deletion(self) -> None:
        """Las plantillas son configuración de la consulta, no historia clínica."""
        counts = {"encounters": 0, "medication_requests": 0, "templates": 5}

        assert describe_deletion_block(counts) is None


class TestEmailNormalization:
    """El email de acceso es la clave de login: siempre normalizado."""

    def test_email_is_lowercased_and_trimmed(self) -> None:
        """Mayúsculas o espacios accidentales no deben crear perfiles duplicados."""
        assert normalize_email("  Ana@ConsultaMed.ES ") == "ana@consultamed.es"
