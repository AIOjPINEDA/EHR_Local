# Guía pedagógica del baseline HAPI FHIR R5 en ConsultaMed

## 1. Cómo leer esta guía

Esta guía está escrita para el owner/operator del repositorio que quiere entender **desde cero** qué se implementó, por qué se hizo así y cómo operarlo sin romper la app principal.

Si encuentras una contradicción entre documentos, el orden de prioridad es:

1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`
4. Este documento

Importante: esta guía describe una **baseline local de interoperabilidad** ya implementada. **No** describe un despliegue productivo completo ni convierte a HAPI en el backend principal de ConsultaMed.

## 2. Resumen ejecutivo: qué se implementó

Se implementó un **sidecar local HAPI FHIR R5** en `sidecars/hapi-fhir/` usando el starter oficial de HAPI, con estas características:

- corre separado de FastAPI;
- usa su propia PostgreSQL dedicada (`consultamed-hapi-db`, host `localhost:54330` por defecto);
- publica una superficie FHIR mínima y controlada;
- recibe datos desde ConsultaMed mediante una **ETL one-way, repetible, idempotente y convergente sin exigir `--reset` para limpiar recursos stale del subset aprobado**;
- deja a **FastAPI como fuente de verdad** para escrituras, autenticación y lógica clínica.

Traducido a lenguaje práctico:

- **la app sigue funcionando como antes** aunque HAPI no exista;
- HAPI añade una **capa interoperable local** para exponer un subconjunto FHIR consistente;
- no hay dual-write, no hay migración de ownership y no hay aperturas públicas de escritura.

## 3. Problema que resuelve y por qué se implementó así

### 3.1 Qué problema resuelve

ConsultaMed ya tenía modelos y naming alineados con FHIR, pero no exponía una superficie FHIR real. La baseline HAPI resuelve eso de forma progresiva: añade interoperabilidad **sin reescribir el producto**.

### 3.2 Por qué HAPI es sidecar y no sustituto de FastAPI

Se eligió sidecar porque reduce el riesgo operativo:

- FastAPI ya resuelve el producto real: auth, CRUD, lógica clínica y PDFs.
- Si HAPI falla, la operación diaria del MVP no debe caer.
- Permite introducir interoperabilidad sin mezclar de golpe responsabilidades.

### 3.3 Por qué se usó el starter oficial

El `Dockerfile` parte de `hapiproject/hapi:v8.8.0-1` y añade un overlay propio. Esto se hizo para:

- evitar un bootstrap artesanal difícil de mantener;
- apoyarse en el ciclo de vida estándar de HAPI JPA;
- dejar el build reproducible y más cercano a la plataforma soportada.

### 3.4 Por qué la base de datos es dedicada

HAPI no comparte la base operacional de ConsultaMed.

- DB operacional FastAPI: `consultamed-db` en `localhost:54329` por defecto.
- DB del sidecar HAPI: `consultamed-hapi-db` en `localhost:54330` por defecto.

Esto simplifica rollback, troubleshooting y límites de responsabilidad. También evita aplicar por error `supabase/migrations` sobre la persistencia FHIR.

### 3.5 Por qué la transferencia es ETL one-way

La baseline usa ETL porque era la forma más segura de arrancar:

- no introduce escrituras duplicadas;
- no obliga a cambiar los flujos actuales del producto;
- permite resetear y recargar HAPI sin tocar la fuente de verdad;
- hace explícito qué entra en la superficie FHIR y qué no.

## 4. Arquitectura actual y fronteras operativas

La arquitectura actual funciona así:

1. El usuario usa ConsultaMed por frontend y FastAPI.
2. FastAPI guarda y gobierna los datos clínicos en la base operacional.
3. Cuando quieres poblar HAPI, ejecutas la ETL desde backend.
4. La ETL lee datos desde la fuente operacional, construye recursos FHIR deterministas y los envía al sidecar.
5. HAPI persiste esos recursos en su PostgreSQL dedicada.
6. Los consumidores FHIR locales solo leen o buscan sobre ese subconjunto publicado.

### 4.1 Quién es dueño de qué

| Componente | Responsabilidad real |
|---|---|
| FastAPI | Source of truth, auth, lógica clínica, escrituras |
| PostgreSQL operacional | Persistencia del producto |
| HAPI sidecar | Exposición FHIR local y búsqueda/lectura del subset |
| PostgreSQL dedicada HAPI | Persistencia exclusiva del repositorio FHIR |
| ETL interna | Copia controlada desde ConsultaMed hacia HAPI |

### 4.2 Qué pasa si HAPI se cae

La app principal puede seguir funcionando porque HAPI **no reemplaza** a FastAPI. Lo que pierdes temporalmente es la superficie FHIR local y la posibilidad de consultar ese subset vía HAPI.

## 5. Componentes implementados del baseline

Estas son las piezas más importantes y qué hace cada una:

| Ruta | Papel |
|---|---|
| `sidecars/hapi-fhir/Dockerfile` | Construye la imagen del sidecar a partir del starter oficial |
| `sidecars/hapi-fhir/docker-compose.yml` | Levanta HAPI + PostgreSQL dedicada, ambas ligadas a `127.0.0.1` |
| `sidecars/hapi-fhir/consultamed.application.yaml` | Configura FHIR R5, subset permitido, datasource e interceptors |
| `scripts/start-hapi-sidecar.sh` | Build + arranque + espera de health y metadata |
| `scripts/stop-hapi-sidecar.sh` | Parada segura del sidecar |
| `scripts/load-hapi-clinical-subset.sh` | Orquesta DB operacional, arranque HAPI y ETL inicial |
| `backend/scripts/load_hapi_clinical_subset.py` | CLI Python que ejecuta la carga |
| `backend/app/fhir/etl.py` | Snapshot, orden de carga, PUT upserts, conteos y verificación post-load |
| `backend/app/fhir/base_mapping.py` | Mapping determinista de `Patient` y `Practitioner` |
| `backend/app/fhir/clinical_mapping.py` | Mapping clínico, referencias e inclusión SOAP transicional |
| `ReadOnlyModeInterceptor.java` | Bloquea escrituras públicas; solo deja pasar la ETL con clave interna |
| `CapabilityStatementCustomizer.java` | Reduce la superficie publicada al subset e interacciones aprobadas y elimina claims públicos de versionado/escritura |
| `AuditTrailInterceptor.java` | Emite auditoría sanitaria mínima y sanitizada |

## 6. Subset FHIR entregado y cómo se mapea

La baseline publica exactamente este subset:

- `Patient`
- `Practitioner`
- `Encounter`
- `Condition`
- `MedicationRequest`
- `AllergyIntolerance`

### 6.1 Qué significa “mapping determinista”

Significa que la ETL no inventa identificadores aleatorios cada vez. Usa IDs y referencias reproducibles para que una recarga produzca recursos coherentes y navegables.

### 6.2 Ejemplos de mapeo

| Modelo local | Recurso FHIR | Idea principal |
|---|---|---|
| `Patient` | `Patient` | conserva identificadores de negocio y un identificador fuente |
| `Practitioner` | `Practitioner` | conserva identificador fuente y datos profesionales básicos |
| `Encounter` | `Encounter` | queda como recurso ancla de la consulta |
| `Condition` | `Condition` | referencia de forma determinista a `Patient` y `Encounter` |
| `MedicationRequest` | `MedicationRequest` | referencia a paciente, encuentro y solicitante |
| `AllergyIntolerance` | `AllergyIntolerance` | referencia al paciente de forma estable |

### 6.3 Qué pasa con el SOAP clínico

El contenido SOAP actual no se perdió. En esta baseline se conserva mediante una **extensión transicional** en `Encounter`, priorizando trazabilidad y consistencia por encima de una modelización más ambiciosa.

## 7. Superficie publicada, seguridad y auditoría

### 7.1 Qué se publica realmente

La superficie local aprobada queda limitada, por interacción/operación HAPI, a:

- `CapabilityStatement` (`/fhir/metadata`)
- `read`
- `search` (`SEARCH_TYPE`)
- recuperación de páginas `Bundle` derivadas de búsqueda (`_getpages`)

No se publica una API FHIR general completa ni otros GET/operations del starter. Ejemplos explícitamente no expuestos al público: `_history`, `vread`, `$meta`, `$get-resource-counts` y cualquier operación fuera del subset aprobado.
Además, el `CapabilityStatement` publicado ya no anuncia versionado de recursos, `read history`, `updateCreate` ni capacidades condicionales/de escritura hacia clientes públicos.

### 7.2 Qué escrituras están bloqueadas

Las escrituras públicas y las operaciones no aprobadas están cerradas. El interceptor `ReadOnlyModeInterceptor` solo permite operaciones fuera de la whitelist pública cuando la petición lleva la cabecera interna:

- `X-Consultamed-ETL-Key`

y esa clave coincide con `CONSULTAMED_ETL_API_KEY`.

En local, el valor por defecto es `consultamed-local-etl`, pero puedes cambiarlo si exportas la variable antes de arrancar y cargar. Esto mantiene a FastAPI como source of truth, evita dual-write y deja las escrituras generales fuera de la superficie pública.

### 7.3 Qué se audita

La auditoría del sidecar registra lo mínimo útil para un entorno sanitario:

- `requestId`
- método HTTP
- tipo de interacción
- tipo e id del recurso
- éxito o fallo
- duración
- si fue escritura interna

Deliberadamente **no** registra URLs completas, query strings, payloads ni material de autorización.

## 8. Impacto real sobre ConsultaMed

### 8.1 Lo que sigue igual

- El usuario sigue usando frontend + FastAPI.
- La autenticación sigue siendo JWT en FastAPI.
- Las escrituras clínicas siguen entrando por la app principal.
- La base de datos operacional sigue siendo la que gobierna el producto.

### 8.2 Lo que ahora existe y antes no

- Un `CapabilityStatement` FHIR R5 local, controlado y sin claims públicos de versionado/escritura fuera del baseline aprobado.
- Lectura individual (`read`) del subset aprobado.
- Búsquedas (`search`) con respuesta `Bundle`.
- Un camino reproducible para cargar datos clínicos a un repositorio FHIR local.

### 8.3 Lo que el operador no debe asumir

No debes asumir que HAPI sustituye a ConsultaMed ni que ya existe una API FHIR general de escritura. Esa no es la baseline entregada.

## 9. Capacidades nuevas y límites actuales

### 9.1 Capacidades nuevas reales

| Capacidad | Ya disponible |
|---|---|
| Arranque reproducible de HAPI local | Sí |
| PostgreSQL dedicada para HAPI | Sí |
| ETL convergente del subset clínico sin `--reset` obligatorio | Sí |
| `CapabilityStatement` consistente con el subset | Sí |
| `read` y `search` sobre 6 recursos | Sí |
| Respuestas `Bundle` de búsqueda | Sí |
| Healthcheck con readiness real y espera a `healthy` | Sí |
| Auditoría mínima sanitizada | Sí |

### 9.2 Límites explícitos de la baseline

| Límite | Estado |
|---|---|
| Escrituras FHIR públicas | Bloqueadas |
| Dual-write FastAPI ↔ HAPI | No implementado |
| HAPI como source of truth | No implementado |
| Superficie fuera del subset de 6 recursos | Fuera de alcance |
| SMART on FHIR, MDM, CDS Hooks, HFQL, terminology avanzado | Fuera de alcance |
| Gate global completamente verde | No garantizado por deuda heredada de `mypy` |

## 10. Preparación desde cero

### 10.1 Qué necesitas antes de empezar

- estar en la **raíz del repo**;
- Docker Desktop / Docker Engine operativos;
- Python 3.11+;
- dependencias backend instaladas en `backend/.venv`;
- `backend/.env` apuntando a la base operacional correcta.

### 10.2 Qué no necesitas instalar en host para el sidecar

No necesitas un JDK local para el uso normal de esta baseline. El `Dockerfile` compila el overlay con Maven dentro del build y ejecuta HAPI desde la imagen `hapiproject/hapi:v8.8.0-1`.

### 10.3 Variables y puertos importantes

| Variable / puerto | Significado | Default |
|---|---|---|
| `LOCAL_POSTGRES_PORT` | Puerto de la DB operacional | `54329` |
| `LOCAL_HAPI_PORT` | Puerto HTTP del sidecar HAPI | `8090` |
| `LOCAL_HAPI_POSTGRES_PORT` | Puerto de la DB dedicada HAPI | `54330` |
| `READINESS_TIMEOUT_SECONDS` | Timeout del setup DB operacional | `180` |
| `HAPI_START_TIMEOUT_SECONDS` | Timeout de arranque HAPI | `180` |
| `CONSULTAMED_ETL_API_KEY` | Clave compartida entre sidecar y ETL | `consultamed-local-etl` |

### 10.4 Preparar el backend para que la ETL funcione

Desde la raíz del repo:

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Después, asegúrate de que `backend/.env` usa el perfil local si quieres operar todo en local:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed
```

