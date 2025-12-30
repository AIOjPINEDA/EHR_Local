"""
ConsultaMed Backend - MedicationRequest Model (FHIR MedicationRequest)
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class MedicationRequest(Base):
    """
    MedicationRequest model (FHIR MedicationRequest resource).
    
    Represents medication prescriptions.
    """
    __tablename__ = "medication_requests"
    
    # Primary Key
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4())
    )
    
    # Status & Intent
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        comment="active|on-hold|ended|stopped|completed|cancelled|draft"
    )
    intent: Mapped[str] = mapped_column(
        String(20),
        default="order"
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
    requester_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("practitioners.id"),
        nullable=False
    )
    
    # Medication
    medication_text: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Nombre del medicamento"
    )
    medication_code: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="SNOMED-CT opcional"
    )
    medication_system: Mapped[str] = mapped_column(
        String(100),
        default="http://snomed.info/sct"
    )
    
    # Dosage
    dosage_text: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Pauta completa en texto"
    )
    dosage_timing_code: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
        comment="TID, BID, QD, etc."
    )
    
    # Duration
    duration_value: Mapped[int] = mapped_column(Integer, nullable=True)
    duration_unit: Mapped[str] = mapped_column(
        String(10),
        nullable=True,
        comment="s|min|h|d|wk|mo|a (UCUM)"
    )
    
    # Meta
    authored_on: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    
    # Relationships
    patient = relationship("Patient", back_populates="medication_requests")
    encounter = relationship("Encounter", back_populates="medications")
    
    @property
    def duration_display(self) -> str:
        """Human-readable duration."""
        if not self.duration_value:
            return ""
        
        units = {
            "d": "días",
            "wk": "semanas",
            "mo": "meses",
            "h": "horas",
        }
        unit_text = units.get(self.duration_unit, self.duration_unit)
        return f"{self.duration_value} {unit_text}"
    
    def __repr__(self) -> str:
        return f"<MedicationRequest {self.medication_text}>"
