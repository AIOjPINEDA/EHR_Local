# ADR-001: Initial HAPI FHIR Topology

**Status**: Proposed
**Date**: 2026-03-11
**Related spec**: `docs/specs/002-hapi-fhir-r5-migration/spec.md`

## Context

ConsultaMed ya es FHIR-ready en nomenclatura, pero sigue siendo application-first en persistencia, API y operacion.

La primera decision estructural de la iniciativa es definir como introducir HAPI sin poner en riesgo el MVP actual.

Alternativas consideradas:

1. HAPI como sidecar o servicio separado.
2. HAPI como system of record temprano.
3. FHIR facade sobre el modelo actual sin repositorio HAPI real.

## Decision

Se adopta **HAPI FHIR JPA Server como servicio separado y progresivo**.

Implicaciones directas:

- FastAPI sigue siendo la capa principal de aplicacion.
- la fuente de verdad operacional sigue siendo el modelo actual.
- la primera exposicion funcional de HAPI se centra en `read`, `search` y `Bundle`.

## Rationale

- minimiza riesgo clinico y operativo
- desacopla el runtime Java del runtime principal Python
- permite validar interoperabilidad real antes de mover ownership clinico
- facilita rollback y aislamiento de fallos

## Explicit Non-Decisions

Esta ADR no decide:

- si HAPI sera el system of record final
- el modelo final de autenticacion y autorizacion
- la estrategia final de convergencia entre ambos mundos

## Consequences

### Positive

- hace viable una primera iteracion incremental
- evita reescritura total del backend
- permite abrir trabajo futuro por fases

### Negative

- introduce dualidad temporal entre capa operativa y repositorio FHIR
- obliga a cerrar bien IDs, referencias y sincronizacion inicial

## Revisit Conditions

Esta ADR debe revisarse si:

- el coste operativo de FastAPI + HAPI resulta excesivo
- la primera fase exige escrituras FHIR antes de tiempo
- aparece un requisito regulatorio o de integracion que fuerce convergencia mas rapida

## Alignment Note

Para esta ronda, la spec v2 ya fija como derivadas de esta ADR:

- PostgreSQL separada para HAPI
- primer alcance funcional centrado en `read` y `search`
- ETL one-way e idempotente