Si prefieres partir de la plantilla mínima, también existen:

- `backend/.env.local.example`
- `backend/.env.supabase.example`

## 11. Arranque paso a paso del baseline

### Paso 1. Vuelve a la raíz del repo

```bash
cd /ruta/a/ehr-local
```

Todos los scripts `./scripts/...` están pensados para ejecutarse desde la raíz.

### Paso 2. Prepara la base operacional de ConsultaMed

```bash
./scripts/setup-local-db.sh
```

Este script:

- levanta `consultamed-db`;
- espera a que PostgreSQL esté lista;
- aplica `supabase/migrations/*.sql` de forma idempotente;
- deja la base operacional preparada para que backend y ETL lean de ella.

### Paso 3. Arranca el sidecar HAPI

```bash
./scripts/start-hapi-sidecar.sh
```

Qué hace este script:

- construye la imagen del sidecar;
- levanta `consultamed-hapi-sidecar` y `consultamed-hapi-db`;
- espera a que respondan:
  - `http://localhost:8090/actuator/health`
  - `http://localhost:8090/fhir/metadata`
- y no da el arranque por bueno hasta que el contenedor queda `healthy`, usando `HealthCheck.java` contra `http://127.0.0.1:8080/actuator/health/readiness`.

### Paso 4. Carga el subset clínico inicial

