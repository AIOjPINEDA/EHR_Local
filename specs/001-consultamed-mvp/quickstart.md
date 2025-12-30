# Quickstart: ConsultaMed MVP

## Prerrequisitos
- Supabase project creado (PostgreSQL 15, Auth habilitado)
- Railway para backend FastAPI
- Vercel para frontend Next.js
- Python 3.11, Node 20, npm

## Variables de entorno

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<host>:<port>/<db>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
JWT_EXPIRES_MINUTES=60
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=https://api.consultamed.app
```

## Pasos locales
```
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head  # si aplica
uvicorn app.main:app --reload

# Frontend
autobuild () { npm install && npm run lint && npm run type-check && npm run dev; }
cd frontend
npm install
npm run dev
```

## Checks rápidos
- Backend health: GET /health → 200
- Auth: flujo login/logout con Supabase Auth
- Pacientes: crear + búsqueda por DNI/nombre
- PDF: POST /prescriptions -> devuelve PDF válido

## Tests
- Backend: `pytest`
- Frontend: `npm run test` (Vitest) y `npm run lint`

## Deploy
- Frontend: push a `main` → Vercel auto-deploy
- Backend: deploy Railway con envs configuradas
- DB: ejecutar migrations en Supabase antes del deploy
