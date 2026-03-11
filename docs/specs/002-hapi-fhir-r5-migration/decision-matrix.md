# Comparative Decision Matrix: Current State, Legacy Baseline And Adopted Decision

## Purpose

Resumir, por eje, de donde se parte, que muestra el legado y que decision queda adoptada.

La unica columna normativa de este documento es la decision adoptada.

## Decision Summary

| Axis | ConsultaMed actual | Legado aio-fhir | Decision adoptada |
|---|---|---|---|
| Topology | Monolito funcional FE + FastAPI | Stack separada con FHIR + OMOP + ETL | Sidecar HAPI separado de FastAPI |
| Bootstrap | No aplica | Docker con imagen generica `hapiproject/hapi:latest` | Starter oficial `hapi-fhir-jpaserver-starter` |
| FHIR version | Naming FHIR-inspired, no API FHIR real | R4 | R5 baseline |
| Java baseline | No aplica | Antigua, no fijada con claridad moderna | JDK 17+ |
| Database for FHIR | No existe | PostgreSQL dedicada FHIR | PostgreSQL dedicada para HAPI |
| PostgreSQL version strategy | 17 local, 15 Supabase | 14 por incidencias conocidas | Version estable moderna, sin heredar PG14 por defecto |
| Dialect strategy | No aplica | Warning de dialecto no HAPI documentado | `HapiFhirPostgresDialect` obligatorio |
| Data ownership | FastAPI + DB actual | FHIR como landing + ETL OMOP | FastAPI sigue siendo source of truth |
| Sync mode | No aplica | Bulk load y ETL | ETL one-way, idempotente |
| Write strategy | Escritura en FastAPI | Bulk import flexible | Sin dual-write en baseline |
| Validation | Validacion propia backend | Desactivada en puntos de bulk load | Validacion baseline activada |
| Referential integrity | DB propia actual | Desactivada para bulk import | Integridad activa en baseline |
| Security | JWT FastAPI | No era el foco principal | Baseline con AuthorizationInterceptor |
| Audit | App logging y constraints del repo | No foco central | Auditoria baseline documentada |
| Health checks | `/health` FastAPI simple | `/fhir/metadata` en healthcheck | `/fhir/metadata` + health checks operativos |
| Migrations | SQL y migraciones propias | Compose y setup ad hoc | Lifecycle de migraciones HAPI como constraint de plataforma |
| Terminology | No FHIR terminology server | No era baseline limpia | Baseline minima, avanzada diferida |

## Closed Decisions For Execution

1. HAPI ira como sidecar separado.
2. Se parte del starter oficial, no del compose legado.
3. Se usa PostgreSQL dedicada para HAPI.
4. FastAPI sigue siendo source of truth.
5. El flujo de datos inicial es ETL one-way e idempotente.
6. No hay dual-write ni switch de ownership clinico en la primera iteracion.
7. Validacion, integridad, auditoria y autorizacion nacen en baseline.

## Deferred Decisions

1. sincronizacion futura incremental, CDC o event-driven
2. posible source of truth parcial en HAPI para algunos recursos
3. terminology server avanzado o paquetes IG completos
4. despliegue final e infraestructura compartida
5. requisitos multi-tenant o segregacion por organizacion