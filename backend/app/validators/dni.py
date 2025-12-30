"""
ConsultaMed Backend - Validación DNI/NIE Español

LÓGICA CRÍTICA DE NEGOCIO - TÚ (JAIME) CONTROLAS ESTE ARCHIVO

Este módulo implementa la validación del documento de identidad español
según el algoritmo oficial.
"""


def validate_dni_español(dni: str) -> bool:
    """
    Valida un DNI español (8 dígitos + letra).
    
    El algoritmo:
    1. Tomar los 8 primeros dígitos
    2. Calcular módulo 23
    3. La letra debe corresponder a la posición en la tabla
    
    Args:
        dni: String con formato "12345678Z"
        
    Returns:
        True si el DNI es válido, False en caso contrario
        
    Examples:
        >>> validate_dni_español("12345678Z")
        True
        >>> validate_dni_español("00000000T")
        True
        >>> validate_dni_español("12345678A")
        False  # Letra incorrecta
    """
    LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE"
    
    # Limpiar y validar formato
    dni = dni.upper().strip()
    
    if len(dni) != 9:
        return False
    
    numeros = dni[:8]
    letra = dni[8]
    
    if not numeros.isdigit():
        return False
    
    if letra not in LETRAS:
        return False
    
    # Calcular letra correcta
    indice = int(numeros) % 23
    letra_correcta = LETRAS[indice]
    
    return letra == letra_correcta


def validate_nie_español(nie: str) -> bool:
    """
    Valida un NIE español (X/Y/Z + 7 dígitos + letra).
    
    El NIE reemplaza la primera letra por un número equivalente:
    - X = 0
    - Y = 1
    - Z = 2
    
    Args:
        nie: String con formato "X1234567L"
        
    Returns:
        True si el NIE es válido, False en caso contrario
        
    Examples:
        >>> validate_nie_español("X1234567L")
        True
        >>> validate_nie_español("Y0000000Z")
        True
    """
    LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE"
    PREFIJOS = {"X": "0", "Y": "1", "Z": "2"}
    
    nie = nie.upper().strip()
    
    if len(nie) != 9:
        return False
    
    if nie[0] not in PREFIJOS:
        return False
    
    # Convertir a número equivalente
    numero_str = PREFIJOS[nie[0]] + nie[1:8]
    letra = nie[8]
    
    if not numero_str.isdigit():
        return False
    
    if letra not in LETRAS:
        return False
    
    indice = int(numero_str) % 23
    letra_correcta = LETRAS[indice]
    
    return letra == letra_correcta


def validate_documento_identidad(documento: str) -> tuple[bool, str]:
    """
    Valida DNI o NIE español automáticamente.
    
    Detecta el tipo de documento basándose en el primer carácter:
    - Dígito: DNI
    - X, Y, Z: NIE
    
    Args:
        documento: DNI o NIE en cualquier formato
        
    Returns:
        Tuple de (es_válido, tipo_documento)
        
    Examples:
        >>> validate_documento_identidad("12345678Z")
        (True, "DNI")
        >>> validate_documento_identidad("X1234567L")
        (True, "NIE")
        >>> validate_documento_identidad("INVALIDO")
        (False, "UNKNOWN")
    """
    documento = documento.upper().strip()
    
    if not documento:
        return False, "UNKNOWN"
    
    if documento[0].isdigit():
        return validate_dni_español(documento), "DNI"
    elif documento[0] in "XYZ":
        return validate_nie_español(documento), "NIE"
    else:
        return False, "UNKNOWN"


def format_dni(dni: str) -> str:
    """
    Formatea un DNI/NIE a formato estándar.
    
    Args:
        dni: DNI o NIE en cualquier formato
        
    Returns:
        DNI/NIE en mayúsculas sin espacios
        
    Examples:
        >>> format_dni("12345678z")
        "12345678Z"
        >>> format_dni(" x1234567l ")
        "X1234567L"
    """
    return dni.upper().strip()


def get_letra_dni(numeros: str) -> str:
    """
    Calcula la letra correcta para un número de DNI.
    
    Útil para sugerir correcciones al usuario.
    
    Args:
        numeros: Los 8 dígitos del DNI
        
    Returns:
        La letra que debería tener ese DNI
        
    Examples:
        >>> get_letra_dni("12345678")
        "Z"
    """
    LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE"
    
    if not numeros.isdigit() or len(numeros) != 8:
        raise ValueError("Se requieren exactamente 8 dígitos")
    
    indice = int(numeros) % 23
    return LETRAS[indice]
