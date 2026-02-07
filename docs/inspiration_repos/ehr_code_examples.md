# Ejemplos de Código: Patrones de Arquitectura EHR Clínicos

## Tabla de Contenidos
1. [FastAPI + PostgreSQL](#fastapi--postgresql)
2. [Next.js + Drizzle ORM](#nextjs--drizzle-orm)
3. [FHIR Integration](#fhir-integration)
4. [Seguridad y Auditoría](#seguridad-y-auditoría)
5. [Testing](#testing)

---

## FastAPI + PostgreSQL

### 1. Setup del Proyecto

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic
pip install python-jose[cryptography] python-multipart
pip install redis celery
pip install pytest pytest-asyncio httpx
```

### 2. Configuración Base (config.py)

```python
# app/core/config.py
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Healthcare EHR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    SQLALCHEMY_DATABASE_URL: str = "postgresql://user:password@localhost/healthcare_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Security
    ALLOWED_HOSTS: list = ["*"]
    CORS_ORIGINS: list = ["http://localhost:3000"]

    # Email (para notificaciones)
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "your-email@example.com"
    SMTP_PASSWORD: str = "your-password"

    class Config:
        env_file = ".env"

settings = Settings()
```

### 3. Modelos de Base de Datos (models.py)

```python
# app/db/models.py
from sqlalchemy import (
    Column, String, DateTime, Integer, Float, 
    Boolean, Enum, ForeignKey, JSON, Text, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"
    RECEPTIONIST = "receptionist"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(20))
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patients = relationship("Patient", back_populates="created_by_user")
    encounters_as_doctor = relationship("Encounter", back_populates="doctor")

    __table_args__ = (
        Index('idx_user_email', 'email'),
        Index('idx_user_role', 'role'),
    )

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Datos demográficos
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    gender = Column(String(20))  # "M", "F", "Other"
    blood_type = Column(String(5))  # "O+", "A-", etc.

    # Contacto
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    postal_code = Column(String(20))

    # Datos médicos
    allergies = Column(JSONB, default=list)
    chronic_conditions = Column(JSONB, default=list)
    surgeries = Column(JSONB, default=list)
    family_history = Column(JSONB, default=dict)

    # Identificadores
    insurance_provider = Column(String(255))
    insurance_number_encrypted = Column(String(500))
    ssn_encrypted = Column(String(500))

    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])
    encounters = relationship("Encounter", back_populates="patient")
    medications = relationship("MedicationRequest", back_populates="patient")
    observations = relationship("Observation", back_populates="patient")

class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    encounter_type = Column(String(50), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(255))

    chief_complaint = Column(Text)
    reason_for_visit = Column(Text)
    assessment = Column(Text)
    plan = Column(Text)
    notes = Column(Text)

    diagnoses = Column(JSONB, default=list)
    status = Column(String(50), default="completed")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    doctor = relationship("User", back_populates="encounters_as_doctor")
    observations = relationship("Observation", back_populates="encounter")

class MedicationRequest(Base):
    __tablename__ = "medication_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    medication_name = Column(String(255), nullable=False)
    medication_code = Column(String(50))
    strength = Column(String(50))
    route = Column(String(50))
    frequency = Column(String(100))
    duration_days = Column(Integer)
    quantity = Column(Integer)
    indication = Column(Text)
    notes = Column(Text)

    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="medications")
    doctor = relationship("User", foreign_keys=[doctor_id])

class Observation(Base):
    __tablename__ = "observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.id"), nullable=True)

    code = Column(String(50), nullable=False)
    code_display = Column(String(255))
    value_numeric = Column(Float)
    value_string = Column(String(500))
    unit = Column(String(50))

    reference_low = Column(Float)
    reference_high = Column(Float)
    normal_status = Column(String(20))

    effective_datetime = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="final")

    # Relationships
    patient = relationship("Patient", back_populates="observations")
    encounter = relationship("Encounter", back_populates="observations")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(255))
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    ip_address = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")
```

### 4. Schemas Pydantic (schemas.py)

```python
# app/schemas/patient.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime

class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    date_of_birth: datetime
    gender: str = Field(..., regex="^(M|F|Other)$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class PatientCreate(PatientBase):
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None

    @validator('date_of_birth')
    def validate_age(cls, v):
        age = (datetime.utcnow() - v).days // 365
        if age < 0 or age > 150:
            raise ValueError('Invalid age')
        return v

class PatientResponse(PatientBase):
    id: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class EncounterCreate(BaseModel):
    patient_id: str
    encounter_type: str = Field(..., regex="^(consultation|followup|urgent)$")
    start_time: datetime
    end_time: datetime
    chief_complaint: str
    assessment: str
    plan: str
```

### 5. CRUD Operations (crud.py)

```python
# app/crud/patient.py
from sqlalchemy.orm import Session
from app.db.models import Patient
from app.schemas.patient import PatientCreate
from uuid import UUID
from datetime import datetime

class PatientCRUD:
    @staticmethod
    def create(db: Session, patient_data: PatientCreate, created_by: UUID) -> Patient:
        db_patient = Patient(
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            email=patient_data.email,
            phone=patient_data.phone,
            created_by=created_by
        )
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        return db_patient

    @staticmethod
    def get_by_id(db: Session, patient_id: UUID) -> Patient:
        return db.query(Patient).filter(Patient.id == patient_id).first()

    @staticmethod
    def list_active(db: Session, skip: int = 0, limit: int = 100) -> list:
        return db.query(Patient).filter(
            Patient.is_active == True
        ).offset(skip).limit(limit).all()

    @staticmethod
    def search(db: Session, query: str) -> list:
        return db.query(Patient).filter(
            (Patient.first_name.ilike(f"%{query}%")) |
            (Patient.last_name.ilike(f"%{query}%")) |
            (Patient.email.ilike(f"%{query}%"))
        ).all()
```

### 6. API Routes (routes.py)

```python
# app/api/routes/patients.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.schemas.patient import PatientCreate, PatientResponse
from app.crud.patient import PatientCRUD
from app.core.security import get_current_user
from app.core.database import get_db
from app.db.models import User, UserRole
from uuid import UUID

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create patients"
        )

    patient = PatientCRUD.create(db, patient_data, current_user.id)
    return patient

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = PatientCRUD.get_by_id(db, patient_id)

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    return patient

