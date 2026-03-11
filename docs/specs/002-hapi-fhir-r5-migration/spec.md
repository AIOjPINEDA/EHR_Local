# Feature Specification: HAPI FHIR R5 Migration Strategy

**Feature Branch**: `002-hapi-fhir-r5-migration`
**Created**: 2026-03-11
**Status**: Draft
**Last Updated**: 2026-03-11
**Input**: Reconstruir una linea de planificacion activa para migrar la base de datos y la capa de interoperabilidad de ConsultaMed hacia un sistema FHIR R5 usando HAPI FHIR.

## Overview

Esta spec define una estrategia inicial para evolucionar ConsultaMed desde su arquitectura actual, basada en FastAPI + PostgreSQL con modelos FHIR-aligned, hacia una arquitectura con soporte FHIR R5 real usando HAPI FHIR como servidor y repositorio interoperable.

Segun la gobernanza actual del repositorio, esta spec documenta el cambio propuesto y su espacio de decisiones. No actua como backlog ejecutable ni sustituye GitHub Issues.

El objetivo de esta spec no es cerrar decisiones de implementacion fina ni detallar tareas ejecutables al nivel de PR. Su funcion es fijar:

- el problema a resolver
- el alcance de la migracion
- las decisiones macro que hay que tomar
- las fases candidatas
- las preguntas abiertas que requeriran una segunda iteracion mas detallada

## Workflow Position

- Tipo de artefacto: spec bundle estrategico.
- Backlog activo: GitHub Issues, no este documento.
- Siguiente artefacto esperado: refinamiento de `plan.md` y apertura de issues cuando exista una decision de topologia y fase inicial.
- `tasks.md`: no crear hasta que la iniciativa entre en modo de ejecucion.
- Decision document inicial: `adr-001-initial-topology.md`.

## Problem Statement

ConsultaMed ya usa nomenclatura y estructuras alineadas con FHIR R5, pero actualmente mantiene una API JSON propia y un modelo de persistencia disenado para la aplicacion, no para interoperabilidad FHIR completa.

Esto crea varias limitaciones estructurales:

- no existe una FHIR REST API compatible con clientes externos
- no existen `Bundle` de intercambio ni soporte nativo de transacciones FHIR
- la validacion de perfiles y terminologias sigue siendo parcial y propia del backend
- el almacenamiento actual no funciona como un repositorio FHIR estandar
- futuras exigencias EHDS y escenarios de interoperabilidad requeriran mas que naming compatible

El cambio deseado es migrar progresivamente hacia un sistema FHIR R5 real sobre HAPI FHIR, minimizando riesgo clinico y operativo sobre el producto actual.

## Goals

### Business Goals

- Preparar ConsultaMed para interoperabilidad real con ecosistemas FHIR R5.
- Reducir deuda futura asociada a mantener una API bespoke paralela a necesidades regulatorias y de intercambio.
- Aprovechar experiencia previa del equipo con HAPI FHIR para acelerar una base mas estandar.

### Technical Goals

- Introducir un repositorio FHIR R5 basado en HAPI FHIR.
- Definir una estrategia de migracion de datos desde el esquema actual hacia recursos FHIR persistidos por HAPI.
- Establecer una convivencia transitoria segura entre el backend actual y la futura capa FHIR.
- Delimitar como se resuelven autenticacion, autorizacion, auditoria, validacion y perfiles en la arquitectura futura.

### Product Goals

- Mantener continuidad operativa del flujo clinico actual durante la transicion.
- Evitar una reescritura big-bang que bloquee al equipo o degrade la usabilidad del piloto.
- Priorizar primero interoperabilidad estructural sobre expansion funcional no critica.

## Non-Goals

Esta spec no pretende en esta fase:

