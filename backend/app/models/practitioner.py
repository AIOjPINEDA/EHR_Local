"""
ConsultaMed Backend - Practitioner Model (FHIR Practitioner)
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Practitioner(Base):
    """
    Practitioner model (FHIR Practitioner resource).
    
    Represents medical professionals using the system.
    """
    __tablename__ = "practitioners"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # Identifier (Nº Colegiado)
    identifier_value: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        comment="Nº Colegiado"
    )
    identifier_system: Mapped[str] = mapped_column(
        String(100),
        default="urn:oid:2.16.724.4.9.10.5",
        comment="OID Colegio Médicos España"
    )
    
    # Name
    name_given: Mapped[str] = mapped_column(String(100), nullable=False)
    name_family: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Qualification
    qualification_code: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="Especialidad médica"
    )
    
    # Telecom
    telecom_email: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Authentication
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
        comment="Bcrypt password hash"
    )
    
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
    encounters = relationship("Encounter", back_populates="practitioner")
    templates = relationship("TreatmentTemplate", back_populates="practitioner")
    
    @property
    def full_name(self) -> str:
        """Full name with title."""
        return f"Dr/Dra. {self.name_given} {self.name_family}"
    
    def __repr__(self) -> str:
        return f"<Practitioner {self.identifier_value}: {self.name_family}>"
