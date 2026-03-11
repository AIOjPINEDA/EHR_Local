# Baseline HAPI FHIR R5: referencia histórica

**Feature Branch**: `002-hapi-fhir-r5-migration`
**Created**: 2026-03-11
**Status**: Historical reference for implemented baseline
**Last Updated**: 2026-03-11

## Propósito

Este bundle conserva las decisiones y el alcance del baseline HAPI FHIR R5 ya implementado en el repositorio.

No es un plan activo, no es un backlog operativo y no sustituye ni a `AGENTS.md`, ni a `docs/architecture/overview.md`, ni al estado vivo de GitHub Issues.

## Cómo leer este bundle

- `AGENTS.md` define el contrato operativo del repositorio.
- `docs/architecture/overview.md` describe la arquitectura implementada actual.
- GitHub Issues mantienen el estado canónico de ejecución y priorización.
- Este bundle retiene contexto histórico y decisiones cerradas para entender por qué la baseline HAPI quedó como quedó.

## Baseline implementada

La baseline materializada en el repo queda así:

1. HAPI FHIR R5 corre como sidecar local separado.
2. FastAPI sigue siendo la source of truth operacional para escrituras, auth y lógica clínica.
3. HAPI usa PostgreSQL dedicada y no comparte la DB operacional del producto.
4. La superficie publicada queda limitada a `CapabilityStatement`, `read`, `search` y respuestas `Bundle` de búsqueda para el subset aprobado.
5. La carga de datos hacia HAPI se realiza por una vía ETL interna, repetible e idempotente.
6. La baseline incluye controles mínimos de acceso, validación estructural relevante, auditoría sanitizada y logging sin PHI innecesaria.

## Decisiones adoptadas retenidas

### D-001 Topology

HAPI se adopta como sidecar progresivo. No sustituye al backend principal del producto.

### D-002 Arranque base

La base de arranque adoptada es el starter oficial `hapi-fhir-jpaserver-starter`.

### D-003 Entorno técnico

La baseline técnica retenida es:

- JDK 17+
- HAPI FHIR soportado por la documentación vigente en la fecha de la decisión
- PostgreSQL con `HapiFhirPostgresDialect`
- configuración declarativa versionada

### D-004 Source of truth

FastAPI + PostgreSQL operacional siguen siendo la fuente de verdad para escrituras y lógica clínica.

### D-005 Frontera de base de datos

HAPI vive sobre PostgreSQL separada. La DB física del sidecar no se comparte con la operativa del producto.

### D-006 Alcance de interacciones

La superficie publicada de baseline queda limitada a:

- `CapabilityStatement`
- `read`
- `search`
- `Bundle` de búsqueda

Quedan fuera de la baseline:

- escrituras clínicas externas
- transacciones FHIR de negocio
- capacidades avanzadas como subscriptions, MDM, HFQL, LastN, CDS Hooks, Clinical Reasoning o SMART on FHIR

### D-007 Alcance de recursos

Subset inicial retenido:

- `Patient`
- `Practitioner`
- `Encounter`
- `Condition`
- `MedicationRequest`
- `AllergyIntolerance`

Los templates clínicos siguen fuera de la superficie FHIR de baseline.

### D-008 Estrategia de datos

La baseline usa ETL one-way, repetible e idempotente. No introduce dual-write ni sincronización bidireccional.

## Alcance materializado

### Incluido en la baseline

- sidecar HAPI operable sobre starter oficial
- PostgreSQL dedicada para HAPI
- mapping base del subset clínico aprobado
- ETL controlada y repetible
- superficie FHIR acotada de lectura/búsqueda
- línea base mínima de seguridad, auditoría, validación y operación

### Fuera de la baseline actual

- mover escrituras clínicas a HAPI
- reemplazar FastAPI como backend principal
- compartir la base transaccional entre producto y HAPI
- resolver EHDS final o perfiles nacionales avanzados como condición de esta baseline
- introducir componentes avanzados de HAPI fuera del alcance mínimo aprobado

## Resumen de mapeo retenido

### Patient

- `identifier_value` + `identifier_system` -> `Patient.identifier`
- `name_given` + `name_family` -> `Patient.name`
- `birth_date` -> `Patient.birthDate`
- `gender` -> `Patient.gender`

### Practitioner

- `identifier_value` + `identifier_system` -> `Practitioner.identifier`
- `qualification_code` -> `Practitioner.qualification`
- `telecom_email` -> `Practitioner.telecom`

### Encounter

- `period_start` / `period_end` -> `Encounter.period`
- `status` -> `Encounter.status`
- `subject_id` -> `Encounter.subject`
- `participant_id` -> `Encounter.participant`
- SOAP estructurado -> extensión interna documentada para la baseline

### Condition

- `subject_id` -> `Condition.subject`
- `encounter_id` -> `Condition.encounter`
- `code_text` / `code_coding_*` -> `Condition.code`

### MedicationRequest

- `subject_id` -> `MedicationRequest.subject`
- `encounter_id` -> `MedicationRequest.encounter`
- `requester_id` -> `MedicationRequest.requester`
- `medication_*` -> `MedicationRequest.medication[x]`

### AllergyIntolerance

- `patient_id` -> `AllergyIntolerance.patient`
- `clinical_status` -> `AllergyIntolerance.clinicalStatus`

## Riesgos y notas residuales

- El modelo final corporativo de auth/exposición FHIR sigue fuera de esta baseline local.
- EHDS, perfiles nacionales y hardening avanzado permanecen fuera del alcance de este bundle histórico.
- El gate global del repo puede seguir en rojo por deuda heredada de `mypy`; esa situación debe documentarse como riesgo residual, no como trabajo resuelto por documentación.
- Si las issues derivadas de este bundle siguen abiertas o desalineadas administrativamente, esa corrección pertenece a GitHub Issues, no a este archivo.

## Referencias

- documentación oficial actual de HAPI FHIR visible al 2026-03-11
- `hapi-fhir-jpaserver-starter` como base adoptada
- repo legado `aio-fhir` como referencia de patrones útiles y anti-patrones
- estado implementado de ConsultaMed en este repositorio