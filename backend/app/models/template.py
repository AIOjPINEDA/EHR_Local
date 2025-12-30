"""
ConsultaMed Backend - TreatmentTemplate Model
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class TreatmentTemplate(Base):
    """
    TreatmentTemplate model (simplified FHIR PlanDefinition).
    
    Predefined treatment protocols for common diagnoses.
    """
    __tablename__ = "treatment_templates"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # Identification
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Nombre del template"
    )
    
    # Associated Diagnosis (for auto-loading)
    diagnosis_text: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        comment="Diagnóstico asociado"
    )
    diagnosis_code: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="Código CIE-10"
    )
    
    # Medications (JSONB array)
    # Structure: [{ "medication": "...", "dosage": "...", "duration": "..." }, ...]
    medications: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=list
    )
    
    # Additional instructions
    instructions: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Organization
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Ownership
    practitioner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("practitioners.id"),
        nullable=True,
        comment="NULL = template global"
    )
    
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
    practitioner = relationship("Practitioner", back_populates="templates")
    
    def __repr__(self) -> str:
        return f"<Template {self.name}>"
