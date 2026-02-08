"""
ConsultaMed Backend - Encounter Model (FHIR Encounter)
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Encounter(Base):
    """
    Encounter model (FHIR Encounter resource).
    
    Represents medical consultations/visits.
    """
    __tablename__ = "encounters"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # Status & Class
    status: Mapped[str] = mapped_column(
        String(20),
        default="finished",
        comment="planned|in-progress|on-hold|discharged|finished|cancelled"
    )
    class_code: Mapped[str] = mapped_column(
        String(10),
        default="AMB",
        comment="Ambulatorio"
    )
    
    # References
    subject_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False
    )
    participant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("practitioners.id"),
        nullable=False
    )
    
    # Period
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Reason
    reason_text: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="Motivo de consulta"
    )
    
    # SOAP fields
    subjective_text: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="Subjetivo (S)"
    )
    objective_text: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="Objetivo (O)"
    )
    assessment_text: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="Análisis / Impresión clínica (A)"
    )
    plan_text: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="Plan terapéutico (P)"
    )
    recommendations_text: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="Recomendaciones al paciente"
    )
    
    # Legacy note (backward compatibility)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    practitioner = relationship("Practitioner", back_populates="encounters")
    conditions = relationship("Condition", back_populates="encounter", cascade="all, delete-orphan")
    medications = relationship("MedicationRequest", back_populates="encounter", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Encounter {self.id[:8]} - {self.period_start}>"
