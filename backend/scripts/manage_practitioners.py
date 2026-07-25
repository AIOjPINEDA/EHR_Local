#!/usr/bin/env python
"""
Administración de perfiles profesionales (solo línea de comandos).

El alta de perfiles está disponible en la aplicación (pantalla de acceso), pero
las operaciones destructivas NO se exponen en la UI ni en la API a propósito:
retirar a un médico afecta a la trazabilidad de la historia clínica y debe
hacerse de forma deliberada desde aquí.

Uso (Windows):
    backend\\.venv\\Scripts\\python.exe scripts/manage_practitioners.py list
    backend\\.venv\\Scripts\\python.exe scripts/manage_practitioners.py create \\
        --colegiado 282889999 --nombre "Ana" --apellidos "Ruiz Gil" \\
        --email ana@consultamed.es --especialidad "Pediatría" --password "secreta123"
    ... scripts/manage_practitioners.py deactivate --email ana@consultamed.es
    ... scripts/manage_practitioners.py activate   --email ana@consultamed.es
    ... scripts/manage_practitioners.py set-password --email ana@consultamed.es --password "nueva1234"
    ... scripts/manage_practitioners.py delete --email ana@consultamed.es --yes

Uso (macOS/Linux):
    backend/.venv/bin/python scripts/manage_practitioners.py list

`delete` borra el perfil definitivamente y solo se permite cuando no tiene
consultas ni prescripciones firmadas. En cualquier otro caso usa `deactivate`:
retira el acceso sin romper la historia clínica.
"""
import argparse
import asyncio
import sys
from pathlib import Path

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import async_session_maker  # noqa: E402
from app.models.practitioner import Practitioner  # noqa: E402
from app.services.practitioner_service import PractitionerService  # noqa: E402


class CommandError(Exception):
    """Error de uso o de negocio con mensaje listo para el operador."""


def format_row(practitioner: Practitioner) -> str:
    """Una línea por perfil, legible en consola."""
    state = "activo  " if practitioner.active else "INACTIVO"
    email = practitioner.telecom_email or "(sin email)"
    specialty = practitioner.qualification_code or "-"
    return (
        f"{state}  {practitioner.identifier_value:<12} "
        f"{practitioner.name_given} {practitioner.name_family} "
        f"<{email}>  [{specialty}]  id={practitioner.id}"
    )


async def resolve_practitioner(
    service: PractitionerService, email: str
) -> Practitioner:
    """Busca un perfil por email o aborta con un mensaje claro."""
    practitioner = await service.get_by_email(email)
    if not practitioner:
        raise CommandError(f"No existe ningún perfil con el email {email}")
    return practitioner


async def cmd_list(service: PractitionerService, args: argparse.Namespace) -> None:
    """Lista todos los perfiles registrados."""
    practitioners = await service.list_all()
    if not practitioners:
        print("No hay perfiles registrados.")
        return

    print(f"{len(practitioners)} perfil(es):")
    for practitioner in practitioners:
        print(f"  {format_row(practitioner)}")


async def cmd_create(service: PractitionerService, args: argparse.Namespace) -> None:
    """Crea un perfil sin pasar por la clave de administración."""
    practitioner = await service.create(
        {
            "identifier_value": args.colegiado,
            "name_given": args.nombre,
            "name_family": args.apellidos,
            "qualification_code": args.especialidad,
            "telecom_email": args.email,
            "password": args.password,
        }
    )
    print("Perfil creado:")
    print(f"  {format_row(practitioner)}")


async def cmd_set_password(service: PractitionerService, args: argparse.Namespace) -> None:
    """Reasigna la contraseña de un perfil existente."""
    practitioner = await resolve_practitioner(service, args.email)
    await service.set_password(practitioner.id, args.password)
    print(f"Contraseña actualizada para {args.email}")


async def cmd_deactivate(service: PractitionerService, args: argparse.Namespace) -> None:
    """Retira el acceso de un perfil conservando su historia clínica."""
    practitioner = await resolve_practitioner(service, args.email)
    await service.set_active(practitioner.id, False)
    print(f"Perfil desactivado: {args.email} (ya no puede iniciar sesión)")


async def cmd_activate(service: PractitionerService, args: argparse.Namespace) -> None:
    """Devuelve el acceso a un perfil previamente desactivado."""
    practitioner = await resolve_practitioner(service, args.email)
    await service.set_active(practitioner.id, True)
    print(f"Perfil reactivado: {args.email}")


async def cmd_delete(service: PractitionerService, args: argparse.Namespace) -> None:
    """Borra definitivamente un perfil sin historia clínica asociada."""
    practitioner = await resolve_practitioner(service, args.email)
    counts = await service.count_linked_records(practitioner.id)

    if not args.yes:
        raise CommandError(
            "El borrado es irreversible. Registros vinculados: "
            f"{counts}. Repite el comando con --yes para confirmar."
        )

    try:
        await service.delete(practitioner.id)
    except ValueError as exc:
        raise CommandError(str(exc)) from exc

    print(f"Perfil borrado definitivamente: {args.email}")
    if counts.get("templates", 0):
        print(
            f"  {counts['templates']} plantilla(s) de tratamiento quedaron "
            "disponibles para la consulta, sin propietario."
        )


def build_parser() -> argparse.ArgumentParser:
    """Define los subcomandos disponibles."""
    parser = argparse.ArgumentParser(
        description="Administración de perfiles profesionales de ConsultaMed.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="Lista todos los perfiles").set_defaults(handler=cmd_list)

    create = subparsers.add_parser("create", help="Crea un perfil nuevo")
    create.add_argument("--colegiado", required=True, help="Nº Colegiado")
    create.add_argument("--nombre", required=True)
    create.add_argument("--apellidos", required=True)
    create.add_argument("--email", required=True)
    create.add_argument("--password", required=True)
    create.add_argument("--especialidad", default=None)
    create.set_defaults(handler=cmd_create)

    set_password = subparsers.add_parser("set-password", help="Cambia la contraseña")
    set_password.add_argument("--email", required=True)
    set_password.add_argument("--password", required=True)
    set_password.set_defaults(handler=cmd_set_password)

    deactivate = subparsers.add_parser("deactivate", help="Retira el acceso (recomendado)")
    deactivate.add_argument("--email", required=True)
    deactivate.set_defaults(handler=cmd_deactivate)

    activate = subparsers.add_parser("activate", help="Reactiva un perfil")
    activate.add_argument("--email", required=True)
    activate.set_defaults(handler=cmd_activate)

    delete = subparsers.add_parser("delete", help="Borrado definitivo (sin historia clínica)")
    delete.add_argument("--email", required=True)
    delete.add_argument("--yes", action="store_true", help="Confirma el borrado irreversible")
    delete.set_defaults(handler=cmd_delete)

    return parser


async def run(args: argparse.Namespace) -> None:
    """Abre una sesión de base de datos y ejecuta el subcomando."""
    async with async_session_maker() as session:
        await args.handler(PractitionerService(session), args)


def main() -> None:
    """Punto de entrada de la CLI."""
    args = build_parser().parse_args()

    try:
        asyncio.run(run(args))
    except (CommandError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