- definir el modelo fisico final de cada recurso FHIR campo por campo
- decidir aun si todo el backend FastAPI desaparece o si permanece como BFF/orchestrator
- detallar scripts de migracion finales, mappings completos o estrategias ETL cerradas
- comprometer un calendario de implementacion cerrado
- reemplazar inmediatamente toda la UI o todos los contratos frontend
- adoptar de entrada SMART on FHIR o un ecosistema OAuth completo sin evaluacion posterior

## Current State

ConsultaMed parte de una base favorable para esta migracion:

- modelos y entidades ya usan naming FHIR R5 (`Patient`, `Encounter`, `Condition`, `MedicationRequest`, `AllergyIntolerance`, `Practitioner`)
- el backend usa operaciones con naming compatible (`read`, `search`, `create`, `update`, `patch`, `delete`)
- existen codificaciones clinicas ya alineadas parcialmente con ICD-10 y SNOMED
- la arquitectura y la documentacion ya reconocen la ausencia actual de una FHIR REST API como gap

Sin embargo, la implementacion actual sigue siendo application-first:

- persistencia propia en PostgreSQL con esquema relacional especifico del producto
- serializacion de respuestas pensada para la UI actual
- auth propia con JWT de FastAPI
- ausencia de `CapabilityStatement`, `Bundle`, validacion de perfiles y operaciones REST FHIR nativas

## Target State

El estado objetivo, a alto nivel, es una arquitectura donde HAPI FHIR actua como componente central de interoperabilidad y persistencia FHIR R5.

La forma exacta puede variar, pero esta spec asume como direccion preferente:

- HAPI FHIR JPA Server como repositorio FHIR persistente sobre PostgreSQL
- capacidad de exponer endpoints FHIR R5 estandares, con `CapabilityStatement`
- validacion de recursos y perfiles usando infraestructura FHIR/HAPI
- soporte progresivo de `Bundle`, `search`, `read`, `create`, `update` y operaciones seleccionadas
- mecanismos de auditoria y seguridad compatibles con necesidades clinicas y regulatorias

## Strategic Options To Evaluate

### Option A: HAPI FHIR as sidecar repository

Mantener FastAPI como backend principal de aplicacion y usar HAPI FHIR como repositorio/endpoint FHIR en paralelo.

Pros:

- menor riesgo inicial
- permite migracion incremental por recurso
- preserva contratos actuales con frontend

Questions to deepen:

- quien es la fuente de verdad en cada fase
- como se sincronizan escrituras entre modelo actual y repositorio HAPI
- como evitar doble logica clinica y drift semantico

### Option B: HAPI FHIR as new system of record

Migrar gradualmente el almacenamiento principal a HAPI FHIR y reducir FastAPI a capa de orquestacion o adaptacion.

Pros:

- converge mas rapido a un modelo FHIR real
- evita mantener dos modelos persistentes a medio plazo

Questions to deepen:

- impacto sobre flujos actuales
- viabilidad de las reglas clinicas actuales sobre recursos HAPI
- coste real de reescritura de servicios y auth

### Option C: FHIR facade first

Crear primero una capa FHIR sobre el modelo actual sin mover el system of record y evaluar HAPI despues.

Pros:

- menor disrupcion temprana
- valida demanda de interoperabilidad antes de migrar almacenamiento

Cons:

- puede alargar la deuda y duplicar esfuerzo
- no resuelve el problema de base si el objetivo es HAPI como repositorio real

## Preferred Direction

La direccion preferente para la siguiente iteracion de detalle es una variante de Option A evolucionable a Option B:

- empezar con HAPI FHIR como componente nuevo y aislado
- introducirlo primero como repositorio interoperable y capa FHIR estandar
- migrar recursos clinicos por fases
- reevaluar despues si FastAPI debe quedar como BFF, motor clinico complementario o adaptador temporal

Esta preferencia se alinea con el principio historico del repositorio: pasar de FHIR-ready a FHIR-real sin reescritura brusca.

## Decision Gates Before Execution

No debe abrirse una fase de implementacion mientras sigan sin resolver estas decisiones:

