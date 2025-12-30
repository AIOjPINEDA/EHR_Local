"""
ConsultaMed Backend - Patient Model (FHIR Patient)
"""
from datetime import datetime, date
from uuid import uuid4
from sqlalchemy import String, Boolean, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Patient(Base):
    """
    Patient model (FHIR Patient resource).
    
    Represents patients in the consultory.
    """
    __tablename__ = "patients"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # Identifier (DNI/NIE)
    identifier_value: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        comment="DNI o NIE"
    )
    identifier_system: Mapped[str] = mapped_column(
        String(100),
        default="urn:oid:1.3.6.1.4.1.19126.3",
        comment="OID DNI España"
    )
    
    # Name
    name_given: Mapped[str] = mapped_column(String(100), nullable=False)
    name_family: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Demographics
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(
        String(10),
        nullable=True,
        comment="male|female|other|unknown"
    )
    
    # Telecom
    telecom_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    telecom_email: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Status
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Meta
    meta_created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    meta_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relationships
    allergies = relationship("AllergyIntolerance", back_populates="patient", cascade="all, delete-orphan")
    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")
    conditions = relationship("Condition", back_populates="patient", cascade="all, delete-orphan")
    medication_requests = relationship("MedicationRequest", back_populates="patient", cascade="all, delete-orphan")
    
    @property
    def full_name(self) -> str:
        """Full name."""
        return f"{self.name_given} {self.name_family}"
    
    @property
    def age(self) -> int:
        """Calculate age from birth_date."""
        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )
    
    @property
    def has_allergies(self) -> bool:
        """Check if patient has active allergies."""
        return any(a.clinical_status == "active" for a in self.allergies)
    
    def __repr__(self) -> str:
        return f"<Patient {self.identifier_value}: {self.name_family}>"
