# Implementation Plan v2: HAPI FHIR R5 Baseline

**Branch**: `002-hapi-fhir-r5-migration`
**Date**: 2026-03-11
**Spec**: `docs/specs/002-hapi-fhir-r5-migration/spec.md`
**Status**: Draft v2

## Purpose

Ordenar la futura ejecucion de la iniciativa sin convertir este documento en backlog operativo.

## Execution Order

1. levantar sidecar HAPI moderno y observable
2. preparar PostgreSQL dedicada y ciclo de persistencia HAPI
3. definir mapping e IDs del subset inicial
4. ejecutar ETL repetible
5. habilitar lectura y busqueda FHIR
6. cerrar baseline de seguridad, auditoria y validacion

## Phase 0 - Decisions Already Closed

- sidecar HAPI JPA Server
- starter oficial
- JDK 17+
- PostgreSQL dedicada para HAPI
- FastAPI como source of truth inicial
- ETL one-way e idempotente
- scope inicial limitado a `read` y `search`

## Phase 1 - Runtime Baseline

Objetivo: disponer de un HAPI levantable y aislado.

Incluye:

- starter oficial
- configuracion declarativa
- PostgreSQL dedicada
- `/fhir/metadata`
- health checks

Salida esperada:

- sidecar operativo
- boundary claro entre runtime actual y runtime HAPI
- arranque reproducible

## Phase 2 - Mapping And ETL Baseline

Objetivo: trasladar el dominio actual al subset FHIR acordado sin tocar la operativa del MVP.

Incluye:

- mapping de recursos
- politica de IDs y referencias
- representacion transitoria del SOAP en `Encounter`
- ETL repetible con validacion post-load

Salida esperada:

- carga inicial de extremo a extremo
- rollback simple por reset de base HAPI y recarga

## Phase 3 - Read Surface

Objetivo: exponer una superficie FHIR util y acotada.

Incluye:

- `CapabilityStatement`
- `read`
- `search`
- `Bundle`

Salida esperada:

- recursos legibles y buscables de forma coherente
- FastAPI sigue intacto como API principal

## Phase 4 - Security, Audit And Validation

Objetivo: evitar que la base FHIR nazca sin controles minimos.

Incluye:

- `AuthorizationInterceptor`
- baseline de auditoria con BALP
- `RepositoryValidatingInterceptor`
- terminologia minima del subset

Salida esperada:

- accesos restringidos
- validacion estructural definida
- auditoria documentada y operativa

## Phase 5 - Deferred Hardening

Objetivo: dejar explicitado lo que sigue despues sin bloquear la primera iteracion.

Incluye:

- observabilidad mas avanzada
- politica de upgrades HAPI
- refinamientos posteriores de DB, perfiles y sincronizacion

## Verification Baseline

- arranque del servidor
- `CapabilityStatement`
- lectura individual de recursos
- busquedas FHIR basicas
- integridad de referencias
- contraste de conteos y muestras con la base actual

## Deferred Items

- sincronizacion incremental o CDC
- convergencia futura del source of truth
- perfiles nacionales o EHDS mas estrictos
- particionado o multi-tenant
- observabilidad avanzada

## Handoff Rule

La descomposicion a futuras issues se mantiene en `issue-seeding.md`. Este documento solo define orden y salidas esperadas por fase.