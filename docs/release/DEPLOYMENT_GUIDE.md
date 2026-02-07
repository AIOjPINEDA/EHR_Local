# ConsultaMed V1 - Guía de Despliegue

> **Versión:** V1 Pilot  
> **Fecha:** 2026-02-07

---

## 📋 Pre-requisitos

### Verificaciones Locales

Antes de desplegar, ejecuta en local:

```bash
# Backend tests
cd backend
pytest tests/ -v
# Esperado: 31 passed

# Backend linting
ruff check .
# Esperado: All checks passed

# Frontend checks
cd ../frontend
npm run lint
npm run type-check
npm test
# Esperado: Sin errores
```

---

## 🚀 Despliegue Paso a Paso

### Paso 1: Preparar Base de Datos

#### Opción A: Supabase

1. Abre el [Dashboard de Supabase](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Ejecuta el contenido de:
   - `supabase/migrations/20260208_add_password_hash.sql`

#### Opción B: PostgreSQL Local

```bash
psql -d consultamed -f supabase/migrations/20260208_add_password_hash.sql
```

**Verifica la migración:**
```sql
SELECT id, name_given, telecom_email, password_hash IS NOT NULL as has_password
FROM practitioners;
```

---

### Paso 2: Configurar Variables de Entorno

#### Backend (.env)

```env
# Producción
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/consultamed
JWT_SECRET_KEY=<genera-un-secreto-de-32-caracteres>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_URL=https://tu-dominio.com
ENVIRONMENT=production
DEBUG=false
```

> ⚠️ **Importante:** Cambia `JWT_SECRET_KEY` a un valor único para producción.

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
