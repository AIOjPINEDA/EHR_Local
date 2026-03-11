# Especificacion v2: Base HAPI FHIR R5 Para ConsultaMed

**Feature Branch**: `002-hapi-fhir-r5-migration`
**Created**: 2026-03-11
**Status**: Draft v2
**Last Updated**: 2026-03-11

## Proposito

Definir una base HAPI FHIR R5 minima, funcional y mantenible para ConsultaMed.

Esta spec no describe implementacion inmediata. Su funcion es dejar cerradas las decisiones necesarias para que otro agente pueda abordar la iniciativa de forma ordenada en el futuro.

## Posicion En El Flujo De Trabajo

- este bundle documenta cambio propuesto, no backlog activo
- el backlog activo sigue siendo GitHub Issues
- no debe existir `tasks.md` persistente en este bundle
- el traspaso a ejecucion futura se concentra en `issue-seeding.md`

## Estado Actual

ConsultaMed ya parte de una base favorable:

- naming FHIR en entidades y servicios
- dominio clinico ya estructurado para `Patient`, `Practitioner`, `Encounter`, `Condition`, `MedicationRequest` y `AllergyIntolerance`
- persistencia y operativa actuales estables en FastAPI + PostgreSQL

Limitaciones actuales:

- no existe FHIR REST API real
- no existen `CapabilityStatement` ni `Bundle` operativos
- no existe repositorio FHIR nativo
- validacion, auditoria e interoperabilidad FHIR siguen siendo parciales

## Estado Objetivo

El objetivo de esta iniciativa es dejar definida una primera capacidad FHIR con estas caracteristicas:

1. HAPI FHIR JPA Server desplegado como servicio separado.
2. FastAPI sigue siendo la fuente de verdad operacional.
3. HAPI expone `CapabilityStatement`, `read` y `search` para un subset inicial de recursos.
4. Los datos llegan a HAPI mediante ETL repetible e idempotente.
5. Seguridad, auditoria, validacion y operacion quedan definidas en una linea base suficiente para entorno clinico interno controlado.

## Decisiones Cerradas

### D-001 Topology

HAPI se adopta como servicio sidecar progresivo. No es el sistema de registro inicial.

### D-002 Arranque Base

La base de arranque sera el starter oficial `hapi-fhir-jpaserver-starter`.

### D-003 Entorno De Ejecucion

Linea base tecnica:

- JDK 17+
- HAPI FHIR actual soportado por la documentacion vigente
- PostgreSQL con `HapiFhirPostgresDialect`
- configuracion declarativa

### D-004 Fuente De Verdad

Durante la primera fase funcional, FastAPI + PostgreSQL actual siguen siendo la fuente de verdad para escrituras y logica clinica.

### D-005 Frontera De Base De Datos

HAPI usara PostgreSQL separada. No compartira base fisica con la operativa del producto en el arranque.

### D-006 Alcance De Interacciones

La primera entrega FHIR se limita a:

- `CapabilityStatement`
- `read`
- `search`
- `Bundle` de busqueda

Quedan fuera:

- escrituras clinicas externas
- transacciones FHIR de negocio
- capacidades avanzadas como subscriptions, MDM, HFQL, LastN, CDS Hooks, Clinical Reasoning y SMART on FHIR

### D-007 Alcance De Recursos

Subset inicial:

- `Patient`
- `Practitioner`
- `Encounter`
- `Condition`
- `MedicationRequest`
- `AllergyIntolerance`

Los templates clinicos quedan fuera de FHIR en esta fase.

### D-008 Estrategia De Datos

La estrategia inicial sera ETL one-way, repetible e idempotente. No habra dual-write ni sincronizacion bidireccional en la primera fase.

## Dentro De Alcance

- base HAPI FHIR JPA Server moderna y operable
- capa FHIR R5 minima alineada con el MVP
- mapping inicial del dominio actual al subset acordado
- estrategia inicial de ETL y rollback
- linea base de seguridad, auditoria, validacion y operacion
- politica de upgrades y migraciones HAPI

## Fuera De Alcance

- mover escrituras clinicas a HAPI
- reemplazar FastAPI como backend principal
- compartir base transaccional entre producto y HAPI
- resolver EHDS final o perfiles nacionales avanzados como requisito inicial
- introducir componentes avanzados de HAPI no necesarios para la linea base

## Direccion De Mapeo

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
- SOAP estructurado -> extension interna documentada en fase inicial

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

## Linea Base

### Security

- HAPI no sera la API publica principal del producto
- el acceso inicial sera interno o fuertemente controlado
- `AuthorizationInterceptor` es el punto de enforcement preferente
- BALP se considera linea base de auditoria

### Validation And Terminology

- validacion estructural FHIR R5 obligatoria
- `RepositoryValidatingInterceptor` como mecanismo preferente en persistencia
- terminologia minima para `Condition`, `MedicationRequest` y `AllergyIntolerance`

### Data

- exportar desde ConsultaMed actual
- transformar al subset FHIR definido
- cargar en HAPI
- verificar integridad
- repetir el proceso cuando sea necesario

### Operations

- health check con `/fhir/metadata`
- configuracion versionada por archivo y overrides
- logging suficiente sin PHI innecesaria
- estrategia documentada de upgrades y migraciones HAPI

## Criterios De Exito

La iniciativa queda bien definida si permite abrir trabajo futuro con claridad en:

1. topologia
2. frontera de base de datos
3. subset inicial de recursos e interacciones
4. estrategia de IDs y referencias
5. ETL inicial y rollback
6. linea base de seguridad, auditoria, validacion y operacion

## Criterio De Preparacion Para Crear Issues

El bundle estara listo para derivar GitHub Issues cuando existan, al menos:

- decision cerrada de topologia
- decision cerrada de frontera de base de datos
- subset inicial definido
- estrategia de IDs y referencias escrita
- linea base de seguridad, auditoria y validacion definida
- plan inicial de ETL y rollback definido

## Referencias

- documentacion oficial actual de HAPI FHIR visible al 2026-03-11
- `hapi-fhir-jpaserver-starter` como base de arranque adoptada
- repo legado `aio-fhir` como referencia de patrones utiles y anti-patrones
- estado implementado de ConsultaMed en este repositorio