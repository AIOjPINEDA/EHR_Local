# Plan v2: Base HAPI FHIR R5

**Branch**: `002-hapi-fhir-r5-migration`
**Date**: 2026-03-11
**Spec**: `docs/specs/002-hapi-fhir-r5-migration/spec.md`
**Status**: Draft v2

## Proposito

Ordenar la futura ejecucion de la iniciativa sin convertir este documento en backlog operativo.

## Orden De Ejecucion

1. levantar servicio sidecar HAPI moderno y observable
2. preparar PostgreSQL dedicada y ciclo de persistencia HAPI
3. definir mapping e IDs del subset inicial
4. ejecutar ETL repetible
5. habilitar lectura y busqueda FHIR
6. cerrar linea base de seguridad, auditoria y validacion

## Fase 0 - Decisiones Ya Cerradas

- servicio sidecar HAPI JPA Server
- starter oficial
- JDK 17+
- PostgreSQL dedicada para HAPI
- FastAPI como fuente de verdad inicial
- ETL one-way e idempotente
- alcance inicial limitado a `read` y `search`

## Fase 1 - Linea Base De Ejecucion

Objetivo: disponer de un HAPI levantable y aislado.

Incluye:

- starter oficial
- configuracion declarativa
- PostgreSQL dedicada
- `/fhir/metadata`
- health checks

Salida esperada:

- servicio sidecar operativo
- frontera clara entre el entorno de ejecucion actual y el entorno de ejecucion HAPI
- arranque reproducible

## Fase 2 - Mapeo Y ETL Inicial

Objetivo: trasladar el dominio actual al subset FHIR acordado sin tocar la operativa del MVP.

Incluye:

- mapping de recursos
- politica de IDs y referencias
- representacion transitoria del SOAP en `Encounter`
- ETL repetible con validacion post-load

Salida esperada:

- carga inicial de extremo a extremo
- rollback simple por reset de base HAPI y recarga

## Fase 3 - Superficie De Lectura

Objetivo: exponer una superficie FHIR util y acotada.

Incluye:

- `CapabilityStatement`
- `read`
- `search`
- `Bundle`

Salida esperada:

- recursos legibles y buscables de forma coherente
- FastAPI sigue intacto como API principal

## Fase 4 - Seguridad, Auditoria Y Validacion

Objetivo: evitar que la base FHIR nazca sin controles minimos.

Incluye:

- `AuthorizationInterceptor`
- linea base de auditoria con BALP
- `RepositoryValidatingInterceptor`
- terminologia minima del subset

Salida esperada:

- accesos restringidos
- validacion estructural definida
- auditoria documentada y operativa

## Fase 5 - Endurecimiento Diferido

Objetivo: dejar explicitado lo que sigue despues sin bloquear la primera iteracion.

Incluye:

- observabilidad mas avanzada
- politica de upgrades HAPI
- refinamientos posteriores de DB, perfiles y sincronizacion

## Verificacion Minima

- arranque del servidor
- `CapabilityStatement`
- lectura individual de recursos
- busquedas FHIR basicas
- integridad de referencias
- contraste de conteos y muestras con la base actual

## Elementos Diferidos

- sincronizacion incremental o CDC
- convergencia futura de la fuente de verdad
- perfiles nacionales o EHDS mas estrictos
- particionado o multi-tenant
- observabilidad avanzada

## Regla De Traspaso

La descomposicion a futuras issues se mantiene en `issue-seeding.md`. Este documento solo define orden y salidas esperadas por fase.