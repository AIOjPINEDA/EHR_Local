"""
ConsultaMed Backend - Authentication Endpoints

Autenticación local con JWT (PyJWT) y bcrypt, y alta de nuevos perfiles
profesionales autorizada por la clave que entrega administración.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, cast

import jwt
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.api.exceptions import raise_bad_request, raise_forbidden, raise_unauthorized
from app.database import get_db
from app.models.practitioner import Practitioner
from app.schemas.practitioner import (
    PractitionerCreate,
    PractitionerPublicSummary,
    PractitionerResponse,
    TokenResponse,
)
from app.services.practitioner_service import PractitionerService
from app.services.security import matches_registration_password, verify_password

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

INVALID_CREDENTIALS_DETAIL = "Email o contraseña incorrectos"
INACTIVE_PROFILE_DETAIL = "Este perfil está desactivado. Contacta con administración."


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
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
    except jwt.InvalidTokenError:
        raise_unauthorized("Credenciales inválidas")

    practitioner = await PractitionerService(db).get_by_id(practitioner_id)

    if practitioner is None:
        raise_unauthorized("Credenciales inválidas")

    # Un perfil desactivado deja de tener acceso aunque su token siga vigente.
    if not practitioner.active:
        raise_unauthorized(INACTIVE_PROFILE_DETAIL)

    return practitioner


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """
    Login endpoint.

    Autentica al practitioner por email y contraseña verificando el `password_hash`
    almacenado con bcrypt y devuelve un token JWT de acceso.
    """
    practitioner = await PractitionerService(db).get_by_email(form_data.username)

    # La verificación se ejecuta también cuando el email no existe para que el
    # tiempo de respuesta no revele qué perfiles están dados de alta.
    password_ok = verify_password(
        form_data.password,
        practitioner.password_hash if practitioner else None,
    )

    if not practitioner or not password_ok:
        raise_unauthorized(INVALID_CREDENTIALS_DETAIL)

    if not practitioner.active:
        raise_unauthorized(INACTIVE_PROFILE_DETAIL)

    access_token = create_access_token(data={"sub": practitioner.id})

    return TokenResponse(
        access_token=access_token,
        practitioner=PractitionerResponse.model_validate(practitioner),
    )


@router.get("/practitioners", response_model=list[PractitionerPublicSummary])
async def list_available_practitioners(
    db: AsyncSession = Depends(get_db),
) -> list[PractitionerPublicSummary]:
    """
    Perfiles activos disponibles en la pantalla de acceso.

    Endpoint público por necesidad: alimenta el selector rápido del login, que
    hasta ahora era una lista fija en el frontend. Solo expone datos
    profesionales (nombre, especialidad y email de acceso).
    """
    practitioners = await PractitionerService(db).list_active()
    return [PractitionerPublicSummary.model_validate(p) for p in practitioners]


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=PractitionerResponse,
)
async def register_practitioner(
    payload: PractitionerCreate,
    db: AsyncSession = Depends(get_db),
) -> PractitionerResponse:
    """
    Da de alta un nuevo perfil profesional.

    El alta la autoriza la clave que entrega administración
    (`CONSULTAMED_REGISTRATION_PASSWORD`), no una sesión existente: un médico
    nuevo debe poder incorporarse sin que otro le ceda sus credenciales.
    """
    if not matches_registration_password(
        payload.registration_password, settings.REGISTRATION_PASSWORD
    ):
        raise_forbidden("Clave de administración incorrecta")

    service = PractitionerService(db)

    try:
        practitioner = await service.create(payload.model_dump(exclude={"registration_password"}))
    except ValueError as exc:
        raise_bad_request(str(exc))

    return PractitionerResponse.model_validate(practitioner)


@router.get("/me", response_model=PractitionerResponse)
async def get_me(
    current_user: Practitioner = Depends(get_current_practitioner)
) -> PractitionerResponse:
    """
    Get current authenticated user.

    Returns practitioner data for the authenticated user.
    """
    return PractitionerResponse.model_validate(current_user)