```bash
./scripts/load-hapi-clinical-subset.sh
```

Qué hace realmente:

1. garantiza la DB operacional local;
2. garantiza que HAPI esté arriba;
3. usa `backend/.venv/bin/python` si está disponible;
4. ejecuta `backend/scripts/load_hapi_clinical_subset.py`;
5. lee el snapshot desde ConsultaMed;
6. reconcilia y elimina recursos stale del subset aprobado en orden inverso de dependencias;
7. hace PUT upserts al sidecar en orden determinista;
8. compara conteos origen/destino y verifica referencias de muestra.

### Paso 5. Si necesitas una recarga completamente limpia

```bash
./scripts/load-hapi-clinical-subset.sh --reset
```

`--reset` baja el compose del sidecar con volúmenes (`down -v`) antes de volver a cargar. Úsalo solo cuando quieras borrar la persistencia FHIR local y reconstruirla desde cero; ya no es necesario para eliminar recursos stale del subset aprobado en recargas normales.

## 12. Cómo verificar que realmente funciona

### 12.1 Verificación mínima de salud y metadata

```bash
curl -fsS http://localhost:8090/actuator/health
curl -fsS http://localhost:8090/actuator/health/readiness
curl -fsS http://localhost:8090/fhir/metadata
docker inspect --format '{{.State.Health.Status}}' consultamed-hapi-sidecar
```

