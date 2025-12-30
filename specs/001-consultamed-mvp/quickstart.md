# Quickstart: ConsultaMed MVP

> **Estado**: ✅ MVP Funcional en local

## Prerrequisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL (local o Supabase)

## Variables de entorno

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://user@localhost:5432/consultamed
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Pasos locales

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
# Abrir http://localhost:3000
```

## Credenciales de Prueba

- **Email**: `sara@consultamed.es` o `jaime@consultamed.es`
- **Password**: `demo`

## Checks rápidos

```bash
# Backend health
curl http://127.0.0.1:8000/health
# → {"status":"healthy"}

# Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=sara@consultamed.es&password=demo"
# → {"access_token":"...", "practitioner":{...}}
```

## Tests

```bash
cd backend
ruff check .        # Linting (0 errores)
pytest -v           # 24 tests passing

cd frontend  
npm run build       # Build exitoso
```
- Frontend: push a `main` → Vercel auto-deploy
- Backend: deploy Railway con envs configuradas
- DB: ejecutar migrations en Supabase antes del deploy
