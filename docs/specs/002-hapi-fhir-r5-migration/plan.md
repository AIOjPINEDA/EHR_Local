# Implementation Plan: HAPI FHIR R5 Migration Strategy

**Branch**: `002-hapi-fhir-r5-migration`
**Date**: 2026-03-11
**Spec**: `docs/specs/002-hapi-fhir-r5-migration/spec.md`
**Initial ADR**: `docs/specs/002-hapi-fhir-r5-migration/adr-001-initial-topology.md`
**Status**: Draft
**Input**: Strategic spec for migrating ConsultaMed toward a FHIR R5 system using HAPI FHIR.

## Summary

Este plan no descompone trabajo ejecutable fino. Su funcion es ordenar la siguiente ronda de analisis y diseno para que la migracion a HAPI FHIR pueda refinarse sin perder foco ni abrir demasiados frentes a la vez.

Este documento es un plan estrategico intermedio. No sustituye GitHub Issues ni debe generar `tasks.md` hasta que exista una decision de arranque suficientemente estable.

La hipotesis de trabajo inicial es:

- mantener el producto actual operativo
- introducir HAPI FHIR de forma incremental
- evaluar primero una topologia sidecar/repository
- preparar una convergencia futura hacia un system of record FHIR si el analisis lo justifica

## Planning Phases

## Entry Criteria

Este plan asume que ya existe acuerdo sobre lo siguiente:

- la necesidad de evolucionar de FHIR-ready a FHIR-real
- la preferencia por una aproximacion incremental
- la decision de no ejecutar una reescritura big-bang

Si estos puntos cambian, debe actualizarse primero la spec.

### Phase 0 - Discovery And Architectural Decision

Objetivo: convertir la intencion general en una decision arquitectonica concreta.

Temas a profundizar:

- topologia objetivo: sidecar, servicio separado, embebido o reemplazo progresivo
- `Plain Server` vs `JPA Server`, con evaluacion preferente de `JPA Server`
- alcance funcional inicial del servidor FHIR
- impacto sobre deploy, operacion y observabilidad

Deliverables esperados:

- ADR o decision document de topologia
- decision de fuente de verdad por fase
- lista de riesgos y mitigaciones iniciales
- recomendacion de si abrir o no la primera tanda de issues

### Phase 1 - Domain Mapping

Objetivo: traducir el dominio actual de ConsultaMed a recursos FHIR R5 operables.

Temas a profundizar:

- mapping de recursos principales
- estrategia para campos SOAP
- manejo de identificadores actuales y referencias FHIR
- tratamiento de templates clinicos

Deliverables esperados:

- matriz entidad actual -> recurso FHIR
- decision sobre campos no estandar y extensiones
- propuesta inicial para recursos fuera del core clinico
- delimitacion del primer subconjunto implementable

### Phase 2 - Data Migration Strategy

Objetivo: definir como se moveran y verificaran los datos.

Temas a profundizar:

- ETL inicial vs replicacion progresiva
- migracion por lotes vs por recurso
- trazabilidad y reconciliacion
- criterios de rollback

Deliverables esperados:

- estrategia de migracion de datos
- criterios de validacion post-migracion
- plan de pruebas de integridad
- estrategia minima de rollback por fase

### Phase 3 - API Transition Strategy

Objetivo: definir convivencia entre API actual y API FHIR.

Temas a profundizar:

- endpoints FHIR iniciales
- endpoints propietarios a mantener temporalmente
- versionado y consumidores de cada contrato
- estrategia de Bundle y busquedas

Deliverables esperados:

- roadmap de exposicion API
- subset FHIR inicial priorizado
- politica de deprecacion de endpoints bespoke
- criterio para abrir issues por recurso o por capability

### Phase 4 - Security And Compliance Alignment

Objetivo: garantizar que la nueva arquitectura no retrocede en seguridad ni cumplimiento.

Temas a profundizar:

- autenticacion y autorizacion
- auditoria compatible con entorno clinico
- validacion de perfiles y terminologia
- impacto EHDS y exportes futuros

Deliverables esperados:

- modelo de seguridad inicial
- plan de auditoria y logging
- decision sobre validacion de perfiles y paquetes
- lista de restricciones que bloquean ejecucion temprana

### Phase 5 - Execution Planning

Objetivo: convertir el analisis anterior en trabajo implementable.

Temas a profundizar:

- milestones tecnicos
- fases de entrega
- criterios de salida de cada fase
- pruebas de regresion y readiness

Deliverables esperados:

- propuesta de issues o tareas detalladas
- estrategia de pruebas
- checklist de despliegue y rollback

## Issue Derivation Rule

Cuando este plan madure, la ejecucion debe salir de aqui hacia GitHub Issues siguiendo una de estas dos granularidades:

1. Issues por fase, si la incertidumbre sigue siendo alta.
2. Issues por capability o recurso, si ya existe una topologia decidida y un subset inicial estable.

No mantener un `tasks.md` persistente si los issues ya estan abiertos y gobernados fuera del bundle.

## Workstreams To Detail Later

1. Arquitectura HAPI
2. Mapping clinico FHIR R5
3. Migracion de datos
4. Transicion de API
5. Seguridad y autorizacion
6. Validacion, perfiles y terminologia
7. Operacion y despliegue

## Key Technical Questions

1. HAPI FHIR debe vivir como servicio nuevo o como plataforma principal futura.
2. La base PostgreSQL actual sirve como sustrato para HAPI o conviene desacoplarla.
3. El backend FastAPI sigue siendo parte permanente de la arquitectura o solo capa transitoria.
4. El primer corte debe ser read-only FHIR o incluir escrituras tempranas.
5. Que recursos pueden migrarse primero con menor riesgo: `Patient`, `Practitioner`, `Encounter`, `Condition`, `MedicationRequest`, `AllergyIntolerance`.
6. Como se representa el flujo SOAP sin degradar semantica clinica.
7. Como se gobiernan IDs, referencias y versionado entre ambos mundos.

## Suggested First Deep-Dive Order

1. Topologia HAPI y fuente de verdad.
2. Mapping `Patient` y `Encounter`.
3. Estrategia de IDs y referencias.
4. Plan de migracion de datos.
5. Primer subset de endpoints FHIR.
6. Seguridad, auditoria y validacion.

## Definition Of Ready For The Next Iteration

Se considerara que este plan esta listo para una segunda version mas detallada cuando exista acuerdo sobre:

- topologia objetivo
- fuente de verdad por fase
- recursos incluidos en fase inicial
- estrategia de migracion de datos
- modelo de seguridad inicial
- criterio para decidir si se converge a HAPI como system of record final

## Definition Of Ready For Issue Creation

Se considerara que el bundle esta listo para derivar trabajo ejecutable cuando, ademas, exista:

- recomendacion arquitectonica inicial escrita
- subset inicial de recursos y operaciones FHIR acotado
- estrategia de rollback de fase temprana
- dependencia principal de infraestructura identificada
