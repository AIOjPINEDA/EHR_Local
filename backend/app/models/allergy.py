"""
ConsultaMed Backend - AllergyIntolerance Model (FHIR AllergyIntolerance)
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AllergyIntolerance(Base):
    """
    AllergyIntolerance model (FHIR AllergyIntolerance resource).
    
    Records allergies and intolerances for patients.
    """
    __tablename__ = "allergy_intolerances"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # References
    patient_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Clinical Status
    clinical_status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        comment="active|inactive|resolved"
    )
    
    # Type & Category
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="allergy|intolerance"
    )
    category: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="food|medication|environment|biologic"
    )
    criticality: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="low|high|unable-to-assess"
    )
    
    # Code (Allergy name)
    code_text: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Nombre de la alergia"
    )
    code_coding_code: Mapped[str] = mapped_column(String(20), nullable=True)
    code_coding_system: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Meta
    recorded_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    
    # Relationships
    patient = relationship("Patient", back_populates="allergies")
    
    def __repr__(self) -> str:
        return f"<Allergy {self.code_text} ({self.criticality})>"