1. Topologia inicial elegida y justificada.
2. Fuente de verdad por fase definida.
3. Primer subset de recursos y operaciones FHIR acotado.
4. Estrategia de IDs, referencias y rollback aceptada.
5. Modelo minimo de seguridad y auditoria aceptado.

## Scope Candidates

### In Scope For Future Detailed Planning

- eleccion del modo HAPI FHIR a adoptar (`Plain Server` vs `JPA Server`, con preferencia inicial por JPA)
- estrategia de despliegue y topologia (monolito ampliado, servicio separado o sidecar)
- estrategia de migracion de base de datos y datos historicos
- modelo de identidad de recursos y trazabilidad entre IDs actuales y IDs FHIR
- seguridad y autorizacion del servidor FHIR
- perfiles y validacion R5
- estrategia de coexistencia entre API actual y FHIR API
- observabilidad, auditoria y rollback

### Explicitly Out Of Scope For This Draft

- mapping completo de cada tabla a cada recurso FHIR
- definicion definitiva de perfiles IPS o guias nacionales
- implementacion de subscriptions, MDM, HFQL o capacidades avanzadas de HAPI
- adopcion inmediata de un patient portal o integracion cross-border completa

## Key User / System Scenarios

### Scenario 1 - Interoperable Patient Read

Como sistema externo o modulo interno interoperable, quiero leer un `Patient` mediante endpoint FHIR R5 para consumir un recurso estandar sin depender del contrato JSON propietario.

### Scenario 2 - Clinical Encounter Exchange

Como sistema de integracion, quiero consultar `Encounter`, `Condition` y `MedicationRequest` en formato FHIR para permitir intercambio estructurado de episodios clinicos.

### Scenario 3 - Safe Incremental Migration

Como equipo de producto, quiero migrar sin romper el flujo clinico actual ni perder integridad de datos durante la convivencia de arquitecturas.

### Scenario 4 - Compliance-Oriented Evolution

Como responsable tecnico, quiero que la arquitectura futura facilite EHDS, FHIR REST API, exportes estandar y validacion de perfiles sin rehacer el modelo desde cero.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | El sistema objetivo debe exponer recursos FHIR R5 mediante endpoints REST estandares. | Must |
| FR-002 | Debe existir una estrategia para migrar `Patient`, `Practitioner`, `Encounter`, `Condition`, `MedicationRequest` y `AllergyIntolerance`. | Must |
| FR-003 | Debe preservarse la continuidad del flujo clinico actual durante la migracion. | Must |
| FR-004 | Debe existir una estrategia para generar y devolver `Bundle` de busqueda e intercambio. | Should |
| FR-005 | Debe contemplarse validacion de perfiles, terminologia y estructuras FHIR. | Should |
| FR-006 | Debe definirse como se mapearan las operaciones de escritura actuales a interacciones FHIR. | Must |
| FR-007 | Debe definirse la gobernanza de IDs y referencias entre el sistema actual y HAPI FHIR. | Must |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-001 | La migracion debe minimizar downtime y riesgo de corrupcion o perdida de datos. | Must |
| NFR-002 | La arquitectura futura debe soportar auditoria y controles de acceso adecuados para datos clinicos. | Must |
| NFR-003 | La nueva capa FHIR no debe degradar de forma inaceptable el rendimiento de los flujos clinicos criticos. | Should |
| NFR-004 | La solucion debe ser operable por el equipo actual sin dependencia excesiva de infraestructura ajena al stack dominado. | Should |
| NFR-005 | La planificacion debe contemplar estrategia de rollback en cada fase. | Must |

## Design Principles For The Next Planning Round

- Preferir migracion incremental a reescritura total.
- Separar claramente interoperabilidad, persistencia y UX para evitar acoplamientos prematuros.
- Conservar semantica clinica del dominio actual aunque cambie la infraestructura de almacenamiento.
- Diseñar primero la gobernanza de datos y de identidades antes que los endpoints finales.
- No adoptar capacidades avanzadas de HAPI FHIR hasta validar el caso base de repositorio + lectura + busqueda.