Debes obtener:

- un health OK del sidecar;
- una readiness `UP` del runtime real;
- un `CapabilityStatement` coherente con el subset aprobado.
- el contenedor en estado `healthy`.

### 12.2 Verificación por conteos

```bash
for resource in Patient Practitioner Encounter Condition MedicationRequest AllergyIntolerance; do
  curl -fsS "http://localhost:8090/fhir/${resource}?_summary=count"
  echo
done
```

Cada respuesta debe incluir `"resourceType":"Bundle"` y un `total` consistente con la salida de la ETL.

### 12.3 Verificación de lectura individual (`read`)

Al final de la ETL se imprimen IDs de muestra. Usa uno de ellos para comprobar lectura individual:

```bash
curl -fsS http://localhost:8090/fhir/Patient/<patient-id>
curl -fsS http://localhost:8090/fhir/Encounter/<encounter-id>
```

Consejo práctico: empieza por el `Encounter` de muestra, porque te permite verificar referencias a paciente y profesional.

### 12.4 Verificación de búsqueda (`search`) y `Bundle`

```bash
curl -fsS 'http://localhost:8090/fhir/Patient?_count=1'
curl -fsS 'http://localhost:8090/fhir/Encounter?_count=1'
curl -fsS 'http://localhost:8090/fhir/Condition?_count=1'
```

Esperas un `Bundle` con entradas coherentes para ese recurso.

### 12.5 Verificación automatizada del repo

Si quieres evidencia automatizada relacionada con esta baseline:

```bash
cd backend
.venv/bin/pytest tests/unit/test_hapi_public_surface.py tests/unit/test_hapi_sidecar_bootstrap.py tests/unit/test_fhir_base_mapping.py tests/unit/test_hapi_clinical_etl.py -v --tb=short
.venv/bin/pytest tests/unit/test_architecture_dead_code_guards.py -v --tb=short
```

El gate recomendado del repo sigue siendo:

```bash
./scripts/test_gate.sh
```

Pero recuerda: un rojo global por deuda heredada de `mypy` **no significa** que falte la baseline HAPI.

## 13. Operación cotidiana: parar, reiniciar y resetear

### 13.1 Parar el sidecar

```bash
./scripts/stop-hapi-sidecar.sh
```

Esto detiene el sidecar sin tocar la base operacional del producto.

### 13.2 Reiniciarlo

```bash
./scripts/start-hapi-sidecar.sh
```

Si la persistencia HAPI ya existía, el sidecar reutiliza su estado.

### 13.3 Resetear solo la persistencia HAPI

