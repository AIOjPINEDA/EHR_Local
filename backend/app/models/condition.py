"""
ConsultaMed Backend - Condition Model (FHIR Condition)
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Condition(Base):
    """
    Condition model (FHIR Condition resource).
    
    Represents clinical diagnoses.
    """
    __tablename__ = "conditions"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # References
    subject_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False
    )
    encounter_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("encounters.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Code (Diagnosis)
    code_text: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Texto del diagnóstico"
    )
    code_coding_code: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="Código CIE-10"
    )
    code_coding_system: Mapped[str] = mapped_column(
        String(100),
        default="http://hl7.org/fhir/sid/icd-10"
    )
    code_coding_display: Mapped[str] = mapped_column(String(200), nullable=True)
    
    # Clinical Status
    clinical_status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        comment="active|recurrence|relapse|inactive|remission|resolved"
    )
    
    # Meta
    recorded_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    
    # Relationships
    patient = relationship("Patient", back_populates="conditions")
    encounter = relationship("Encounter", back_populates="conditions")
    
    def __repr__(self) -> str:
        return f"<Condition {self.code_text}>"
