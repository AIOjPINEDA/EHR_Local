# Scripts de Inicio - Windows

Scripts para iniciar y validar ConsultaMed en Windows de forma rapida.

## Uso rapido

Desde la raiz del proyecto:

```powershell
start.bat
```

## Scripts de arranque

- `start-consultamed.bat`: inicia base de datos, backend y frontend
- `stop-consultamed.bat`: detiene los servicios abiertos por el arranque rapido

## Validacion y mantenimiento

Desde la raiz del repo:

```powershell
./scripts/repo-tool.ps1 setup-local-db
./scripts/repo-tool.ps1 generate-types
./scripts/repo-tool.ps1 verify-schema-hash
./scripts/repo-tool.ps1 test-gate
```

## Requisitos

- Docker Desktop instalado
- Python venv configurado en `backend/.venv`
- Node.js instalado

## Que hace `start-consultamed.bat`

1. Verifica `docker` en `PATH` e intenta arrancar Docker Desktop si el daemon no esta listo.
2. Ejecuta `repo-tool.ps1 setup-local-db` para levantar PostgreSQL y aplicar migraciones.
3. Abre una ventana con Backend FastAPI (puerto 8000).
4. Abre una ventana con Frontend Next.js (puerto 3000).
5. Abre el navegador en `http://localhost:3000`.

**Credenciales:** `sara@consultamed.es` / `piloto2026`
