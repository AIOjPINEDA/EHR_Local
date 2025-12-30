"""
ConsultaMed Backend - API Router
"""
from fastapi import APIRouter

from app.api import auth, patients, encounters, templates, prescriptions

api_router = APIRouter()

# Include sub-routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["Encounters"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
