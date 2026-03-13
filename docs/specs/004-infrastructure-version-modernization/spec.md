# Modernizacion de infraestructura y versionado: contexto de traspaso

**Feature Branch**: `004-infrastructure-version-modernization`
**Created**: 2026-03-13
**Status**: Context reference; reprioritized after local-first simplification
**Last Updated**: 2026-03-13

## Proposito

Este bundle consolida el inventario de versiones verificadas en el repositorio, el analisis de brecha frente a versiones estables disponibles en marzo de 2026 y una recomendacion de priorizacion para modernizar la infraestructura tecnica de ConsultaMed.

No es un backlog operativo ni sustituye a GitHub Issues. Su objetivo es dejar el contexto listo para que otro agente o desarrollador pueda retomar la modernizacion sin rehacer el analisis inicial.

Actualización 2026-03-13:

- tras la decisión de priorizar simplificación `local-first`, toda modernización asociada específicamente a Supabase queda despriorizada o fuera de alcance hasta nueva decisión;
- este bundle se mantiene como contexto de versionado general y para upgrades del runtime local real;
- la ejecución operativa debe leer antes `docs/specs/005-local-runtime-simplification/spec.md`.

## Como leer este bundle

- `AGENTS.md` sigue siendo el contrato operativo del repositorio.
- `docs/architecture/overview.md` sigue siendo la fuente de verdad de la arquitectura implementada.
- GitHub Issues siguen siendo el backlog canonico de ejecucion.
- Este documento solo conserva contexto de modernizacion: inventario, riesgos, oportunidades y recomendaciones.

## Alcance

### Incluido

- runtimes y toolchain principal de backend, frontend y sidecar
- dependencias core del stack activo
- versiones de CI y contenedores locales verificables en repo
- comparativa con versiones estables mas recientes visibles a marzo de 2026
- analisis de valor para un MVP en endurecimiento preproduccion
- propuesta de fases para ejecutar la modernizacion sin mezclarla con trabajo clinico o funcional

### Fuera de alcance

- ejecucion de upgrades en este bundle
- backlog de issues o asignacion de responsables
- cambios de arquitectura de producto no exigidos por versionado
- rediseño funcional del frontend o del dominio clinico

## Estado implementado verificado en repositorio

La siguiente tabla resume las versiones verificadas directamente en el repositorio al 2026-03-13.

| Area | Componente | Version / estado verificado | Fuente verificada |
|---|---|---|---|
| Backend runtime | Python | `3.11` en CI; `>=3.11` en proyecto | `.github/workflows/ci.yml`, `backend/pyproject.toml` |
| Backend framework | FastAPI | `0.109.2` | `backend/requirements.txt` |
| Backend server | Uvicorn | `0.27.1` | `backend/requirements.txt` |
| Backend data | SQLAlchemy | `2.0.25` | `backend/requirements.txt` |
| Backend driver | asyncpg | `0.30.0` | `backend/requirements.txt` |
| Backend schemas | Pydantic | `2.6.1` | `backend/requirements.txt` |
| Backend auth | python-jose | `3.3.0` | `backend/requirements.txt` |
| Backend auth | passlib+bcrypt | `1.7.4` + bcrypt runtime usage | `backend/requirements.txt`, `backend/app/api/auth.py` |
| Backend quality | pytest | `8.0.0` | `backend/requirements.txt` |
| Backend quality | ruff | `0.15.1` | `backend/requirements.txt` |
| Backend quality | black | `24.1.1` | `backend/requirements.txt` |
| Backend quality | isort | `5.13.2` | `backend/requirements.txt` |
| Backend quality | mypy | `1.8.0` | `backend/requirements.txt` |
| Frontend runtime | Node.js | `20` en CI | `.github/workflows/ci.yml` |
| Frontend framework | Next.js | `^14.2.35` | `frontend/package.json` |
| Frontend UI runtime | React | `^18.2.0` | `frontend/package.json` |
| Frontend language | TypeScript | `^5.3.3` | `frontend/package.json` |
| Frontend styling | Tailwind CSS | `^3.4.1` | `frontend/package.json` |
| Frontend lint | ESLint | `^8.56.0` | `frontend/package.json` |
| Frontend data | TanStack Query | `^5.17.19` | `frontend/package.json` |
| Local DB | PostgreSQL | `postgres:17.7` | `docker-compose.yml` |
| Sidecar DB | PostgreSQL | `postgres:17.7` | `sidecars/hapi-fhir/docker-compose.yml` |
| HAPI overlay build | Maven | `3.9.9` | `sidecars/hapi-fhir/Dockerfile` |
| HAPI overlay build | Java | `21` | `sidecars/hapi-fhir/Dockerfile`, `sidecars/hapi-fhir/overlay/pom.xml` |
| HAPI runtime | HAPI starter image | `hapiproject/hapi:v8.8.0-1` | `sidecars/hapi-fhir/Dockerfile` |
| HAPI libs | HAPI FHIR | `8.8.0` | `sidecars/hapi-fhir/overlay/pom.xml` |
| Supabase local dev | PostgreSQL major | `17` | `supabase/config.toml` |

