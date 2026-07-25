"""
ConsultaMed Backend - Password Security Helpers

Utilidades de hashing y verificación de contraseñas (bcrypt) compartidas por el
login, el alta de perfiles y las operaciones administrativas por CLI.
"""
import hmac
from typing import Optional

import bcrypt

# bcrypt solo consume los primeros 72 bytes de la entrada. Se valida de forma
# explícita en lugar de truncar en silencio: una contraseña más larga de lo que
# el algoritmo puede procesar daría una falsa sensación de seguridad.
BCRYPT_MAX_PASSWORD_BYTES = 72

# Longitud mínima aceptada al dar de alta o cambiar una contraseña.
MIN_PASSWORD_LENGTH = 8

# Hash de referencia con el mismo coste que los reales. Se usa cuando el email
# no existe o el perfil no tiene contraseña, para que el tiempo de respuesta del
# login no revele qué emails están dados de alta (enumeración de usuarios).
DUMMY_PASSWORD_HASH = "$2b$12$362FENGTAEZk1bQ1KwgW8OO86uO.Fklz5X.1OS8DGV3XR012Pc5rG"


def password_byte_length(password: str) -> int:
    """Longitud en bytes UTF-8 (lo que realmente consume bcrypt)."""
    return len(password.encode("utf-8"))


def hash_password(password: str) -> str:
    """
    Genera el hash bcrypt de una contraseña.

    Raises:
        ValueError: si la contraseña no cumple longitud mínima o excede el
            límite de 72 bytes que admite bcrypt.
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres"
        )
    if password_byte_length(password) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError(
            f"La contraseña no puede superar {BCRYPT_MAX_PASSWORD_BYTES} bytes"
        )

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    """
    Verifica una contraseña contra su hash bcrypt.

    Cuando `password_hash` es None se comprueba igualmente contra un hash de
    referencia para mantener constante el coste de la operación.
    """
    candidate = password.encode("utf-8")[:BCRYPT_MAX_PASSWORD_BYTES]
    stored = (password_hash or DUMMY_PASSWORD_HASH).encode("utf-8")

    try:
        matches = bcrypt.checkpw(candidate, stored)
    except ValueError:
        # Hash almacenado corrupto o con formato desconocido.
        return False

    return matches and password_hash is not None


def matches_registration_password(candidate: str, expected: str) -> bool:
    """
    Compara la clave de alta entregada por administración en tiempo constante.

    Se ignoran espacios al inicio/final porque la clave se copia y pega a mano.
    """
    return hmac.compare_digest(
        candidate.strip().encode("utf-8"),
        expected.strip().encode("utf-8"),
    )