```bash
docker compose -f sidecars/hapi-fhir/docker-compose.yml down -v --remove-orphans
./scripts/start-hapi-sidecar.sh
./scripts/load-hapi-clinical-subset.sh
```

Usa esto solo cuando quieras borrar por completo el repositorio FHIR local. **No** afecta la base operacional de ConsultaMed.

## 14. Troubleshooting común

| Problema | Señal típica | Qué hacer |
|---|---|---|
| Docker no está disponible | mensaje `Docker is not installed` o `Docker daemon is not running` | arranca Docker Desktop/Engine y repite |
| Confusión de puertos | consultas al puerto equivocado | recuerda: FastAPI DB `54329`, HAPI DB `54330`, HAPI HTTP `8090` |
| ETL no encuentra Python válido | error sobre FastAPI/SQLAlchemy/greenlet | crea `backend/.venv` e instala `requirements.txt` |
| Cambiaste `CONSULTAMED_ETL_API_KEY` solo en un lado | la ETL no puede escribir | exporta el mismo valor antes de arrancar sidecar y ETL |
| Timeout al arrancar HAPI | `Timed out waiting for HAPI health endpoint` | revisa logs Docker y aumenta `HAPI_START_TIMEOUT_SECONDS` si hace falta |
| Metadata no refleja el subset esperado | `CapabilityStatement` demasiado amplio, raro o con claims de versionado/escritura | verifica que el sidecar se está construyendo con el overlay actual y no con una imagen antigua |
| Intentas usar HAPI como API principal | faltan endpoints o escrituras | recuerda que HAPI es baseline local de lectura/búsqueda, no backend principal |
| Usas la DB equivocada para HAPI | datos inconsistentes o mezcla de responsabilidades | nunca reutilices `consultamed-db` para el sidecar |

### 14.1 Qué logs mirar primero

Si el arranque falla, lo primero útil suele ser:

```bash
docker compose -f sidecars/hapi-fhir/docker-compose.yml logs --tail 50 hapi-postgres hapi-sidecar
```

Si falla la base operacional local:

```bash
docker logs --tail 40 consultamed-db
```

## 15. Riesgo residual y por qué `#24` es deuda técnica

La baseline HAPI funcional quedó materializada por las waves históricas que cubrieron bootstrap, PostgreSQL dedicada, mapping base, ETL, superficie FHIR mínima y línea base de seguridad/auditoría.

La issue `#24` **no** significa “falta terminar HAPI”. Significa otra cosa:

- sigue habiendo deuda residual de `mypy` y quality gate;
- esa deuda toca puntos heredados de mapping/ETL;
- su objetivo es limpiar tipado y mejorar el gate sin reabrir el diseño funcional.

### 15.1 Lo que `#24` sí representa

- cleanup técnico;
- seguimiento de deuda heredada;
- mejora del gate local/CI donde todavía hay rojo atribuible a tipado.

### 15.2 Lo que `#24` no representa

- no representa funcionalidades FHIR faltantes del baseline;
- no representa ausencia de PostgreSQL dedicada;
- no representa falta de `CapabilityStatement`, `read`, `search` o `Bundle`;
- no representa que FastAPI haya dejado de ser la source of truth.

### 15.3 Cómo interpretar correctamente el estado actual

La lectura correcta es:

- **baseline HAPI local: implementada**;
- **riesgo residual de gate/tipado: abierto**.

Ambas cosas pueden coexistir al mismo tiempo sin contradicción.

## 16. Mapa rápido de fuentes para profundizar

### Fuentes canónicas activas

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `docs/architecture/overview.md`

### Fuentes históricas de decisión

- `docs/specs/002-hapi-fhir-r5-migration/spec.md`
- `docs/specs/002-hapi-fhir-r5-migration/plan.md`
- `docs/specs/002-hapi-fhir-r5-migration/decision-matrix.md`
- `docs/specs/002-hapi-fhir-r5-migration/critical-axes.md`

### Fuentes operativas reales

- `scripts/start-hapi-sidecar.sh`
- `scripts/stop-hapi-sidecar.sh`
- `scripts/load-hapi-clinical-subset.sh`
- `scripts/setup-local-db.sh`
- `sidecars/hapi-fhir/docker-compose.yml`
- `sidecars/hapi-fhir/consultamed.application.yaml`
- `backend/app/fhir/etl.py`

## 17. Idea final que conviene recordar

Si solo quieres quedarte con una frase, que sea esta:

> En ConsultaMed, **FastAPI sigue mandando** y HAPI actúa como **sidecar local interoperable**: útil, verificable, aislado y deliberadamente limitado para no poner en riesgo la app principal.