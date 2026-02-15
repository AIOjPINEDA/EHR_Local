"""
ConsultaMed Backend - Authentication Endpoints

MVP simple: JWT local sin Supabase Auth para desarrollo rápido.
"""
from datetime import datetime, timedelta
from typing import Optional, cast
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from app.config import settings
from app.database import get_db
from app.api.exceptions import raise_unauthorized
from app.models.practitioner import Practitioner

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class PractitionerResponse(BaseModel):
    """Practitioner response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    identifier_value: str
    name_given: str
    name_family: str
    qualification_code: Optional[str]
    telecom_email: Optional[str]


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    practitioner: PractitionerResponse





def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return cast(str, jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM))


async def get_current_practitioner(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Practitioner:
    """Dependency to get current authenticated practitioner."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        practitioner_id: str = payload.get("sub")
        if practitioner_id is None:
            raise_unauthorized("Credenciales inválidas")
    except JWTError:
        raise_unauthorized("Credenciales inválidas")

    stmt = select(Practitioner).where(Practitioner.id == practitioner_id)
    result = await db.execute(stmt)
    practitioner = result.scalar_one_or_none()

    if practitioner is None:
        raise_unauthorized("Credenciales inválidas")
    return practitioner


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """
    Login endpoint.
    
    Para MVP: busca practitioner por email, password es "demo" para cualquier usuario.
    En producción: integrar con Supabase Auth.
    """
    # Buscar practitioner por email
    stmt = select(Practitioner).where(Practitioner.telecom_email == form_data.username)
    result = await db.execute(stmt)
    practitioner = result.scalar_one_or_none()

    if not practitioner:
        raise_unauthorized("Email o contraseña incorrectos")

    # Verify password using bcrypt
    import bcrypt

    if not practitioner.password_hash:
        raise_unauthorized("Email o contraseña incorrectos")

    if not bcrypt.checkpw(form_data.password.encode('utf-8'), practitioner.password_hash.encode('utf-8')):
        raise_unauthorized("Email o contraseña incorrectos")
    
    # Crear token
    access_token = create_access_token(data={"sub": practitioner.id})
    
    return TokenResponse(
        access_token=access_token,
        practitioner=PractitionerResponse.model_validate(practitioner),
    )


@router.get("/me", response_model=PractitionerResponse)
async def get_me(
    current_user: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """
    Get current authenticated user.
    
    Returns practitioner data for the authenticated user.
    """
    return current_user