## Observaciones de consistencia documental

Durante la preparacion de este bundle se detecto una discrepancia documental y se corrigio el mismo 2026-03-13 para evitar arrastrarla a futuras tareas:

1. `supabase/config.toml` declara `major_version = 17` para desarrollo local.
2. `docs/architecture/overview.md` mostraba `PostgreSQL 15 (Supabase Cloud)` en el diagrama de runtime.
3. Otros documentos recientes ya hablan de PostgreSQL 17 local y de Supabase cloud sin fijar la major exacta.

Correccion aplicada:

- el diagrama de runtime en `docs/architecture/overview.md` ahora usa `Supabase Postgres (Cloud)` sin fijar una major no verificada.

Conclusión: antes de planificar upgrades de PostgreSQL o compatibilidad cloud, hay que verificar la version real del target Supabase remoto y solo entonces fijar la major exacta en documentacion implementada.

## Resumen del escaneo externo de versiones disponibles

El siguiente resumen refleja la fotografia externa levantada en marzo de 2026 para versiones estables o lineas activas relevantes.

| Componente | Version actual en repo | Referencia externa considerada | Lectura para este repo |
|---|---|---|---|
| Python | `3.11` | `3.14.x` estable; `3.13.x` estable madura | Hay margen de upgrade, pero no es urgente para carga MVP |
| Node.js | `20` | `24 LTS` actual; `22 LTS` aun valida | Hay urgencia moderada porque Node 20 sale de active support en abril 2026 |
| FastAPI | `0.109.2` | `0.135.x` | Upgrade razonable, pero incremental |
| Pydantic | `2.6.1` | `2.12.x` | Upgrade de bajo riesgo probable |
| SQLAlchemy | `2.0.25` | `2.0.x` estable; `2.1.x` beta | Mantenerse en 2.0 estable |
| Uvicorn | `0.27.1` | `0.34.x` aprox. | Upgrade no urgente |
| Next.js | `14.2.35` | `16.1` | Gran salto con breaking changes |
| React | `18.2.0` | `19.2` | Upgrade ligado a Next 15/16 |
| Tailwind CSS | `3.4.1` | `4.x` | Cambio grande sin valor inmediato para MVP |
| PostgreSQL | `17.7` local | `18.3` | Mejora interesante, pero no necesaria para escala actual |
| HAPI FHIR | `8.8.0` / `v8.8.0-1` | lineas 8.x posteriores visibles | El repo ya esta en una linea moderna y reciente |

## Analisis de versionado por componente

### 1. Runtimes

#### Python

- Estado actual: `3.11`.
- Brecha: dos lineas estables por detras de `3.13` y tres de `3.14`.
- Valor potencial:
  - mejoras de rendimiento del interprete
  - mejor soporte de tipado y ecosistema reciente
  - alinear dependencia moderna de Pydantic/FastAPI
- Riesgo:
  - puede amplificar deuda heredada de `mypy`
  - requiere validar compatibilidad de WeasyPrint, asyncpg y toolchain local
- Recomendacion: mover a `3.13` como siguiente objetivo realista; no saltar a `3.14` como primera fase salvo que el entorno y dependencias queden ya certificados.

#### Node.js

- Estado actual: `20` en CI.
- Contexto: Node 20 llega al final de active support en abril de 2026.
- Valor potencial:
  - mejor soporte LTS y horizonte de mantenimiento mas largo
  - npm mas reciente
  - mejoras de runtime y DX
