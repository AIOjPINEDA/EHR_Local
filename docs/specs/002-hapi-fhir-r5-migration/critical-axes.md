# Critical Axes: HAPI FHIR Baseline For ConsultaMed

## Purpose

Dejar explicitados los ejes que pueden romper la coherencia de la iniciativa si no se respetan durante la futura implementacion.

## 1. Topology And Operational Isolation

**Decision**

- FastAPI mantiene la logica operativa del producto
- HAPI se introduce como capacidad interoperable separada
- el fallo de HAPI no debe bloquear la operacion diaria del MVP

**Implementation consequence**

HAPI debe tener despliegue, configuracion, health checks y troubleshooting propios.

## 2. Database Boundary And Ownership

**Decision**

- la DB actual soporta el producto
- la DB HAPI soporta el repositorio FHIR
- no se mezclan modelos internos

**Implementation consequence**

Se acepta duplicacion controlada de datos a corto plazo a cambio de claridad y rollback simple.

## 3. Data Transfer Strategy

**Decision**

- ETL one-way
- cargas repetibles
- comportamiento idempotente
- capacidad de reset y recarga

**Implementation consequence**

Hay que cerrar orden de carga, claves estables y reconciliacion basica antes del loader.

## 4. Resource Scope Control

**Decision**

Subset inicial limitado a:

- `Patient`
- `Practitioner`
- `Encounter`
- `Condition`
- `MedicationRequest`
- `AllergyIntolerance`

**Implementation consequence**

Todo recurso fuera de ese subset queda fuera de la primera ola salvo nueva decision explicita.

## 5. Interaction Scope Control

**Decision**

- `read`
- `search`
- respuestas en `Bundle`

**Implementation consequence**

No se abre escritura FHIR generalizada en la primera iteracion.

## 6. Clinical Representation Fidelity

**Decision**

- `Encounter` es el recurso ancla de la consulta
- el contenido clinico se mapea con trazabilidad al origen actual
- el SOAP puede usar representacion transitoria documentada si no existe encaje limpio inmediato

**Implementation consequence**

Se prioriza consistencia y trazabilidad sobre una modelizacion excesivamente ambiciosa en la primera ola.

## 7. ID Strategy And Referential Stability

**Decision**

- claves de origen estables
- correspondencia reproducible entre origen y recursos FHIR
- referencias deterministas entre recursos

**Implementation consequence**

La estrategia de IDs debe quedar cerrada antes del ETL.

## 8. Security Baseline

**Decision**

- acceso restringido
- `AuthorizationInterceptor`
- exposicion controlada, preferiblemente interna

**Implementation consequence**

No se admite un endpoint FHIR abierto aunque el alcance sea limitado.

## 9. Audit And Compliance Traceability

**Decision**

- baseline de auditoria desde el inicio
- BALP o equivalente para accesos y operaciones relevantes

**Implementation consequence**

La ausencia de auditoria no se considera una simplificacion valida.

## 10. Validation And Terminology

**Decision**

- `RepositoryValidatingInterceptor`
- validacion estructural y de perfiles basicos
- terminologia minima para el subset inicial

**Implementation consequence**

La primera iteracion no necesita el stack terminologico final, pero si validacion suficiente para no degradar calidad clinica.

## 11. Upgrade And Migration Discipline

**Decision**

- versionado explicito
- politica de upgrade documentada
- migraciones HAPI tratadas como parte normal de la plataforma

**Implementation consequence**

No debe desplegarse la base HAPI sin dejar claro como se verificaran upgrades futuros.

## 12. First Iteration Success Check

La primera iteracion sera correcta si logra, sin ampliar el alcance:

1. HAPI estable sobre PostgreSQL.
2. `/fhir/metadata` coherente con el subset acordado.
3. ETL inicial repetible.
4. recursos legibles y buscables con referencias consistentes.
5. baseline de seguridad, auditoria y validacion.