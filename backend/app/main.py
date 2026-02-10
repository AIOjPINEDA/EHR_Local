"""
ConsultaMed Backend - FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.__version__ import __version__
from app.config import settings
from app.api.router import api_router

app = FastAPI(
    title="ConsultaMed API",
    description="API para gestión de consultas médicas",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware - Allow both localhost and 127.0.0.1
cors_origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "ConsultaMed API",
        "version": __version__,
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check for deployment monitoring."""
    return {"status": "healthy"}
