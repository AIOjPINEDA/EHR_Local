"""
ConsultaMed Backend - Patient Schemas
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


class AllergyBase(BaseModel):
    """Base schema for allergies."""
    code_text: str = Field(..., min_length=1, max_length=200)
    type: Optional[str] = Field(None, pattern="^(allergy|intolerance)$")
    category: Optional[str] = Field(None, pattern="^(food|medication|environment|biologic)$")
    criticality: Optional[str] = Field(None, pattern="^(low|high|unable-to-assess)$")


class AllergyCreate(AllergyBase):
    """Schema for creating an allergy."""
    pass


class AllergyResponse(AllergyBase):
    """Schema for allergy response."""
    id: str
    clinical_status: str
    recorded_date: datetime
    
    class Config:
        from_attributes = True


class PatientBase(BaseModel):
    """Base schema for patients."""
    identifier_value: str = Field(..., min_length=9, max_length=9, description="DNI/NIE")
    name_given: str = Field(..., min_length=1, max_length=100)
    name_family: str = Field(..., min_length=1, max_length=100)
    birth_date: date
    gender: Optional[str] = Field(None, pattern="^(male|female|other|unknown)$")
    telecom_phone: Optional[str] = Field(None, max_length=20)
    telecom_email: Optional[EmailStr] = None


class PatientCreate(PatientBase):
    """Schema for creating a patient."""
    pass


class PatientUpdate(BaseModel):
    """Schema for updating a patient (partial)."""
    name_given: Optional[str] = Field(None, min_length=1, max_length=100)
    name_family: Optional[str] = Field(None, min_length=1, max_length=100)
    birth_date: Optional[date] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|unknown)$")
    telecom_phone: Optional[str] = Field(None, max_length=20)
    telecom_email: Optional[EmailStr] = None


class PatientSummary(BaseModel):
    """Schema for patient in search results."""
    id: str
    identifier_value: str
    name_given: str
    name_family: str
    birth_date: date
    age: int
    gender: Optional[str]
    telecom_phone: Optional[str]
    has_allergies: bool
    allergy_count: int
    
    class Config:
        from_attributes = True


class PatientResponse(PatientBase):
    """Full patient response with allergies and encounters."""
    id: str
    age: int
    allergies: List[AllergyResponse] = []
    meta_created_at: datetime
    meta_updated_at: datetime
    
    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    """Paginated list of patients."""
    items: List[PatientSummary]
    total: int
    limit: int
    offset: int