- Riesgo:
  - bajo si el salto es `20 -> 22`
  - algo mayor si se intenta `20 -> 24` junto con upgrades mayores de Next.js
- Recomendacion: primero `Node 22 LTS`, y revaluar `24 LTS` cuando se decida si el frontend salta a Next 15/16.

### 2. Backend framework y librerias core

#### FastAPI, Pydantic y Uvicorn

- Estado actual: stack funcional pero rezagado frente a releases de 2026.
- Valor potencial del upgrade conjunto:
  - mejoras acumuladas de compatibilidad y rendimiento
  - mejor alineacion con ecosistema reciente de Python
  - menor deuda futura de versionado
- Riesgo:
  - bajo a medio, siempre que se haga con regresion de tests y sin mezclar cambios funcionales
- Recomendacion: upgrade conjunto en una fase backend separada, despues de resolver el riesgo de auth.

#### SQLAlchemy y asyncpg

- Estado actual: SQLAlchemy 2.0 estable moderna; asyncpg funcional.
- Hallazgo:
  - no hay motivo para saltar a SQLAlchemy `2.1` mientras siga en beta.
  - asyncpg tiene margen de modernizacion, pero no es el cuello de botella del MVP.
- Recomendacion: mantener SQLAlchemy en linea `2.0.x` y actualizar solo dentro de la rama estable.

### 3. Frontend stack

#### Next.js y React

- Estado actual: `Next 14` + `React 18`.
- Valor potencial de modernizar a `Next 16`:
  - Turbopack estable
  - React 19.x
  - mejoras de caching y DX
- Riesgo:
  - alto para un MVP en hardening
  - puede introducir breaking changes en routing, caching y patrones de app router
- Recomendacion: no priorizar este salto antes de cerrar seguridad, auth y estabilidad del backend.

#### Tailwind y ESLint

- `Tailwind 4` implica cambio mayor de configuracion; no aporta valor proporcional al momento actual.
- `ESLint 9` aporta modernizacion de tooling, pero obliga a migrar configuracion.
- Recomendacion: posponer ambos hasta despues del go-live MVP o cuando exista una iniciativa propia de frontend platform.

### 4. Infraestructura de datos y sidecar

#### PostgreSQL

- Estado actual: `17.7` local y sidecar; Supabase local declarado sobre major `17`.
- Valor potencial de `18.x`:
  - mejoras relevantes de rendimiento e I/O
  - nuevas capacidades SQL y operativas
- Riesgo:
  - bajo a medio tecnicamente, pero innecesario para la carga prevista del MVP
  - no debe iniciarse sin aclarar la version real del entorno Supabase remoto
- Recomendacion: mantener `17` durante la fase MVP. Reabrir despues de confirmar necesidad operativa o alinear con hosting cloud real.

#### HAPI FHIR / Java / Maven

- Estado actual: sidecar actualizado recientemente a Java 21, Maven 3.9.9 y HAPI 8.8.x.
- Hallazgo: esta parte ya esta en una linea moderna razonable.
- Recomendacion: no abrir una nueva modernizacion aqui salvo que aparezca CVE, incompatibilidad o necesidad funcional concreta.

## Hallazgo critico de seguridad

### `python-jose` requiere sustitucion prioritaria

Estado actual:

- Dependencia instalada: `python-jose[cryptography]==3.3.0`.
- Uso funcional actual: exclusivamente en `backend/app/api/auth.py` para emitir y validar JWT.

Funciones afectadas en runtime:

1. `create_access_token()` firma el JWT.
2. `get_current_practitioner()` decodifica y valida el JWT.
3. `POST /api/v1/auth/login` emite el token.
4. `GET /api/v1/auth/me` y todos los endpoints protegidos que dependen de `get_current_practitioner` validan el token.

Impacto:

- La libreria arrastra vulnerabilidades publicas reportadas para la linea `3.3.0`.
- El riesgo aplica directamente al flujo de autenticacion de una aplicacion sanitaria.

Recomendacion:

- Prioridad mas alta de toda la modernizacion.
- Sustituir por `PyJWT` o `joserfc` en una tarea pequena y aislada.
- No mezclar esta sustitucion con upgrades mayores de framework.

