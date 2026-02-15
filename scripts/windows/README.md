# Scripts de Inicio - Windows

Scripts para iniciar ConsultaMed en Windows de forma rápida.

## Uso

Desde la raíz del proyecto:
```bash
start.bat          # Iniciar todo
```

## Scripts

- **`start-consultamed.bat`** - Inicia base de datos, backend y frontend
- **`stop-consultamed.bat`** - Detiene todos los servicios

## Requisitos

- Docker Desktop en ejecución
- Python venv configurado en `backend/.venv`
- Node.js instalado

## Qué hace `start-consultamed.bat`

1. Verifica que Docker esté corriendo
2. Inicia PostgreSQL en Docker (puerto 54329)
3. Abre ventana con Backend FastAPI (puerto 8000)
4. Abre ventana con Frontend Next.js (puerto 3000)
5. Abre navegador en http://localhost:3000

**Credenciales:** `sara@consultamed.es` / `piloto2026`
