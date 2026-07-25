"""
ConsultaMed Backend - Practitioner Service

Lógica de negocio para el alta, listado y administración de perfiles
profesionales (FHIR R5 Practitioner).

Las operaciones destructivas (`deactivate`, `delete`) existen a nivel de
servicio y CLI, pero **no** se exponen en la API ni en la UI: dar de baja a un
profesional afecta a la trazabilidad de la historia clínica y se hace de forma
deliberada desde `backend/scripts/manage_practitioners.py`.
"""
from typing import Any, Mapping, Optional

from sqlalchemy import func, select, update

from app.models.encounter import Encounter
from app.models.medication_request import MedicationRequest
from app.models.practitioner import Practitioner
from app.models.template import TreatmentTemplate
from app.services.base import BaseService
from app.services.security import hash_password

# Registros que anclan responsabilidad clínica sobre un profesional. Mientras
# existan, el perfil no puede borrarse: la firma de una consulta o de una receta
# debe seguir siendo atribuible.
CLINICAL_LINK_LABELS = {
    "encounters": "consulta(s)",
    "medication_requests": "prescripción(es)",
}


def describe_deletion_block(counts: Mapping[str, int]) -> Optional[str]:
    """
    Explica por qué un perfil no puede borrarse, o None si el borrado es seguro.

    Args:
        counts: registros vinculados por tipo (`encounters`, `medication_requests`).

    Returns:
        Mensaje en español apto para CLI, o None si no hay bloqueo.
    """
    blocking = [
        f"{counts.get(key, 0)} {label}"
        for key, label in CLINICAL_LINK_LABELS.items()
        if counts.get(key, 0) > 0
    ]

    if not blocking:
        return None

    return (
        "El profesional tiene historia clínica asociada ("
        + ", ".join(blocking)
        + "). Usa 'deactivate' para retirarle el acceso sin romper la trazabilidad."
    )


def normalize_email(email: str) -> str:
    """Los emails de acceso se guardan y comparan siempre en minúsculas."""
    return email.strip().lower()


class PractitionerService(BaseService[Practitioner]):
    """
    Operaciones sobre el recurso Practitioner.

    - get_by_email() / get_by_id(): FHIR Read
    - list_active(): FHIR Search
    - create(): FHIR Create
    - set_active() / delete(): administración (solo CLI)
    """

    async def get_by_id(self, practitioner_id: str) -> Optional[Practitioner]:
        """Obtiene un profesional por su ID."""
        stmt = select(Practitioner).where(Practitioner.id == practitioner_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Practitioner]:
        """Obtiene un profesional por email de acceso (sin distinguir mayúsculas)."""
        stmt = select(Practitioner).where(
            func.lower(Practitioner.telecom_email) == normalize_email(email)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_identifier(self, identifier_value: str) -> Optional[Practitioner]:
        """Obtiene un profesional por Nº Colegiado."""
        stmt = select(Practitioner).where(
            Practitioner.identifier_value == identifier_value.strip()
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Practitioner]:
        """Lista todos los perfiles, activos e inactivos (uso administrativo)."""
        stmt = select(Practitioner).order_by(
            Practitioner.name_family, Practitioner.name_given
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_active(self) -> list[Practitioner]:
        """Lista los perfiles que pueden iniciar sesión."""
        stmt = (
            select(Practitioner)
            .where(Practitioner.active.is_(True))
            .order_by(Practitioner.name_family, Practitioner.name_given)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict[str, Any]) -> Practitioner:
        """
        Crea un perfil profesional con contraseña propia.

        Raises:
            ValueError: si el email o el Nº Colegiado ya están en uso, o si la
                contraseña no cumple los requisitos de bcrypt.
        """
        email = normalize_email(data["telecom_email"])
        identifier_value = str(data["identifier_value"]).strip()

        if await self.get_by_email(email):
            raise ValueError(f"Ya existe un perfil con el email {email}")

        if await self.get_by_identifier(identifier_value):
            raise ValueError(f"Ya existe un perfil con el Nº Colegiado {identifier_value}")

        practitioner = Practitioner(
            identifier_value=identifier_value,
            name_given=data["name_given"],
            name_family=data["name_family"],
            qualification_code=data.get("qualification_code"),
            telecom_email=email,
            password_hash=hash_password(data["password"]),
            active=True,
        )

        self.db.add(practitioner)
        await self.commit_and_refresh(practitioner)
        return practitioner

    async def set_password(self, practitioner_id: str, password: str) -> Optional[Practitioner]:
        """Reasigna la contraseña de un perfil (solo CLI administrativo)."""
        practitioner = await self.get_by_id(practitioner_id)
        if not practitioner:
            return None

        practitioner.password_hash = hash_password(password)
        await self.commit_and_refresh(practitioner)
        return practitioner

    async def set_active(self, practitioner_id: str, active: bool) -> Optional[Practitioner]:
        """
        Activa o desactiva un perfil (solo CLI administrativo).

        Un perfil inactivo no puede iniciar sesión ni aparece en el selector de
        acceso, pero conserva intacta su historia clínica firmada.
        """
        practitioner = await self.get_by_id(practitioner_id)
        if not practitioner:
            return None

        practitioner.active = active
        await self.commit_and_refresh(practitioner)
        return practitioner

    async def count_linked_records(self, practitioner_id: str) -> dict[str, int]:
        """Cuenta los registros que dependen de un profesional."""
        counts: dict[str, int] = {}

        for key, column in (
            ("encounters", Encounter.participant_id),
            ("medication_requests", MedicationRequest.requester_id),
            ("templates", TreatmentTemplate.practitioner_id),
        ):
            stmt = select(func.count()).where(column == practitioner_id)
            result = await self.db.execute(stmt)
            counts[key] = int(result.scalar_one() or 0)

        return counts

    async def delete(self, practitioner_id: str) -> bool:
        """
        Borra definitivamente un perfil (solo CLI administrativo).

        Las plantillas de tratamiento son configuración compartida de la consulta:
        se desvinculan del profesional en lugar de borrarse. Las consultas y
        prescripciones son historia clínica y bloquean el borrado.

        Returns:
            True si se borró, False si el perfil no existe.

        Raises:
            ValueError: si el perfil tiene historia clínica asociada.
        """
        practitioner = await self.get_by_id(practitioner_id)
        if not practitioner:
            return False

        counts = await self.count_linked_records(practitioner_id)
        blocked_reason = describe_deletion_block(counts)
        if blocked_reason:
            raise ValueError(blocked_reason)

        if counts.get("templates", 0) > 0:
            await self.db.execute(
                update(TreatmentTemplate)
                .where(TreatmentTemplate.practitioner_id == practitioner_id)
                .values(practitioner_id=None)
            )

        await self.db.delete(practitioner)
        await self.db.commit()
        return True
