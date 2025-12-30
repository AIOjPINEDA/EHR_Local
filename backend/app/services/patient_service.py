"""
ConsultaMed Backend - Patient Service

Lógica de negocio para gestión de pacientes.
"""
from typing import Optional, List
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.patient import Patient
from app.models.allergy import AllergyIntolerance
from app.validators.dni import validate_documento_identidad, format_dni
from app.validators.clinical import validate_birth_date, validate_gender


class PatientService:
    """Service class for patient operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
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
        query_lower = query.lower()
        
        # Build search conditions
        stmt = (
            select(Patient)
            .options(selectinload(Patient.allergies))
            .where(
                Patient.active == True,
                or_(
                    Patient.name_given.ilike(f"%{query}%"),
                    Patient.name_family.ilike(f"%{query}%"),
                    Patient.identifier_value.ilike(f"%{query}%"),
                )
            )
            .order_by(Patient.name_family, Patient.name_given)
            .limit(limit)
            .offset(offset)
        )
        
        result = await self.db.execute(stmt)
        patients = result.scalars().all()
        
        # Get total count
        count_stmt = (
            select(Patient)
            .where(
                Patient.active == True,
                or_(
                    Patient.name_given.ilike(f"%{query}%"),
                    Patient.name_family.ilike(f"%{query}%"),
                    Patient.identifier_value.ilike(f"%{query}%"),
                )
            )
        )
        count_result = await self.db.execute(count_stmt)
        total = len(count_result.scalars().all())
        
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
        is_valid, doc_type = validate_documento_identidad(data["identifier_value"])
        if not is_valid:
            raise ValueError(f"DNI/NIE inválido: la letra no corresponde")
        
        # Check for duplicates
        existing = await self.get_by_dni(data["identifier_value"])
        if existing:
            raise ValueError(f"Ya existe un paciente con DNI {data['identifier_value']}")
        
        # Validate birth date
        if "birth_date" in data:
            is_valid, error = validate_birth_date(data["birth_date"])
            if not is_valid:
                raise ValueError(error)
        
        # Validate gender
        if "gender" in data:
            is_valid, error = validate_gender(data.get("gender"))
            if not is_valid:
                raise ValueError(error)
        
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
        await self.db.commit()
        await self.db.refresh(patient)
        
        return patient
    
    async def update(self, patient_id: str, data: dict) -> Optional[Patient]:
        """Update patient data."""
        patient = await self.get_by_id(patient_id)
        if not patient:
            return None
        
        # Update allowed fields
        allowed_fields = [
            "name_given", "name_family", "birth_date", "gender",
            "telecom_phone", "telecom_email"
        ]
        
        for field in allowed_fields:
            if field in data:
                setattr(patient, field, data[field])
        
        await self.db.commit()
        await self.db.refresh(patient)
        
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
        await self.db.commit()
        await self.db.refresh(allergy)
        
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