## Major Design Areas To Deepen Later

### 1. Resource Mapping

- equivalencia tabla actual -> recurso FHIR
- manejo de campos SOAP en `Encounter`
- modelado de templates actuales frente a `PlanDefinition` u otra abstraccion

### 2. Data Migration Strategy

- migracion one-shot vs sincronizacion progresiva
- coexistencia de bases y escrituras duales
- verificacion de integridad tras migracion

### 3. HAPI FHIR Runtime Architecture

- despliegue embebido o servicio separado
- `JPA Server` vs configuracion mas controlada
- uso de PostgreSQL actual vs base dedicada para HAPI

### 4. Security Model

- auth entre frontend, FastAPI y HAPI
- autorizacion por recurso y por actor
- auditoria y logging sin exponer PHI/PII

### 5. API Transition Strategy

- que endpoints bespoke se mantienen
- que rutas FHIR se exponen primero
- como se versiona la convivencia de contratos

### 6. Validation And Profiles

- perfiles R5 base vs perfiles propios
- estrategia para terminology resources y paquetes FHIR
- validacion en ingest y en export

### 7. Operational Readiness

- backup y rollback
- migraciones de esquema HAPI
- observabilidad y troubleshooting

## Risks

- duplicidad temporal de fuentes de verdad
- complejidad operativa de introducir stack Java/Spring/HAPI en un repo hoy centrado en Python/TypeScript
- perdida de velocidad del equipo si el cambio se aborda demasiado pronto o demasiado ancho
- riesgo de adaptar mal semantica clinica local a recursos FHIR estandares
- posible desalineacion entre necesidades del producto y capacidades avanzadas no necesarias de HAPI

## Success Criteria

Esta spec se considerara util si en la siguiente iteracion permite producir un plan detallado capaz de responder, como minimo, a estas preguntas:

1. Que topologia elegimos para introducir HAPI FHIR.
2. Cual sera la fuente de verdad en cada fase.
3. Como migramos los recursos clinicos actuales sin romper operativa.
4. Que subset FHIR R5 implementamos primero.
5. Como validamos, auditamos y securizamos el nuevo sistema.

## Exit Criteria For This Draft

Esta version de la spec puede darse por cerrada cuando:

- el plan asociado concrete una secuencia de analisis ejecutable
- exista una recomendacion arquitectonica inicial defendible
- las preguntas abiertas queden suficientemente acotadas para abrir issues

## External Guidance Considered

Esta spec toma como referencia de alto nivel:

- HAPI FHIR como toolkit para clientes y servidores HL7 FHIR.
- HAPI FHIR JPA Server como implementacion persistente de servidor FHIR sobre base relacional.
- generacion automatica de `CapabilityStatement` en servidores HAPI.
- uso de validacion de repositorio y soporte de perfiles/terminologia en la infraestructura HAPI.
- necesidad de migraciones de base propias de HAPI JPA al cambiar versiones.
- conceptos centrales del ecosistema FHIR R5: RESTful API, `Bundle`, perfiles, validacion y portabilidad.

## Open Questions

1. Queremos que HAPI FHIR sea el system of record final o solo la capa interoperable principal.
2. Que recursos deben migrarse en la primera fase y cuales pueden seguir en el modelo actual temporalmente.
3. Como se representa el flujo SOAP actual dentro del recurso `Encounter` o recursos auxiliares.
4. Si los templates de tratamiento deben mapearse a `PlanDefinition`, `ActivityDefinition` o mantenerse fuera de FHIR en una fase inicial.
5. Si el backend FastAPI debe quedarse como BFF/UI API o tender a desaparecer.
6. Que estrategia de seguridad resulta mas realista: JWT propio, gateway, OAuth2/OIDC, SMART-on-FHIR o un modelo hibrido.
7. Si la base PostgreSQL actual debe evolucionar hacia la gestion de HAPI o si conviene una base separada de transicion.