@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if search:
        patients = PatientCRUD.search(db, search)
    else:
        patients = PatientCRUD.list_active(db, skip, limit)

    return patients
```

### 7. Seguridad (security.py)

```python
# app/core/security.py
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
security = HTTPBearer()

class SecurityService:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        to_encode.update({"exp": expire})
        return jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
```

---

## Next.js + Drizzle ORM

### 1. Schema Drizzle (schema.ts)

```typescript
// app/db/schema.ts
import { 
  pgTable, 
  uuid, 
  varchar, 
  timestamp, 
  boolean,
  text,
  jsonb,
  index
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  hashedPassword: varchar('hashed_password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_user_email').on(table.email),
}));

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  gender: varchar('gender', { length: 20 }),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  allergies: jsonb('allergies').default([]),
  chronicConditions: jsonb('chronic_conditions').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true),
});

export const encounters = pgTable('encounters', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  doctorId: uuid('doctor_id').notNull().references(() => users.id),
  encounterType: varchar('encounter_type', { length: 50 }).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  chiefComplaint: text('chief_complaint'),
  assessment: text('assessment'),
  plan: text('plan'),
  status: varchar('status', { length: 50 }).default('completed'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 2. Database Queries (queries.ts)

```typescript
// app/db/queries.ts
import { db } from '@/db';
import { patients, encounters } from '@/db/schema';
import { eq, like, or } from 'drizzle-orm';

export async function getPatient(patientId: string) {
  const patient = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  return patient[0];
}

export async function listPatients(limit = 100, offset = 0) {
  return await db
    .select()
    .from(patients)
    .where(eq(patients.isActive, true))
    .limit(limit)
    .offset(offset);
}

export async function searchPatients(searchQuery: string) {
  return await db
    .select()
    .from(patients)
    .where(
      or(
        like(patients.firstName, `%${searchQuery}%`),
        like(patients.lastName, `%${searchQuery}%`),
        like(patients.email, `%${searchQuery}%`)
      )
    );
}

export async function createPatient(patientData: typeof patients.$inferInsert) {
  const [result] = await db
    .insert(patients)
    .values(patientData)
    .returning();

  return result;
}

export async function getPatientEncounters(patientId: string) {
  return await db
    .select()
    .from(encounters)
    .where(eq(encounters.patientId, patientId));
}
```

### 3. API Routes (route.ts)

```typescript
// app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listPatients, searchPatients, createPatient } from '@/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let patients;
    if (searchQuery) {
      patients = await searchPatients(searchQuery);
    } else {
      patients = await listPatients(limit, offset);
    }

    return NextResponse.json(patients);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const patientData = await request.json();

    if (!patientData.firstName || !patientData.lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const patient = await createPatient(patientData);
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## FHIR Integration

```python
# app/fhir/patient.py
from fhir.resources.patient import Patient as FHIRPatient
from fhir.resources.humanname import HumanName
from fhir.resources.contactpoint import ContactPoint

class FHIRPatientMapper:
    @staticmethod
    def to_fhir(db_patient) -> dict:
        names = [
            HumanName(
                use="official",
                given=[db_patient.first_name],
                family=db_patient.last_name
            )
        ]

        telecoms = []
        if db_patient.email:
            telecoms.append(
                ContactPoint(
                    system="email",
                    value=db_patient.email
                )
            )

        fhir_patient = FHIRPatient(
            id=str(db_patient.id),
            resourceType="Patient",
            name=names,
            telecom=telecoms,
            gender=db_patient.gender.lower() if db_patient.gender else None,
            birthDate=db_patient.date_of_birth.isoformat()
        )

        return fhir_patient.dict(exclude_none=True)
```

---

## Testing

```python
# tests/test_patients.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_patient():
    response = client.post(
        "/api/patients/",
        json={
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1995-05-15T00:00:00",
            "gender": "F",
            "email": "jane@example.com"
        }
    )
    assert response.status_code == 201
    assert response.json()["first_name"] == "Jane"

def test_list_patients():
    response = client.get("/api/patients/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

---

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: healthcare_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: healthcare_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://healthcare_user:secure_password@postgres:5432/healthcare_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

volumes:
  postgres_data:
```

---

*Última actualización: Febrero 2026*
*Ejemplos de código para equipo de desarrollo*
