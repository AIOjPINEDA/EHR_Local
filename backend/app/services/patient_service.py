"""
ConsultaMed Backend - Patient Service

Lógica de negocio para gestión de pacientes.
Operaciones alineadas con FHIR R5 interactions.
"""
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Any
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.services.base import BaseService
from app.models.patient import Patient
from app.models.allergy import AllergyIntolerance
from app.models.encounter import Encounter
from app.validators.dni import validate_documento_identidad, format_dni
from app.validators.clinical import validate_birth_date


class PatientService(BaseService[Patient]):
    """
    Service class for Patient resource operations (FHIR R5 Patient).

    Naming conventions:
    - get_by_id(): FHIR Read (get single resource by ID)
    - search(): FHIR Search (query with parameters)
    - create(): FHIR Create
    - update(): FHIR Update (partial, uses PATCH semantics)
    """

    @staticmethod
    def _build_search_conditions(query: str) -> List[Any]:
        """Construye condiciones SQL para listado/búsqueda de pacientes activos."""
        conditions: List[Any] = [Patient.active.is_(True)]
        normalized_query = query.strip()
        if normalized_query:
            search_term = f"%{normalized_query}%"
            conditions.append(
                or_(
                    Patient.name_given.ilike(search_term),
                    Patient.name_family.ilike(search_term),
                    Patient.identifier_value.ilike(search_term),
                )
            )
        return conditions
    
    async def search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[List[Patient], int]:
        """
        Search patients by name or DNI.
        
        Args:
            query: Search term (name or DNI)
            limit: Maximum results to return
            offset: Pagination offset
            
        Returns:
            Tuple of (patients list, total count)
        """
        conditions = self._build_search_conditions(query)

        stmt = (
            select(Patient)
            .options(selectinload(Patient.allergies))
            .where(*conditions)
            .order_by(Patient.name_family, Patient.name_given)
            .limit(limit)
            .offset(offset)
        )
        
        result = await self.db.execute(stmt)
        patients = result.scalars().all()
        
        count_stmt = select(func.count(Patient.id)).where(*conditions)
        count_result = await self.db.execute(count_stmt)
        total = int(count_result.scalar_one() or 0)
        
        return list(patients), total
    
    async def get_by_id(self, patient_id: str) -> Optional[Patient]:
        """Get patient by ID with allergies and recent encounters."""
        stmt = (
            select(Patient)
            .options(
                selectinload(Patient.allergies),
                selectinload(Patient.encounters),
            )
            .where(Patient.id == patient_id)
        )
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_encounter_stats(
        self,
        patient_ids: List[str],
    ) -> Dict[str, Tuple[int, Optional[datetime]]]:
        """Obtiene total y última consulta por paciente en una sola consulta agregada."""
        if not patient_ids:
            return {}

        stmt = (
            select(
                Encounter.subject_id.label("patient_id"),
                func.count(Encounter.id).label("encounter_count"),
                func.max(Encounter.period_start).label("last_encounter_at"),
            )
            .where(Encounter.subject_id.in_(patient_ids))
            .group_by(Encounter.subject_id)
        )
        result = await self.db.execute(stmt)

        stats: Dict[str, Tuple[int, Optional[datetime]]] = {}
        for row in result:
            stats[row.patient_id] = (
                int(row.encounter_count or 0),
                row.last_encounter_at,
            )

        return stats
    
    async def get_by_dni(self, dni: str) -> Optional[Patient]:
        """Get patient by DNI/NIE."""
        formatted_dni = format_dni(dni)
        
        stmt = select(Patient).where(Patient.identifier_value == formatted_dni)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create(self, data: dict) -> Patient:
        """
        Create new patient with validation.
        
        Args:
            data: Patient data dictionary
            
        Returns:
            Created patient
            
        Raises:
            ValueError: If validation fails
        """
        # Validate DNI/NIE
        is_valid, _ = validate_documento_identidad(data["identifier_value"])
        if not is_valid:
            raise ValueError("DNI/NIE inválido: la letra no corresponde")
        
        # Check for duplicates
        existing = await self.get_by_dni(data["identifier_value"])
        if existing:
            raise ValueError(f"Ya existe un paciente con DNI {data['identifier_value']}")
        
        # Validate birth date (lógica de negocio: rangos razonables)
        if "birth_date" in data:
            is_valid, error = validate_birth_date(data["birth_date"])
            if not is_valid:
                raise ValueError(error)

        # Note: gender validation is handled by Pydantic schema (PatientCreate)

        # Create patient
        patient = Patient(
            identifier_value=format_dni(data["identifier_value"]),
            name_given=data["name_given"],
            name_family=data["name_family"],
            birth_date=data["birth_date"],
            gender=data.get("gender"),
            telecom_phone=data.get("telecom_phone"),
            telecom_email=data.get("telecom_email"),
        )
        
        self.db.add(patient)
        await self.commit_and_refresh(patient)

        # Reload with relationships for response
        reloaded_patient = await self.get_by_id(str(patient.id))
        if reloaded_patient is None:
            raise ValueError("No se pudo recargar el paciente tras crearlo")
        return reloaded_patient
    
    async def update(self, patient_id: str, data: dict) -> Optional[Patient]:
        """Update patient data."""
        patient = await self.get_by_id(patient_id)
        if not patient:
            return None

        # Campos obligatorios en DB: no aceptan null ni vacío
        required_fields = ("name_given", "name_family", "birth_date")
        for field in required_fields:
            if field in data and data[field] is None:
                raise ValueError(f"El campo '{field}' no puede ser null")
            if field in ("name_given", "name_family") and field in data:
                value = data[field]
                if isinstance(value, str) and not value.strip():
                    raise ValueError(f"El campo '{field}' no puede estar vacío")
        
        # Validate clinical fields before applying (solo lógica de negocio)
        if "birth_date" in data:
            is_valid, error = validate_birth_date(data["birth_date"])
            if not is_valid:
                raise ValueError(error)

        # Note: gender validation is handled by Pydantic schema (PatientUpdate)

        # Update allowed fields
        allowed_fields = [
            "name_given", "name_family", "birth_date", "gender",
            "telecom_phone", "telecom_email"
        ]
        
        for field in allowed_fields:
            if field in data:
                setattr(patient, field, data[field])

        await self.commit_and_refresh(patient)
        return patient
    
    async def add_allergy(self, patient_id: str, allergy_data: dict) -> AllergyIntolerance:
        """Add allergy to patient."""
        allergy = AllergyIntolerance(
            patient_id=patient_id,
            code_text=allergy_data["code_text"],
            type=allergy_data.get("type", "allergy"),
            category=allergy_data.get("category"),
            criticality=allergy_data.get("criticality"),
            clinical_status="active",
        )
        
        self.db.add(allergy)
        await self.commit_and_refresh(allergy)
        return allergy
    
    async def remove_allergy(self, patient_id: str, allergy_id: str) -> bool:
        """Remove allergy from patient."""
        stmt = select(AllergyIntolerance).where(
            AllergyIntolerance.id == allergy_id,
            AllergyIntolerance.patient_id == patient_id
        )
        
        result = await self.db.execute(stmt)
        allergy = result.scalar_one_or_none()
        
        if not allergy:
            return False
        
        await self.db.delete(allergy)
        await self.db.commit()
        
        return True
