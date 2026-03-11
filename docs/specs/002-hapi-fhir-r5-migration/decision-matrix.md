# Matriz Comparativa De Decisiones: Estado Actual, Legado Y Decision Adoptada

## Proposito

Resumir, por eje, de donde se parte, que muestra el legado y que decision queda adoptada.

La unica columna normativa de este documento es la decision adoptada.

## Resumen De Decisiones

| Eje | ConsultaMed actual | Legado aio-fhir | Decision adoptada |
|---|---|---|---|
| Topologia | Monolito funcional FE + FastAPI | Stack separada con FHIR + OMOP + ETL | Servicio sidecar HAPI separado de FastAPI |
| Arranque base | No aplica | Docker con imagen generica `hapiproject/hapi:latest` | Starter oficial `hapi-fhir-jpaserver-starter` |
| Version FHIR | Naming FHIR-inspired, no API FHIR real | R4 | R5 como linea base |
| Base Java | No aplica | Antigua, no fijada con claridad moderna | JDK 17+ |
| Base de datos FHIR | No existe | PostgreSQL dedicada FHIR | PostgreSQL dedicada para HAPI |
| Estrategia de version PostgreSQL | 17 local, 15 Supabase | 14 por incidencias conocidas | Version estable moderna, sin heredar PG14 por defecto |
| Estrategia de dialecto | No aplica | Warning de dialecto no HAPI documentado | `HapiFhirPostgresDialect` obligatorio |
| Ownership de datos | FastAPI + DB actual | FHIR como landing + ETL OMOP | FastAPI sigue siendo fuente de verdad |
| Modo de sincronizacion | No aplica | Bulk load y ETL | ETL one-way, idempotente |
| Estrategia de escritura | Escritura en FastAPI | Bulk import flexible | Sin dual-write en la linea base |
| Validacion | Validacion propia backend | Desactivada en puntos de bulk load | Validacion de linea base activada |
| Integridad referencial | DB propia actual | Desactivada para bulk import | Integridad activa en la linea base |
| Seguridad | JWT FastAPI | No era el foco principal | Linea base con AuthorizationInterceptor |
| Auditoria | App logging y constraints del repo | No foco central | Auditoria de linea base documentada |
| Health checks | `/health` FastAPI simple | `/fhir/metadata` en healthcheck | `/fhir/metadata` + health checks operativos |
| Migraciones | SQL y migraciones propias | Compose y setup ad hoc | Ciclo de migraciones HAPI como restriccion de plataforma |
| Terminologia | No FHIR terminology server | No era una linea base limpia | Linea base minima, avanzada diferida |

## Decisiones Cerradas Para La Ejecucion

1. HAPI ira como servicio sidecar separado.
2. Se parte del starter oficial, no del compose legado.
3. Se usa PostgreSQL dedicada para HAPI.
4. FastAPI sigue siendo fuente de verdad.
5. El flujo de datos inicial es ETL one-way e idempotente.
6. No hay dual-write ni switch de ownership clinico en la primera iteracion.
7. Validacion, integridad, auditoria y autorizacion nacen en la linea base.

## Decisiones Diferidas

1. sincronizacion futura incremental, CDC o event-driven
2. posible fuente de verdad parcial en HAPI para algunos recursos
3. terminology server avanzado o paquetes IG completos
4. despliegue final e infraestructura compartida
5. requisitos multi-tenant o segregacion por organizacion