# ConsultaMed - Guía de Despliegue

> **Última revisión:** 2026-03-13

---

## 📋 Pre-requisitos

### Verificaciones Locales

Antes de desplegar, ejecuta en local:

```bash
./scripts/test_gate.sh
```

> Nota de rutas: comandos `./scripts/...` se ejecutan desde la raíz del repo (`EHR_Guadalix/`).
> Si estás dentro de `backend/`, usa `../scripts/...`.

---

## 🚀 Despliegue Paso a Paso

### Paso 1: Preparar Base de Datos

Ruta operativa soportada para el ciclo MVP actual: PostgreSQL local.

Recomendado (contenedor + migraciones automáticas):
```bash
./scripts/setup-local-db.sh
```

Alternativa manual (si ya tienes PostgreSQL local operativo):
```bash
psql -d consultamed -f database/migrations/20260208090000_add_password_hash.sql
psql -d consultamed -f database/migrations/20260208090100_add_encounter_soap_fields.sql
```

> El bootstrap local toma su SQL desde la ruta neutral `database/migrations/`.
> `supabase/` se conserva aparte como artefacto histórico/transitorio, pero ya no es el camino operativo del runtime local.

**Verifica la migración:**
```sql
SELECT id, name_given, telecom_email, password_hash IS NOT NULL as has_password
FROM practitioners;
```

---

### Paso 2: Configurar Variables de Entorno

#### Backend (.env)

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed

JWT_SECRET_KEY=<genera-un-secreto-de-32-caracteres>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_URL=https://tu-dominio.com
ENVIRONMENT=production
DEBUG=false
```

Usa `backend/.env.local.example` como referencia activa y mantén `backend/.env` apuntando al PostgreSQL local.
`backend/.env.supabase.example` queda solo como referencia histórica/transitoria y ya no describe un camino operativo soportado.

> ⚠️ **Importante:** Cambia `JWT_SECRET_KEY` a un valor único para producción.
> Si despliegas PostgreSQL local con Docker, fija imagen explícita de la serie 17: `LOCAL_POSTGRES_IMAGE=postgres:17.7`.
> El puerto host local por defecto es `54329` (override opcional: `LOCAL_POSTGRES_PORT`).

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

---

### Paso 3: Desplegar Backend

#### Railway (Recomendado)

```bash
# Desde directorio backend/
railway login
railway init
railway up
```

#### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Paso 4: Desplegar Frontend

#### Vercel (Recomendado)

```bash
cd frontend
vercel
```

#### Build manual

```bash
npm run build
npm run start
```

---

### Paso 5: Smoke Test en Producción

```bash
export API_URL=https://api.tu-dominio.com
export PILOT_PASSWORD=piloto2026
./scripts/smoke_phase1.sh
```

---

## ✅ Checklist Final

| Item | Estado |
|------|--------|
| Migración SQL aplicada | ⬜ |
| Variables de entorno configuradas | ⬜ |
| Backend desplegado | ⬜ |
| Frontend desplegado | ⬜ |
| Smoke test pasa | ⬜ |
| HTTPS configurado | ⬜ |
| Credenciales comunicadas a usuarios | ⬜ |

---

## 👥 Credenciales del Piloto

Comparte estas credenciales con los usuarios autorizados:

| Usuario | Email | Password |
|---------|-------|----------|
| Sara Muñoz | sara@consultamed.es | piloto2026 |
| Jaime Pineda | jaime@consultamed.es | piloto2026 |

---

## 🔧 Troubleshooting

### Error: "Email o contraseña incorrectos"

1. Verifica que la migración SQL se ejecutó
2. Confirma que usas `piloto2026` como contraseña
3. Revisa logs del backend

### Error: CORS

Verifica que `FRONTEND_URL` en backend `.env` coincide con la URL del frontend.

### Error: Token expirado

El token expira tras 8 horas. Vuelve a iniciar sesión.

---

## 📞 Soporte

Para problemas de despliegue, contacta al administrador del sistema.
