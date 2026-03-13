# Spec 003 — Refactoring & Optimization Plan

**Estado:** Referencia de hallazgos; no usar como backlog operativo directo
**Fecha de análisis:** 2026-03-13
**Scope:** Backend Python (FastAPI), Frontend TypeScript (Next.js), FHIR ETL + Sidecar Java
**Metodología:** Análisis estático completo vía subagentes especializados sobre los últimos 2 PRs + codebase actual

---

## Contexto

Este documento recoge hallazgos de refactorización identificados en el codebase tras la integración del sidecar HAPI FHIR (PR #25) y el merge anterior (PR #14).

Actualización 2026-03-13:

- este documento ya no debe tratarse como plan de ejecución lineal;
- las tareas relevantes deben extraerse a GitHub Issues pequeñas y priorizadas;
- la nueva dirección operativa del repositorio prioriza simplificación local-first, reducción de deriva técnica y eliminación de complejidad no usada;
- cualquier tarea de este documento que dependa de Supabase o amplifique complejidad debe revalidarse antes de ejecutarse.

Extracciones ya realizadas a GitHub Issues:

- `#30` captura el hallazgo `SQLALCHEMY_ECHO` / PHI en logs.
- `#29` captura el riesgo de `python-jose` en auth JWT local.
- `#27` y `#28` capturan la simplificación `local-first` y el desacoplo de `supabase/migrations`.

Se conserva como inventario técnico útil para triage, no como backlog activo.

### Principios de ejecución

1. **Tests primero**: cada cambio solo se acepta si `./scripts/test_gate.sh` o el subset de tests relevante sigue verde.
2. **Atomicidad**: cada tarea es un commit semántico independiente. No mezclar cambios de distinta categoría.
3. **Sin regresión de API pública**: no cambiar contratos HTTP ni tipos exportados sin consenso explícito.
4. **Orden estricto de fases**: CRÍTICA → CALIDAD → ARQUITECTURA. Nunca saltar una fase.
5. **Stop on red**: si los tests rompen, parar y reportar antes de continuar.

---

## FASE 1 — Crítica / Seguridad (riesgo ALTO, esfuerzo XS–S)

Estas tareas deben ejecutarse antes que cualquier otra. Impactan HIPAA, disponibilidad o corrupción de datos.

---

### F1.1 · PHI en logs SQL (`SQLALCHEMY_ECHO`)

**Archivo:** [backend/app/database.py](backend/app/database.py)
**Problema:** `echo=settings.DEBUG` imprime todas las queries SQL en stdout cuando DEBUG=True, exponiendo PHI (nombre, DNI, datos clínicos).
**Riesgo:** ALTO (HIPAA)
**Esfuerzo:** XS

**Cambios requeridos:**

1. En [backend/app/config.py](backend/app/config.py), añadir campo `SQLALCHEMY_ECHO: bool = False` — nunca derivarlo de `DEBUG`.
2. En [backend/app/database.py](backend/app/database.py), cambiar `echo=settings.DEBUG` → `echo=settings.SQLALCHEMY_ECHO`.
3. Añadir validador Pydantic que lance error si `SQLALCHEMY_ECHO=True` y `ENVIRONMENT=production`.

**Test de verificación:** `grep -r "echo=settings.DEBUG" backend/` debe retornar vacío.

---

### F1.2 · Health check sin verificación real de DB

**Archivos:** [backend/app/main.py](backend/app/main.py), [backend/app/database.py](backend/app/database.py)
**Problema:** `/health` retorna `{"status": "healthy"}` estático sin tocar la base de datos. Un fallo de conexión a PG no es detectado por el health check.
**Riesgo:** ALTO (disponibilidad, falsos positivos en prod)
**Esfuerzo:** S

**Cambios requeridos:**

1. En `main.py`, hacer que `/health` ejecute `SELECT 1` vía dependency de DB:
```python
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
```
2. En `database.py`, envolver `async_session_maker` con captura de `ConnectionRefusedError` / `sqlalchemy.exc.OperationalError` → devolver 503.

**Test de verificación:** Test unitario que mockea DB como unreachable y verifica que `/health` retorna 503.

---

### F1.3 · CORS con URLs HTTP hardcoded mezcladas con settings

**Archivo:** [backend/app/main.py](backend/app/main.py) líneas 20–26
**Problema:** `cors_origins` mezcla `settings.FRONTEND_URL` con strings hardcoded `http://localhost:3000/3001`. En producción, las URLs locales no deben estar activas.
**Riesgo:** MEDIO (seguridad)
**Esfuerzo:** S

**Cambios requeridos:**

1. En `config.py`, añadir propiedad:
```python
@property
def cors_origins(self) -> list[str]:
    origins = [self.FRONTEND_URL]
    if self.ENVIRONMENT == "development":
        origins += [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
    return origins
```
2. En `main.py`, reemplazar la lista manual por `settings.cors_origins`.

**Test de verificación:** Verificar que con `ENVIRONMENT=production`, `settings.cors_origins` solo contiene `FRONTEND_URL`.

---

### F1.4 · Warning cuando ETL usa API key por defecto

**Archivo:** [backend/app/fhir/etl.py](backend/app/fhir/etl.py) línea 32, función `_resolve_api_key`
**Problema:** `DEFAULT_ETL_API_KEY = "consultamed-local-etl"` es visible en código y se usa silenciosamente si no hay env var. Sin advertencia en logs.
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambio requerido:**

```python
def _resolve_api_key(api_key: str | None) -> str:
    resolved = (api_key or os.getenv("CONSULTAMED_ETL_API_KEY") or DEFAULT_ETL_API_KEY).strip()
    if resolved == DEFAULT_ETL_API_KEY:
        logger.warning(
            "ETL using default API key — set CONSULTAMED_ETL_API_KEY for production"
        )
    return resolved
```

**Test de verificación:** Test unitario que verifica que `_resolve_api_key(None)` con env var ausente emite warning.

---

## FASE 2 — Calidad / Duplicación (riesgo BAJO, esfuerzo XS–S)

Tareas independientes entre sí. Se pueden ejecutar en cualquier orden dentro de la fase, pero todas después de Fase 1.

---

### F2.1 · Centralizar constantes de FHIR identifier systems

**Archivos:** [backend/app/fhir/base_mapping.py](backend/app/fhir/base_mapping.py), [backend/app/fhir/clinical_mapping.py](backend/app/fhir/clinical_mapping.py)
**Problema:** Hay 8 constantes `*_SOURCE_IDENTIFIER_SYSTEM` dispersas en dos módulos. `clinical_mapping.py` redefine dos que ya existen en `base_mapping.py` (las importa, pero las otras 4 viven solo en `clinical_mapping.py`).
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambios requeridos:**

1. Mover TODAS las constantes `*_SOURCE_IDENTIFIER_SYSTEM` a `base_mapping.py`:
   - `ENCOUNTER_SOURCE_IDENTIFIER_SYSTEM`
   - `CONDITION_SOURCE_IDENTIFIER_SYSTEM`
   - `MEDICATION_REQUEST_SOURCE_IDENTIFIER_SYSTEM`
   - `ALLERGY_INTOLERANCE_SOURCE_IDENTIFIER_SYSTEM`
2. En `clinical_mapping.py`, importar desde `base_mapping` en lugar de definir localmente.
3. Actualizar imports en `etl.py` si los usa.

**Test de verificación:** `python -c "from app.fhir.clinical_mapping import *"` sin errores. Tests unitarios existentes pasan.

---

### F2.2 · Abstraer patrón `_build_coding_concept` repetido en `clinical_mapping.py`

**Archivo:** [backend/app/fhir/clinical_mapping.py](backend/app/fhir/clinical_mapping.py) líneas 195–213, 236–243, 299–306
**Problema:** El patrón `{"text": ..., "coding": [...]}` se construye de forma idéntica en `condition_to_fhir_resource`, `medication_request_to_fhir_resource` y `allergy_intolerance_to_fhir_resource`.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambio requerido:**

```python
def _build_coding_concept(
    text: str,
    code: str | None,
    system: str | None,
    display: str | None = None,
    default_system: str = "http://snomed.info/sct",
) -> dict[str, Any]:
    result: dict[str, Any] = {"text": text}
    if code:
        coding: dict[str, Any] = {"system": system or default_system, "code": code}
        if display:
            coding["display"] = display
        result["coding"] = [coding]
    return result
```

Reemplazar los 3 bloques inline por llamadas a esta función.

**Test de verificación:** Tests unitarios existentes de `test_hapi_clinical_etl.py` pasan sin cambios.

---

### F2.3 · Centralizar helpers duplicados en `templates.py`

**Archivo:** [backend/app/api/templates.py](backend/app/api/templates.py)
**Problema:**
- El filtro `or_(practitioner_id == current.id, practitioner_id.is_(None))` aparece 3 veces (líneas 100–119, 168–178, 207–213).
- La validación de ownership de template se repite en `update_template` y `delete_template` (líneas 276–292, 331–347).
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambios requeridos:**

```python
def _accessible_templates_filter(practitioner_id: str):
    return or_(
        TreatmentTemplate.practitioner_id == practitioner_id,
        TreatmentTemplate.practitioner_id.is_(None),
    )

def _assert_template_ownership(
    template: TreatmentTemplate,
    current: Practitioner,
    action: str,
) -> None:
    if template.practitioner_id is None:
        raise_forbidden(f"No se pueden {action} templates del sistema")
    if template.practitioner_id != current.id:
        raise_forbidden(f"No tienes permiso para {action} este template")
```

Reemplazar los 3 usos del filtro y los 2 bloques de ownership por llamadas a estos helpers.

**Test de verificación:** Tests de contracts o unitarios de templates pasan.

---

### F2.4 · Helper `_build_encounter_query_with_relations` en `encounters.py`

**Archivo:** [backend/app/api/encounters.py](backend/app/api/encounters.py) líneas 152–161, 184–189, 219–225, 284–289
**Problema:** El patrón `select(Encounter).options(selectinload(conditions), selectinload(medications)).where(id == x)` se repite 4 veces.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambio requerido:**

```python
def _encounter_with_relations_stmt(encounter_id: str):
    return (
        select(Encounter)
        .options(
            selectinload(Encounter.conditions),
            selectinload(Encounter.medications),
        )
        .where(Encounter.id == encounter_id)
    )
```

Reemplazar los 4 usos inline.

**Test de verificación:** `pytest tests/unit tests/contracts -v --tb=short` pasa.

---

### F2.5 · Batch DELETE en `update_encounter` (eliminar loop N+1)

**Archivo:** [backend/app/api/encounters.py](backend/app/api/encounters.py) líneas 301–317
**Problema:** Conditions y medications se eliminan con un `db.delete()` por cada objeto en un loop. Genera N DELETE statements.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambio requerido:**

```python
from sqlalchemy import delete as sa_delete

# Reemplazar los dos loops:
await db.execute(sa_delete(Condition).where(Condition.encounter_id == encounter_id))
await db.execute(sa_delete(MedicationRequest).where(MedicationRequest.encounter_id == encounter_id))
await db.flush()
```

**Test de verificación:** Test de integración de update de encounter pasa.

---

### F2.6 · Centralizar constantes en `config.py` / `constants.py`

**Archivos:** [backend/app/api/prescriptions.py](backend/app/api/prescriptions.py), [backend/app/models/medication_request.py](backend/app/models/medication_request.py)
**Problema:** `GENDER_LABELS`, `DURATION_UNIT_LABELS` y los nombres de campos SOAP están hardcoded en endpoints/modelos.
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambio requerido:** Crear `backend/app/constants.py`:

```python
GENDER_LABELS: dict[str, str] = {
    "male": "Masculino",
    "female": "Femenino",
    "other": "Otro",
    "unknown": "No especificado",
}

DURATION_UNIT_LABELS: dict[str, str] = {
    "d": "días",
    "wk": "semanas",
    "mo": "meses",
    "h": "horas",
}
```

Importar desde ambos módulos. Eliminar definiciones duplicadas.

**Test de verificación:** Módulos importan sin error; tests de prescripciones pasan.

---

### F2.7 · Centralizar constantes Java en `FhirConstants.java`

**Archivos:** [sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/ReadOnlyModeInterceptor.java](sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/ReadOnlyModeInterceptor.java), [sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/CapabilityStatementCustomizer.java](sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/CapabilityStatementCustomizer.java), [sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/AuditTrailInterceptor.java](sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/AuditTrailInterceptor.java)
**Problema:**
- `ALLOWED_RESOURCE_TYPES` (Set de 6 tipos FHIR) definido idénticamente en `ReadOnlyModeInterceptor` y `CapabilityStatementCustomizer`.
- `ETL_API_KEY_HEADER` (`"X-Consultamed-ETL-Key"`) definido en `AuditTrailInterceptor` y `ReadOnlyModeInterceptor`.
- `DEFAULT_ETL_API_KEY` definido en `ReadOnlyModeInterceptor`.
**Riesgo:** MEDIO (si se desincroniza, el sidecar rompe sin tests Java automáticos)
**Esfuerzo:** M

**Cambio requerido:** Crear `FhirConstants.java`:

```java
package es.consultamed.hapi;

import java.util.Set;

public final class FhirConstants {
    private FhirConstants() {}

    public static final Set<String> ALLOWED_RESOURCE_TYPES = Set.of(
        "Patient", "Practitioner", "Encounter",
        "Condition", "MedicationRequest", "AllergyIntolerance"
    );

    public static final String ETL_API_KEY_HEADER = "X-Consultamed-ETL-Key";
    public static final String DEFAULT_ETL_API_KEY  = "consultamed-local-etl";
}
```

En los 3 interceptores, reemplazar definiciones locales por `FhirConstants.ALLOWED_RESOURCE_TYPES`, `FhirConstants.ETL_API_KEY_HEADER`, `FhirConstants.DEFAULT_ETL_API_KEY`.

**Test de verificación:** `mvn package -f sidecars/hapi-fhir/overlay/pom.xml` compila. `test_hapi_public_surface.py` pasa.

---

### F2.8 · ETL: timeout y page size configurables por env var

**Archivo:** [backend/app/fhir/etl.py](backend/app/fhir/etl.py) líneas 43, 105
**Problema:** `SEARCH_PAGE_SIZE = 200` y `timeout=30` son constantes hardcoded no configurables.
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambio requerido:**

```python
SEARCH_PAGE_SIZE: int = int(os.getenv("CONSULTAMED_ETL_PAGE_SIZE", "200"))
_HAPI_TIMEOUT_SECONDS: int = int(os.getenv("CONSULTAMED_HAPI_TIMEOUT_SECONDS", "30"))

# En _json_request:
with request.urlopen(req, timeout=_HAPI_TIMEOUT_SECONDS) as response:
```

**Test de verificación:** `pytest tests/unit/test_hapi_clinical_etl.py` pasa.

---

### F2.9 · Frontend: constantes de rutas (`ROUTES`) y endpoints (`ENDPOINTS`)

**Archivos:** múltiples páginas y hooks en [frontend/src/](frontend/src/)
**Problema:** Rutas como `/dashboard`, `/patients/${id}`, `/encounters/${id}/edit` están hardcodeadas en ~15 lugares. Endpoints de API duplicados entre `use-encounter-form.ts`, `patients/[id]/page.tsx` y `dashboard/page.tsx`.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambios requeridos:**

Crear `frontend/src/lib/navigation/routes.ts`:
```typescript
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PATIENTS: '/patients',
  PATIENT_DETAIL: (id: string) => `/patients/${id}`,
  PATIENT_NEW: '/patients/new',
  PATIENT_ENCOUNTERS_NEW: (id: string) => `/patients/${id}/encounters/new`,
  ENCOUNTER_DETAIL: (id: string) => `/encounters/${id}`,
  ENCOUNTER_EDIT: (id: string) => `/encounters/${id}/edit`,
} as const;
```

Crear `frontend/src/lib/api/endpoints.ts`:
```typescript
export const ENDPOINTS = {
  PATIENT_GET: (id: string) => `/patients/${id}`,
  PATIENT_UPDATE: (id: string) => `/patients/${id}`,
  PATIENT_ALLERGIES: (id: string) => `/patients/${id}/allergies`,
  PATIENT_ALLERGY_DELETE: (pid: string, aid: string) => `/patients/${pid}/allergies/${aid}`,
  ENCOUNTERS_BY_PATIENT: (id: string, limit = 20) => `/encounters/patient/${id}?limit=${limit}`,
  TEMPLATES_LIST: (limit = 50) => `/templates?limit=${limit}`,
} as const;
```

Reemplazar strings hardcodeados en: `app/patients/[id]/page.tsx`, `app/dashboard/page.tsx`, `app/encounters/[id]/edit/page.tsx`, `lib/hooks/use-encounter-form.ts`, componentes de navegación.

**Test de verificación:** `npm run type-check && npm run lint` pasa en `frontend/`.

---

### F2.10 · Frontend: componente `LoadingSpinner` reutilizable

**Archivos:** [frontend/src/app/patients/[id]/page.tsx](frontend/src/app/patients/%5Bid%5D/page.tsx), [frontend/src/app/dashboard/page.tsx](frontend/src/app/dashboard/page.tsx), [frontend/src/app/patients/page.tsx](frontend/src/app/patients/page.tsx), [frontend/src/app/encounters/[id]/edit/page.tsx](frontend/src/app/encounters/%5Bid%5D/edit/page.tsx)
**Problema:** El spinner `<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />` está duplicado en 4 páginas.
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambio requerido:**

Crear `frontend/src/components/ui/loading-spinner.tsx`:
```tsx
export function LoadingSpinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
  );
}
```

Reemplazar los 4 usos inline.

**Test de verificación:** `npm run build` sin errores de tipo.

---

### F2.11 · Frontend: clase `ApiError` tipada en cliente HTTP

**Archivo:** [frontend/src/lib/api/client.ts](frontend/src/lib/api/client.ts)
**Problema:** Los errores se lanzan como `new Error(error.detail)`, perdiendo el status code y el endpoint. Los catch en componentes hacen fallback genérico con `err instanceof Error ? err.message : "Error"`.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambio requerido:**

```typescript
export class ApiError extends Error {
  constructor(
    public readonly detail: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(`[${statusCode}] ${detail}`);
    this.name = "ApiError";
  }
}

// En client.ts, reemplazar:
throw new Error(error.detail);
// Por:
throw new ApiError(error.detail ?? "Error desconocido", response.status, endpoint);
```

Actualizar catch blocks en páginas para hacer `err instanceof ApiError` con mensajes específicos.

**Test de verificación:** `npm run type-check` pasa.

---

### F2.12 · Frontend: soporte de `AbortSignal` en cliente HTTP

**Archivo:** [frontend/src/lib/api/client.ts](frontend/src/lib/api/client.ts)
**Problema:** Los fetch no son cancelables. Si el usuario navega mientras se carga una página, el request sigue corriendo y puede producir actualizaciones de estado en componentes desmontados.
**Riesgo:** MEDIO (memory leaks sutiles)
**Esfuerzo:** S

**Cambio requerido:**

```typescript
private async request<T>(
  endpoint: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  // ...
  const response = await fetch(url, { ...options, headers, signal });
}

async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  return this.request<T>(endpoint, { method: "GET" }, signal);
}
```

En hooks con `useEffect`, añadir cleanup:
```typescript
useEffect(() => {
  const controller = new AbortController();
  void loadData(controller.signal);
  return () => controller.abort();
}, [loadData]);
```

**Test de verificación:** `npm run type-check` pasa. Verificar manualmente que requests se cancelan en navegación rápida.

---

### F2.13 · Frontend: constantes de colores Tailwind para prioridad/criticality

**Archivos:** [frontend/src/components/compliance/gap-analysis-section.tsx](frontend/src/components/compliance/gap-analysis-section.tsx), [frontend/src/app/patients/[id]/page.tsx](frontend/src/app/patients/%5Bid%5D/page.tsx), [frontend/src/components/encounters/diagnosis-section.tsx](frontend/src/components/encounters/diagnosis-section.tsx)
**Problema:** Strings de clases Tailwind condicionales (`"border-l-red-500"`, `"bg-red-50 border border-red-200"`) duplicadas inline.
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambio requerido:**

Crear `frontend/src/lib/theme/colors.ts`:
```typescript
export const CRITICALITY_COLORS: Record<string, string> = {
  high: "bg-red-50 border border-red-200",
  medium: "bg-orange-50 border border-orange-200",
  low: "bg-yellow-50 border border-yellow-200",
};

export const GAP_PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-red-500",
  medium: "border-l-yellow-500",
  low: "border-l-gray-400",
};
```

Reemplazar inline strings por referencias a estas constantes.

**Test de verificación:** `npm run lint` pasa.

---

### F2.14 · Tests FHIR: añadir casos de red y recursos huérfanos

**Archivo:** [backend/tests/unit/test_hapi_clinical_etl.py](backend/tests/unit/test_hapi_clinical_etl.py)
**Problema:** No hay tests para: `_json_request` ante HTTPError 503/URLError, recursos huérfanos (MedicationRequest sin Practitioner, Condition sin Encounter), paginación con múltiples páginas en `_fetch_resource_ids`.
**Riesgo:** BAJO
**Esfuerzo:** S

**Tests a añadir:**

1. `test_reference_validation_catches_orphan_condition_without_encounter`
2. `test_reference_validation_catches_orphan_medication_without_practitioner`
3. `test_fetch_resource_ids_handles_multiple_pages`
4. `test_json_request_propagates_http_error_with_context`

**Test de verificación:** `pytest tests/unit/test_hapi_clinical_etl.py -v` pasa con 4 tests nuevos.

---

### F2.15 · Tests: robustecer extracción de constantes Java en `test_hapi_public_surface.py`

**Archivo:** [backend/tests/unit/test_hapi_public_surface.py](backend/tests/unit/test_hapi_public_surface.py)
**Problema:** La regex `rf"{constant_name}\s*=\s*EnumSet\.of\((.*?)\);"` falla silenciosamente con `AssertionError` genérico si el formato Java cambia.
**Riesgo:** BAJO
**Esfuerzo:** XS

**Cambio requerido:**

```python
def _extract_enum_entries(source: str, constant_name: str) -> set[str]:
    match = re.search(
        rf"private\s+static\s+final\s+\S+\s+{constant_name}\s*=\s*EnumSet\.of\((.*?)\);",
        source,
        re.DOTALL,
    )
    if match is None:
        raise ValueError(
            f"Constant '{constant_name}' not found in interceptor source. "
            "Verify the constant name and format haven't changed."
        )
    return set(re.findall(r"RestOperationTypeEnum\.([A-Z_]+)", match.group(1)))
```

**Test de verificación:** `pytest tests/unit/test_hapi_public_surface.py` pasa.

---

## FASE 3 — Arquitectura (riesgo MEDIO, esfuerzo M)

Solo iniciar después de que Fase 1 y Fase 2 estén completas y green. Estos cambios son más invasivos y requieren revisión humana antes de merge.

---

### F3.1 · Mover lógica de negocio de `encounters.py` a `EncounterService`

**Archivo:** [backend/app/api/encounters.py](backend/app/api/encounters.py)
**Problema:** `_build_legacy_note`, `_apply_soap_fields`, `_create_conditions`, `_create_medications` (líneas 43–76) son lógica de negocio en la capa de endpoint.
**Riesgo:** MEDIO (refactor mayor, muchos puntos de cambio)
**Esfuerzo:** M

**Propuesta:**
- Crear `backend/app/services/encounter_service.py` con clase `EncounterService(BaseService[Encounter])`.
- Mover funciones helper como métodos privados de la clase.
- El endpoint queda como orquestador puro: `service = EncounterService(db); return await service.create_with_relations(data, patient_id, practitioner_id)`.

**Prerequisito:** F2.4, F2.5 deben estar completos.
**Test de verificación:** `pytest tests/` completo verde. Smoke test de creación/edición de encounter en local.

---

### F3.2 · Validaciones Pydantic en schemas (DNI, birth_date)

**Archivos:** [backend/app/schemas/patient.py](backend/app/schemas/patient.py), [backend/app/validators/clinical.py](backend/app/validators/clinical.py), [backend/app/services/patient_service.py](backend/app/services/patient_service.py)
**Problema:** La validación de DNI y birth_date ocurre solo en service layer, no en schema. Pydantic rechaza tipos incorrectos pero no lógica de negocio.
**Riesgo:** BAJO
**Esfuerzo:** S

**Propuesta:**
```python
class PatientCreate(PatientBase):
    @field_validator("identifier_value")
    @classmethod
    def validate_dni(cls, v: str) -> str:
        is_valid, _ = validate_documento_identidad(v)
        if not is_valid:
            raise ValueError("DNI/NIE inválido")
        return v

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date_value(cls, v: date) -> date:
        is_valid, error = validate_birth_date(v)
        if not is_valid:
            raise ValueError(error)
        return v
```

Mantener validaciones en service como segunda línea de defensa (no eliminar).

**Test de verificación:** Tests de contratos de `POST /patients` con DNI inválido reciben 422.

---

### F3.3 · Auth store en Zustand (frontend)

**Archivo:** [frontend/src/lib/stores/auth-store.ts](frontend/src/lib/stores/auth-store.ts)
**Problema:** El store custom notifica listeners manualmente. Los componentes que leen `authStore.isAuthenticated` directamente no se re-renderizan cuando cambia.
**Riesgo:** MEDIO
**Esfuerzo:** M

**Propuesta:**
- Instalar `zustand` (ya está en `package.json` si no, añadirlo).
- Reescribir `auth-store.ts` con `create<AuthStore>()(persist(...))`.
- Cambiar `useAuth()` por `useAuthStore()` en todos los puntos de uso.
- El middleware `persist` maneja `loadFromStorage` automáticamente.

**Test de verificación:** Login/logout funcionan sin regresión. `npm run type-check` pasa.

---

### F3.4 · ETL: reintentos con backoff exponencial

**Archivo:** [backend/app/fhir/etl.py](backend/app/fhir/etl.py) línea 86
**Problema:** `_json_request` no reintenta en transient errors (503, URLError). Un restart de HAPI durante la ETL aborta toda la carga.
**Riesgo:** MEDIO
**Esfuerzo:** M

**Propuesta:**
```python
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)
from urllib.error import URLError, HTTPError

def _is_transient(exc: BaseException) -> bool:
    if isinstance(exc, RuntimeError) and "HTTP 5" in str(exc):
        return True
    return isinstance(exc, (URLError,))

@retry(
    retry=retry_if_exception(_is_transient),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _json_request(...) -> dict[str, Any]:
    ...
```

Añadir `tenacity` a `backend/pyproject.toml` o `requirements.txt`.

**Test de verificación:** Test nuevo que verifica que un 503 en el primer intento es reintentado y tiene éxito en el segundo.

---

### F3.5 · ETL: paralelizar carga de PUT por batch

**Archivo:** [backend/app/fhir/etl.py](backend/app/fhir/etl.py) líneas 419–428
**Problema:** Los PUT de recursos se hacen secuencialmente. Con 500+ recursos, la ETL tarda múltiples minutos.
**Riesgo:** MEDIO (cambio en control de flujo)
**Esfuerzo:** M

**Propuesta:**
```python
from concurrent.futures import ThreadPoolExecutor, as_completed

MAX_CONCURRENT_PUTS = int(os.getenv("CONSULTAMED_ETL_MAX_CONCURRENCY", "10"))

def _put_resource(resource: dict[str, Any], base_url: str, api_key: str) -> None:
    resource_type = resource["resourceType"]
    resource_id = resource["id"]
    _json_request(
        f"{base_url}/{resource_type}/{resource_id}",
        method="PUT",
        api_key=api_key,
        payload=resource,
    )

for batch in build_load_plan(snapshot):
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_PUTS) as pool:
        futures = [
            pool.submit(_put_resource, resource, resolved_base_url, resolved_api_key)
            for resource in batch.resources
        ]
        for future in as_completed(futures):
            future.result()  # Propaga excepciones
```

**Prerequisito:** F3.4 (reintentos) debe estar completo para que paralelismo sea seguro.
**Test de verificación:** Test existente de `run_clinical_subset_etl` pasa. Medir tiempo de ejecución con dataset real.

---

## FASE 4 — Deriva Técnica (segunda pasada)

Hallazgos identificados en análisis de segunda pasada. Son problemas latentes que no rompen hoy pero crecen con el tiempo. Ejecutar después de Fase 3, o intercalar los de riesgo ALTO con Fase 1/2 cuando sea conveniente.

---

### F4.1 · `datetime.utcnow()` deprecated en todos los modelos ORM

**Archivos:** [backend/app/models/patient.py](backend/app/models/patient.py):69, [allergy.py](backend/app/models/allergy.py):71, [condition.py](backend/app/models/condition.py):67, [encounter.py](backend/app/models/encounter.py):56, [medication_request.py](backend/app/models/medication_request.py):95, [template.py](backend/app/models/template.py):73,77
**Problema:** `datetime.utcnow` como `default=` en columnas ORM está deprecated desde Python 3.12. Genera `DeprecationWarning` y fallará en futuras versiones.
**Riesgo:** MEDIO
**Esfuerzo:** S

**Cambio requerido:** En todos los modelos, reemplazar:
```python
default=datetime.utcnow
# por:
default=lambda: datetime.now(timezone.utc)
```
Añadir `from datetime import timezone` donde falte.

**Test de verificación:** `python -W error -c "from app.models.patient import Patient"` sin warnings.

---

### F4.2 · Typing legacy (`Optional`, `List`, `Union`) en Python 3.10+

**Archivos:** `app/api/auth.py`, `encounters.py`, `patients.py`, `templates.py`, `services/base.py` y otros
**Problema:** `Optional[X]`, `List[X]`, `Union[X, Y]` de `typing` son innecesarios en Python 3.10+ donde se usa `X | None`, `list[X]`, `X | Y` directamente. Las importaciones de `typing` quedarán obsoletas.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambio requerido:** Búsqueda y reemplazo global:
```bash
# Verificar scope:
grep -rn "from typing import.*Optional\|List\|Union" backend/app/
```
Reemplazar `Optional[X]` → `X | None`, `List[X]` → `list[X]`, `Union[X, Y]` → `X | Y`. Eliminar imports de `typing` que queden vacíos.

**Test de verificación:** `pytest tests/unit tests/contracts -q` verde.

---

### F4.3 · `assert` en validación post-ETL `_verify_sample_resources`

**Archivo:** [backend/app/fhir/etl.py](backend/app/fhir/etl.py) líneas 303–341
**Problema:** `_verify_sample_resources()` usa `assert` para verificar referencias cruzadas de recursos tras la carga. Los asserts se desactivan con `python -O` (modo optimizado), haciendo la validación silenciosa y devolviendo `LoadReport(success=True)` aunque los datos sean inconsistentes.
**Riesgo:** ALTO (corrupción silenciosa de datos FHIR)
**Esfuerzo:** S

**Cambio requerido:** Reemplazar cada `assert condicion, "mensaje"` por:
```python
if not condicion:
    raise ValueError("mensaje")
```

**Test de verificación:** `python -O -c "from app.fhir.etl import _verify_sample_resources"` y test unitario que verifica que la función lanza `ValueError` ante datos inválidos.

---

### F4.4 · ETL key y resource types como triple fuente de verdad (Python + Java×2)

**Archivos:** [backend/app/fhir/etl.py](backend/app/fhir/etl.py):32–41, [ReadOnlyModeInterceptor.java](sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/ReadOnlyModeInterceptor.java):17–35, [CapabilityStatementCustomizer.java](sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/CapabilityStatementCustomizer.java):18–25
**Problema:**
- `ETL_API_KEY_HEADER = "X-Consultamed-ETL-Key"` existe en Python y Java (2 lugares).
- `DEFAULT_ETL_API_KEY = "consultamed-local-etl"` idem.
- `RESOURCE_TYPE_ORDER` (Python) vs `ALLOWED_RESOURCE_TYPES` (Java×2): la lista de 6 tipos existe en **tres** lugares. Cambiar uno sin los otros rompe la autenticación o la política de acceso.

**Nota:** F2.7 ya cubre la deduplicación Java→Java. Esta tarea cubre la alineación Python→Java.
**Riesgo:** ALTO
**Esfuerzo:** M

**Cambio requerido:**
1. Crear `backend/app/fhir/fhir_constants.py` con `APPROVED_RESOURCE_TYPES` y `ETL_API_KEY_HEADER` como fuente de verdad Python.
2. Añadir test en `test_hapi_sidecar_bootstrap.py` que lea Java source y verifique que contiene exactamente los mismos tipos que `fhir_constants.py`.
3. Documentar en `docs/FHIR_ETL_API_CONTRACT.md` los tres valores compartidos + instrucción de mantener sincronizados.

**Test de verificación:** Test nuevo que cross-valida Python vs Java source. `pytest tests/unit/test_hapi_sidecar_bootstrap.py` verde.

---

### F4.5 · Race condition en `PatientService.create` (check-then-act sin IntegrityError handling)

**Archivo:** [backend/app/services/patient_service.py](backend/app/services/patient_service.py) líneas 147–156
**Problema:** El patrón `get_by_dni → if exists raise → add patient` tiene ventana de race condition entre dos requests concurrentes con el mismo DNI. La DB tiene `UNIQUE constraint` en `identifier_value`, pero un `IntegrityError` no se captura: FastAPI retorna 500 genérico en lugar de 409 Conflict.
**Riesgo:** ALTO
**Esfuerzo:** M

**Cambio requerido:**
```python
from sqlalchemy.exc import IntegrityError

try:
    self.db.add(patient)
    await self.commit_and_refresh(patient)
except IntegrityError as exc:
    await self.db.rollback()
    if "identifier_value" in str(exc):
        raise ValueError(f"Paciente con DNI {data['identifier_value']} ya existe") from exc
    raise
```
Patrón similar aplicar en `add_allergy` si tiene constraint único.

**Test de verificación:** Test que hace dos creates simultáneos con el mismo DNI y verifica que uno retorna 409 o 400 sin 500.

---

### F4.6 · Logging ausente en operaciones clínicas críticas

**Archivos:** [backend/app/services/patient_service.py](backend/app/services/patient_service.py), [backend/app/api/encounters.py](backend/app/api/encounters.py)
**Problema:** Creación de paciente, adición/eliminación de alergias, y creación de encuentros no producen ningún log. Sin logs, la auditoría médica y el debugging son imposibles. Regulaciones de datos clínicos requieren trazabilidad.
**Riesgo:** ALTO (auditoría clínica / compliance)
**Esfuerzo:** M

**Cambio requerido:** Añadir `logger = logging.getLogger(__name__)` en cada módulo y loguear:
```python
# patient_service.py: create
logger.info("patient.created id=%s dni_masked=%s", patient.id, patient.identifier_value[:3] + "***")

# patient_service.py: add_allergy
logger.info("allergy.added patient_id=%s allergy_id=%s", patient_id, allergy.id)

# encounters.py: create
logger.info("encounter.created id=%s patient_id=%s practitioner_id=%s", encounter.id, patient_id, practitioner_id)
```
**Nunca** loguear datos clínicos completos (nombre, DNI completo, diagnósticos) — solo IDs y masked values.

**Test de verificación:** Ejecutar flujo de creación y verificar que aparecen logs con nivel INFO en stdout.

---

### F4.7 · Transacción sin rollback explícito en `update_encounter`

**Archivo:** [backend/app/api/encounters.py](backend/app/api/encounters.py) líneas 295–320
**Problema:** El flujo `DELETE conditions → flush → CREATE new conditions` no tiene try/except con rollback. Si `_create_conditions` falla a mitad, el encounter queda sin condiciones (datos borrados, no reinsertados). FastAPI hará rollback implícito al final del request, pero no hay logging del error ni garantía en todos los paths.
**Riesgo:** ALTO (pérdida de datos clínicos en edición)
**Esfuerzo:** M

**Cambio requerido:**
```python
try:
    # DELETE + flush + CREATE conditions/medications
    await db.commit()
except Exception:
    await db.rollback()
    logger.exception("encounter.update.failed encounter_id=%s", encounter_id)
    raise HTTPException(status_code=500, detail="Error al actualizar la consulta")
```
**Prerequisito:** F2.5 (batch DELETE) debe estar completo.

**Test de verificación:** Test que mockea fallo en `_create_conditions` y verifica que encounter mantiene sus condiciones originales (o lanza error claro).

---

### F4.8 · FK `ondelete` inconsistente entre modelos

**Archivos:** [backend/app/models/encounter.py](backend/app/models/encounter.py):47–50, [medication_request.py](backend/app/models/medication_request.py):50–54, [template.py](backend/app/models/template.py):63–68
**Problema:** `Encounter.participant_id` y `MedicationRequest.requester_id` (FK a Practitioner) no tienen `ondelete`. `TreatmentTemplate.practitioner_id` es nullable sin `ondelete="SET NULL"`. Si se elimina un Practitioner, la DB puede rechazar el delete (FK violation) o, si no hay constraint real, dejar huérfanos.
**Riesgo:** MEDIO
**Esfuerzo:** S

**Cambio requerido:**
```python
# encounter.py, medication_request.py
ForeignKey("practitioners.id", ondelete="RESTRICT")  # Impide borrar médico con datos

# template.py
ForeignKey("practitioners.id", ondelete="SET NULL")   # Template pasa a ser global
```
Requiere migración Alembic para cada cambio de FK.

**Test de verificación:** Migración aplica sin error. Test que intenta eliminar practitioner con encounters activos y verifica que recibe error de integridad referencial.

---

### F4.9 · `_format_fhir_datetime` no idempotente en timezone

**Archivo:** [backend/app/fhir/clinical_mapping.py](backend/app/fhir/clinical_mapping.py) líneas 110–114
**Problema:**
```python
def _format_fhir_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()
```
La función asume que `tzinfo=None` significa UTC. Datos que vienen de DB PostgreSQL con `TIMESTAMP WITHOUT TIME ZONE` tienen `tzinfo=None` pero podrían representar hora local del servidor. Si el servidor no está en UTC, los timestamps FHIR serán incorrectos.
**Riesgo:** MEDIO
**Esfuerzo:** S

**Cambio requerido:** Normalizar en el modelo ORM, no en la serialización. En los modelos, cambiar columnas de `DateTime(timezone=True)` y en la app config, asegurar que PostgreSQL está configurado en UTC (`timezone = 'UTC'`). Añadir comentario documentando la asunción.

**Test de verificación:** Test con `datetime` sin tzinfo verifica que el output FHIR contiene `+00:00`.

---

### F4.10 · JWT en localStorage vulnerable a XSS (frontend)

**Archivo:** [frontend/src/lib/stores/auth-store.ts](frontend/src/lib/stores/auth-store.ts) líneas 48–49
**Problema:** El token JWT se persiste en `localStorage`. Cualquier script inyectado en la página (XSS) puede robarlo. Los tokens clínicos con acceso a datos de pacientes son objetivo de alto valor.
**Riesgo:** ALTO (seguridad)
**Esfuerzo:** M

**Propuesta corto plazo** (sin cambios de backend):
- Mover de `localStorage` a `sessionStorage`: el token no persiste entre sesiones, reduciendo la ventana de exposición. Cambio de 1 línea.
- Añadir `Content-Security-Policy` header en Next.js para limitar XSS.

**Propuesta largo plazo** (requiere backend):
- Migrar a httpOnly cookie para el token: el JS nunca puede acceder a él. Requiere cambio en `POST /auth/login` para devolver `Set-Cookie` en lugar de JSON.

**Test de verificación (corto plazo):** Verificar que tras cerrar y reabrir el navegador, la sesión expira (comportamiento de sessionStorage).

---

### F4.11 · Timers sin cleanup en `diagnosis-section` y `medication-section`

**Archivos:** [frontend/src/components/encounters/diagnosis-section.tsx](frontend/src/components/encounters/diagnosis-section.tsx):87–90, [medication-section.tsx](frontend/src/components/encounters/medication-section.tsx):90–94
**Problema:**
```tsx
onBlur={() => {
  window.setTimeout(() => {
    closeDiagnosisSuggestions();
    setActiveDiagnosisIndex(null);
  }, 120);
}}
```
El `setTimeout` no se cancela si el componente desmonta antes de los 120ms. React 18 en modo estricto lo detecta; en producción causa `setState on unmounted component` (warning) y potencialmente estado inconsistente.
**Riesgo:** MEDIO
**Esfuerzo:** S

**Cambio requerido:** Mover a ref + useEffect con cleanup:
```tsx
const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleBlur = useCallback(() => {
  blurTimerRef.current = setTimeout(() => {
    closeDiagnosisSuggestions();
    setActiveDiagnosisIndex(null);
  }, 120);
}, [closeDiagnosisSuggestions, setActiveDiagnosisIndex]);

useEffect(() => {
  return () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  };
}, []);
```
Aplicar el mismo patrón en `medication-section.tsx`.

**Test de verificación:** `npm run type-check` pasa. Verificar que no hay warnings de React en modo estricto.

---

### F4.12 · Formulario de encounter no se resetea en modo creación tras submit

**Archivo:** [frontend/src/lib/hooks/use-encounter-form.ts](frontend/src/lib/hooks/use-encounter-form.ts) líneas 548–632
**Problema:** Tras un POST exitoso en modo creación, el estado del formulario (conditions, medications, campos SOAP) no se resetea. Si el usuario navega de vuelta y crea otro encounter, ve los datos del anterior.
**Riesgo:** MEDIO (UX + datos incorrectos)
**Esfuerzo:** S

**Cambio requerido:** Al final del `handleSubmit` exitoso en modo creación:
```typescript
if (!encounterId) {
  // Reset form state after successful creation
  setConditions([defaultCondition]);
  setMedications([]);
  setReasonText("");
  setSubjectiveText("");
  // ... resto de campos SOAP
}
```

**Test de verificación:** Verificar manualmente que tras guardar un nuevo encounter, el formulario queda vacío.

---

### F4.13 · `EncounterListResponse` y tipos redefinidos manualmente divergen de `api.generated.ts`

**Archivo:** [frontend/src/types/api.ts](frontend/src/types/api.ts) líneas 53–67
**Problema:** `Encounter` y `EncounterListResponse` están redefinidos manualmente para corregir campos opcionales que el generador marca incorrectamente. Cuando el backend evoluciona y se regenera `api.generated.ts`, los tipos manuales en `api.ts` no se actualizan automáticamente, creando drift silencioso.
**Riesgo:** MEDIO
**Esfuerzo:** S

**Cambio requerido:**
1. Documentar en `api.ts` que cada override es intencional con comentario `// OVERRIDE: generated type marks X as optional but backend guarantees it`.
2. Añadir en `package.json` un script `generate:types` que regenere `api.generated.ts` y un CI check que detecte si el archivo generado difiere del comiteado.
3. Evaluar si los overrides siguen siendo necesarios tras regenerar.

**Test de verificación:** `npm run generate:types` existe y produce output sin errores.

---

### F4.14 · `HealthCheck.java`: búsqueda de string frágil en respuesta JSON

**Archivo:** [sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/HealthCheck.java](sidecars/hapi-fhir/overlay/src/main/java/es/consultamed/hapi/HealthCheck.java):24
**Problema:**
```java
if (response.statusCode() == 200 && response.body().contains("\"status\":\"UP\"")) {
```
Búsqueda de substring en JSON. Si HAPI añade espacios, cambia capitalización o el orden de campos, el check falla aunque el sidecar esté sano.
**Riesgo:** BAJO
**Esfuerzo:** S

**Cambio requerido:** Parsear JSON con la librería disponible en classpath (Jackson/Gson ya en HAPI):
```java
ObjectMapper mapper = new ObjectMapper();
JsonNode json = mapper.readTree(response.body());
String status = json.path("status").asText("");
if (response.statusCode() == 200 && "UP".equals(status)) { ... }
```

**Test de verificación:** `mvn package` compila. Probar manualmente con sidecar en marcha.

---

### F4.15 · Orden de interceptores Java implícito y no documentado

**Archivo:** [sidecars/hapi-fhir/consultamed.application.yaml](sidecars/hapi-fhir/consultamed.application.yaml) línea ~47
**Problema:** `custom-interceptor-classes` lista los interceptores en un orden que tiene implicaciones semánticas (ReadOnly antes de Audit, etc.) pero el orden no está documentado ni validado. Un refactor que reordene la lista puede cambiar el comportamiento de auditoría silenciosamente.
**Riesgo:** MEDIO
**Esfuerzo:** XS

**Cambio requerido:** Añadir comentario en el YAML:
```yaml
# Interceptor order matters:
# 1. ReadOnlyModeInterceptor  — must run FIRST to reject writes before audit logs them
# 2. CapabilityStatementCustomizer — metadata only, order-independent
# 3. AuditTrailInterceptor    — must run LAST to capture final outcome
custom-interceptor-classes: es.consultamed.hapi.ReadOnlyModeInterceptor,...
```

**Test de verificación:** Revisión manual. No requiere test automatizado.

---

## Matriz de priorización (completa)

| ID | Descripción breve | Fase | Riesgo | Esfuerzo | Prerequisito |
|----|-------------------|------|--------|----------|--------------|
| F1.1 | SQLALCHEMY_ECHO desacoplado de DEBUG | 1 | ALTO | XS | — |
| F1.2 | Health check con SELECT 1 | 1 | ALTO | S | — |
| F1.3 | CORS dinámico por entorno | 1 | MEDIO | S | — |
| F1.4 | Warning ETL con API key default | 1 | BAJO | XS | — |
| F4.3 | `assert` → `ValueError` en `_verify_sample_resources` | 1† | ALTO | S | — |
| F4.5 | Race condition + IntegrityError en PatientService.create | 1† | ALTO | M | — |
| F4.6 | Logging en operaciones clínicas críticas | 1† | ALTO | M | — |
| F4.7 | Rollback explícito en update_encounter | 1† | ALTO | M | F2.5 |
| F4.10 | JWT: sessionStorage como paso previo a httpOnly cookie | 1† | ALTO | M | — |
| F2.1 | Centralizar FHIR identifier systems | 2 | BAJO | S | — |
| F2.2 | `_build_coding_concept` helper | 2 | BAJO | S | F2.1 |
| F2.3 | Helpers duplicados en templates.py | 2 | BAJO | XS | — |
| F2.4 | Helper encounter query con relations | 2 | BAJO | S | — |
| F2.5 | Batch DELETE en update_encounter | 2 | BAJO | S | — |
| F2.6 | Constantes GENDER_LABELS, etc. | 2 | BAJO | XS | — |
| F2.7 | FhirConstants.java | 2 | MEDIO | M | — |
| F2.8 | ETL timeout/pagesize configurables | 2 | BAJO | XS | — |
| F2.9 | ROUTES + ENDPOINTS frontend | 2 | BAJO | S | — |
| F2.10 | LoadingSpinner reutilizable | 2 | BAJO | XS | — |
| F2.11 | Clase ApiError tipada | 2 | BAJO | S | — |
| F2.12 | AbortSignal en cliente HTTP | 2 | MEDIO | S | F2.11 |
| F2.13 | Constantes de colores Tailwind | 2 | BAJO | XS | — |
| F2.14 | Tests FHIR casos de red + huérfanos | 2 | BAJO | S | — |
| F2.15 | Robustecer regex en public_surface test | 2 | BAJO | XS | — |
| F4.1 | `datetime.utcnow` → `datetime.now(timezone.utc)` | 2 | MEDIO | S | — |
| F4.2 | Typing legacy `Optional`/`List` → built-ins | 2 | BAJO | S | — |
| F4.4 | `fhir_constants.py` + cross-validate Python↔Java | 2 | ALTO | M | F2.7 |
| F4.8 | FK `ondelete` consistente entre modelos | 2 | MEDIO | S | — |
| F4.9 | `_format_fhir_datetime` timezone assumption documentada | 2 | MEDIO | S | — |
| F4.11 | Cleanup timers en diagnosis/medication sections | 2 | MEDIO | S | — |
| F4.12 | Reset formulario encounter tras submit | 2 | MEDIO | S | — |
| F4.13 | Documentar/validar overrides en api.ts | 2 | MEDIO | S | — |
| F4.14 | HealthCheck.java: parsear JSON en lugar de buscar string | 2 | BAJO | S | — |
| F4.15 | Documentar orden de interceptores Java | 2 | MEDIO | XS | — |
| F3.1 | EncounterService (extraer lógica) | 3 | MEDIO | M | F2.4, F2.5, F4.7 |
| F3.2 | Validaciones Pydantic en schemas | 3 | BAJO | S | — |
| F3.3 | Auth store en Zustand | 3 | MEDIO | M | F4.10 |
| F3.4 | ETL reintentos con tenacity | 3 | MEDIO | M | F2.8 |
| F3.5 | ETL carga paralela con ThreadPoolExecutor | 3 | MEDIO | M | F3.4 |

†: Promovido a Fase 1 por riesgo ALTO aunque identificado en segunda pasada.

---

## Instrucciones para el agente de ejecución

1. **Leer primero:** `AGENTS.md`, `CLAUDE.md`, este documento completo.
2. **Entorno Python:** `cd backend && source .venv/bin/activate` antes de cualquier comando Python.
3. **Gate de tests:** después de cada tarea, ejecutar:
   ```bash
   cd backend && pytest tests/unit tests/contracts -v --tb=short -q
   cd frontend && npm run type-check && npm run lint
   ```
4. **Commit por tarea:** cada ítem F*.* es un commit semántico independiente. Ejemplo: `refactor(fhir): centralize identifier system constants (F2.1)`.
5. **No mezclar fases:** completar todos los ítems de Fase 1 antes de empezar Fase 2.
6. **Stop on red:** si algún test falla tras un cambio, no continuar a la siguiente tarea. Reportar el fallo con detalle.
7. **No tocar sin consenso:** `backend/alembic/` (migraciones solo bajo revisión), `docker-compose.yml` — fuera de scope. Excepción: F4.15 permite añadir comentarios en `consultamed.application.yaml`.
8. **Tareas F2.7, F4.4, F4.8 y F3.x** requieren confirmación humana antes de merge (cambios en Java, migraciones de FK y arquitectura respectivamente).