## Matriz de priorizacion para ejecucion futura

| Prioridad | Iniciativa | Valor | Riesgo | Recomendacion |
|---|---|---|---|---|
| P0 | Reemplazar `python-jose` | Seguridad directa | Bajo | Ejecutar primero |
| P1 | Node `20 -> 22 LTS` | Soporte y mantenimiento | Bajo | Ejecutar en corto plazo |
| P1 | Actualizar FastAPI/Pydantic/Uvicorn en linea estable | Reducir deuda tecnica | Bajo-Medio | Ejecutar despues de auth |
| P1 | Revisar y posiblemente subir mypy | Mejor tooling y posible ayuda con deuda actual | Medio | Ejecutar junto al refresh backend |
| P2 | Python `3.11 -> 3.13` | Alinear runtime | Medio | Ejecutar con ventana controlada |
| P3 | PostgreSQL `17 -> 18` | Rendimiento futuro | Medio | Posponer hasta validar necesidad |
| P3 | Next `14 -> 16` y React `18 -> 19` | DX y stack moderno | Alto | No priorizar en hardening MVP |
| P3 | Tailwind `3 -> 4` y ESLint `8 -> 9` | Limpieza de plataforma | Medio-Alto | Posponer |

## Propuesta de fases

### Fase 0: seguridad de autenticacion

- sustituir `python-jose`
- mantener contrato de token actual (`sub`, `exp`, algoritmo configurado)
- verificar login, `/auth/me` y endpoints protegidos existentes

### Fase 1: runtime y toolchain de bajo riesgo

- actualizar Node a `22 LTS` en CI y documentacion
- revisar si Ruff puede absorber formatter/import sorting para simplificar toolchain Python
- mantener el comportamiento del gate sin introducir refactors funcionales

### Fase 2: refresh backend estable

- subir FastAPI, Pydantic, Uvicorn y parches estables asociados
- reevaluar Python `3.13`
- actualizar mypy si ayuda a reducir deuda o compatibilidad con versiones nuevas

### Fase 3: reevaluacion post-MVP

- decidir si hay ROI suficiente para saltar a Next 15/16
- decidir si PostgreSQL 18 aporta valor real al entorno cloud/local operativo
- limpiar discrepancias documentales pendientes sobre version real de Supabase

## Criterios de aceptacion sugeridos para una futura issue de ejecucion

1. La modernizacion seleccionada no degrada login ni autorizacion existente.
2. `./scripts/test_gate.sh` se ejecuta y su resultado se reporta con precision, incluyendo cualquier rojo heredado de `mypy`.
3. Los endpoints protegidos siguen funcionando con Bearer token.
4. La documentacion implementada se actualiza cuando cambie una version real del runtime o CI.
5. Las decisiones de upgrade no introducen un segundo backlog fuera de GitHub Issues.

## Preguntas abiertas para el futuro ejecutor

1. ¿La instancia remota real de Supabase ya esta en PostgreSQL 17 o sigue en otra major?
2. ¿Se prefiere `PyJWT` o `joserfc` como reemplazo de `python-jose`?
3. ¿El equipo quiere estabilizarse en Node 22 o aprovechar la ventana para ir a Node 24?
4. ¿Existe deseo real de salto a Next 16 antes del despliegue productivo o eso debe posponerse?

## Referencias verificadas en repo

- `backend/requirements.txt`
- `backend/pyproject.toml`
- `backend/app/api/auth.py`
- `frontend/package.json`
- `.github/workflows/ci.yml`
- `docker-compose.yml`
- `sidecars/hapi-fhir/Dockerfile`
- `sidecars/hapi-fhir/docker-compose.yml`
- `sidecars/hapi-fhir/overlay/pom.xml`
- `supabase/config.toml`
- `docs/architecture/overview.md`

## Nota final de traspaso

La lectura principal de este analisis es simple:

1. el stack actual es suficientemente moderno para un MVP en hardening;
2. el mayor riesgo inmediato no es "estar viejo", sino mantener `python-jose` en auth;
3. los upgrades con mejor ROI en el corto plazo son seguridad de JWT, Node 22 LTS y refresh backend estable;
4. los saltos grandes de frontend y PostgreSQL deben esperar a una ventana posterior o a una necesidad operativa clara.