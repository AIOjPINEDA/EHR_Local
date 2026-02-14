"""
Script de importación de pacientes del CRM antiguo a ConsultaMed.

Este script lee el archivo Excel procesado y crea registros Patient
en PostgreSQL usando el servicio existente y validadores del proyecto.

Uso:
    cd backend
    source .venv/bin/activate
    python scripts/migrations/import_patients.py

Características:
- Validación completa de DNI/NIE con algoritmo MOD 23
- Detección automática de duplicados (por DNI)
- Logs seguros (sin PII completo)
- Transacciones por paciente (rollback individual en error)
- Resumen estadístico final

Autor: Jaime PM / Claude
Fecha: 2026-02-14
"""

import asyncio
from datetime import date
from pathlib import Path
from typing import cast

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.services.patient_service import PatientService
from app.validators.dni import validate_documento_identidad


class ImportStats:
    """Estadísticas de importación."""

    def __init__(self, total: int):
        self.total = total
        self.created = 0
        self.skipped = 0
        self.errors = 0

    @property
    def processed(self) -> int:
        """Total procesados (éxito o skip)."""
        return self.created + self.skipped

    def print_summary(self) -> None:
        """Imprime resumen final."""
        print(f"\n{'='*60}")
        print("RESUMEN DE IMPORTACIÓN")
        print(f"{'='*60}")
        print(f"✅ Creados:    {self.created:4d} ({self.created/self.total*100:5.1f}%)")
        print(f"⏭️  Duplicados: {self.skipped:4d} ({self.skipped/self.total*100:5.1f}%)")
        print(f"❌ Errores:    {self.errors:4d} ({self.errors/self.total*100:5.1f}%)")
        print(f"{'='*60}\n")


def mask_dni(dni: str) -> str:
    """
    Enmascara DNI para logs seguros (GDPR).

    Ejemplo: "12345678Z" → "1234****"
    """
    return dni[:4] + "****" if len(dni) >= 4 else "****"


def parse_birth_date(fecha_str: str) -> date:
    """
    Parsea fecha de nacimiento desde formato DD/MM/YYYY.

    Args:
        fecha_str: Fecha en formato string

    Returns:
        date object

    Raises:
        ValueError: Si el formato es inválido
    """
    if pd.isna(fecha_str) or not fecha_str:
        raise ValueError("Fecha de nacimiento vacía")

    # pandas.to_datetime maneja múltiples formatos
    fecha_dt = pd.to_datetime(fecha_str, errors="coerce")

    if pd.isna(fecha_dt):
        raise ValueError(f"Formato de fecha inválido: {fecha_str}")

    return cast(date, fecha_dt.date())


async def import_patient_row(
    session: AsyncSession,
    row: pd.Series,
    idx: int,
    total: int,
    stats: ImportStats,
) -> None:
    """
    Importa un paciente individual.

    Args:
        session: Sesión async de base de datos
        row: Fila del DataFrame con datos del paciente
        idx: Índice de la fila (para logging)
        total: Total de pacientes
        stats: Objeto de estadísticas
    """
    service = PatientService(session)

    try:
        dni_nie = str(row["DNI_NIE"]).strip()

        # 1. Validar DNI/NIE
        is_valid, doc_type = validate_documento_identidad(dni_nie)
        if not is_valid:
            print(f"❌ [{idx+1:3d}/{total}] DNI inválido: {mask_dni(dni_nie)}")
            stats.errors += 1
            return

        # 2. Verificar duplicado
        existing = await service.get_by_dni(dni_nie)
        if existing:
            print(f"⏭️  [{idx+1:3d}/{total}] Ya existe: {mask_dni(dni_nie)} ({doc_type})")
            stats.skipped += 1
            return

        # 3. Preparar datos
        patient_data = {
            "identifier_value": dni_nie,
            "name_given": str(row["Nombre"]).strip(),
            "name_family": str(row["Apellidos"]).strip(),
            "birth_date": parse_birth_date(row["Fecha_Nacimiento"]),
        }

        # 4. Crear paciente (validación completa en service)
        patient = await service.create(patient_data)

        print(
            f"✅ [{idx+1:3d}/{total}] Creado: {mask_dni(dni_nie)} ({doc_type}) - "
            f"Edad: {patient.age}"
        )
        stats.created += 1

    except Exception as e:
        error_msg = str(e)[:80]  # Limitar longitud
        print(f"❌ [{idx+1:3d}/{total}] Error: {error_msg}")
        stats.errors += 1


async def import_patients() -> None:
    """
    Proceso principal de importación.

    Lee el Excel procesado y crea registros Patient en la base de datos.
    """
    # 1. Leer Excel
    script_dir = Path(__file__).parent
    xlsx_path = script_dir / "data" / "pacientes_validados_limpios.xlsx"

    if not xlsx_path.exists():
        print(f"❌ Error: Archivo no encontrado: {xlsx_path}")
        print("   Ejecuta este script desde: backend/")
        return

    print(f"\n{'='*60}")
    print("IMPORTACIÓN DE PACIENTES - CRM ANTIGUO")
    print(f"{'='*60}")
    print(f"Origen: {xlsx_path.name}")

    try:
        df = pd.read_excel(xlsx_path)
    except Exception as e:
        print(f"❌ Error al leer Excel: {e}")
        return

    total = len(df)
    stats = ImportStats(total)

    print(f"Total pacientes a importar: {total}")
    print(f"{'='*60}\n")

    # 2. Importar paciente por paciente (cada uno en su transacción)
    for idx, row in df.iterrows():
        async with async_session_maker() as session:
            await import_patient_row(session, row, idx, total, stats)

    # 3. Resumen final
    stats.print_summary()


def main() -> None:
    """Entry point."""
    try:
        asyncio.run(import_patients())
    except KeyboardInterrupt:
        print("\n\n⚠️  Importación interrumpida por el usuario")
    except Exception as e:
        print(f"\n\n❌ Error fatal: {e}")
        raise


if __name__ == "__main__":
    main()
