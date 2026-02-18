# Backlog de Tareas Pendientes

> **Este fichero está siendo migrado a GitHub Issues** como backlog canónico.
> Las tareas con número de issue ya están delegadas — este fichero conserva el contexto
> extendido como referencia. Ver issues abiertos en GitHub para el estado actual.

## Resumen

| ID | Tarea | Categoría | Prioridad | Estado |
|----|-------|-----------|-----------|--------|
| T-01 | Habilitar RLS en todas las tablas de Supabase | Seguridad | **CRÍTICA** | [Issue #15](https://github.com/AIOjPINEDA/EHR_Local/issues/15) |
| T-02 | Rotar credenciales Supabase/PostgreSQL | Seguridad | Media | [Issue #17](https://github.com/AIOjPINEDA/EHR_Local/issues/17) |
| T-03 | Migrar entorno Python canónico a `root/.venv` | Arquitectura | Baja | Pendiente (sin issue) |
| T-04 | Hardening del health check (503 real + SELECT 1) | Infra | Alta | [Issue #16](https://github.com/AIOjPINEDA/EHR_Local/issues/16) |

---

## T-01 — Habilitar RLS en todas las tablas de Supabase

- **Prioridad:** ALTA — bloqueante antes de producción
- **Categoría:** Seguridad / GDPR
- **Identificada:** 2026-02-18 (alerta del linter de Supabase)

**Contexto:**
Supabase expone automáticamente el esquema `public` vía PostgREST. Sin RLS habilitado, cualquier cliente con la clave `anon` puede leer o modificar datos clínicos sin pasar por el backend FastAPI. Las 7 tablas afectadas contienen datos sensibles sujetos a GDPR/LOPD-GDD.

Tablas afectadas: `patients`, `practitioners`, `encounters`, `conditions`, `allergy_intolerances`, `medication_requests`, `treatment_templates`.

**Enfoque:** La app no usa Supabase Auth ni PostgREST directamente — el frontend habla solo con FastAPI. Por tanto la política correcta es:
- Habilitar RLS en todas las tablas.
- Denegar acceso a los roles `anon` y `authenticated` (no se usan).
- Permitir acceso completo al rol `service_role` (el que usa el backend con `SERVICE_ROLE_KEY`).

**Pasos:**
1. Crear migración `supabase/migrations/<timestamp>_enable_rls.sql`.
2. Para cada tabla: `ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;`
3. Para cada tabla: `CREATE POLICY "service_role_only" ON <tabla> USING (auth.role() = 'service_role');`
4. Aplicar en Supabase (`supabase db push` o desde el dashboard SQL editor).
5. Verificar que el backend sigue funcionando (`RUN_INTEGRATION=1 pytest tests/integration`).
6. Confirmar en el linter de Supabase que las alertas desaparecen.

---

## T-02 — Rotar credenciales Supabase/PostgreSQL

- **Prioridad:** Media
- **Categoría:** Seguridad
- **Identificada:** 2026-02-08

**Contexto:**
El proyecto está conectado a PostgreSQL en Supabase y el `backend/.env` activo incluye credenciales reales de base de datos. Conviene rotarlas antes de cualquier despliegue a producción o incorporación de colaboradores.

**Pasos:**
1. Rotar contraseña de DB y credenciales de servicio en el dashboard de Supabase.
2. Actualizar `backend/.env` con los nuevos valores.
3. Verificar conexión del backend tras la rotación.

---

## T-03 — Migrar entorno Python canónico a `root/.venv`

- **Prioridad:** Baja — diferida para evitar riesgo operacional
- **Categoría:** Arquitectura / DevEx
- **Identificada:** 2026-02-14

**Contexto:**
El estándar actual del repo es `backend/.venv` para determinismo en scripts y alineación con el editor. Evaluar si tiene sentido mover el entorno canónico a la raíz del monorepo.

**Pasos:**
1. Preparar propuesta de migración con análisis de impacto sobre scripts, docs y configuración del editor.
2. Implementar la transición en una rama dedicada con modo de compatibilidad temporal.
3. Validar `./scripts/test_gate.sh`, `npm run generate:types` y la suite de tests del backend de extremo a extremo.
4. Eliminar el modo de compatibilidad tras un ciclo de estabilización.
