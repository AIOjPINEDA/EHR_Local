# Baseline HAPI FHIR R5: secuencia histórica de implementación

**Branch**: `002-hapi-fhir-r5-migration`
**Date**: 2026-03-11
**Spec**: `docs/specs/002-hapi-fhir-r5-migration/spec.md`
**Status**: Historical implementation sequence

## Propósito

Este documento resume el orden lógico de trabajo que llevó a la baseline HAPI ya implementada.

No es un plan activo, no es backlog operativo y no debe usarse como tablero de estado.

## Secuencia retenida

1. bootstrap del sidecar HAPI y operación mínima
2. PostgreSQL dedicada y ciclo de persistencia HAPI
3. estrategia determinista de IDs y mapping base
4. ETL repetible del subset clínico inicial
5. superficie FHIR mínima de lectura y búsqueda
6. línea base de seguridad, auditoría y validación

## Etapas materializadas

### 1. Bootstrap del sidecar y operación mínima

Resultado retenido:

- sidecar HAPI arrancable desde el starter oficial
- configuración declarativa versionada
- `/fhir/metadata` y health checks operativos
- arranque reproducible sin romper la operación FastAPI

### 2. PostgreSQL dedicada para HAPI

Resultado retenido:

- frontera explícita entre DB operacional y DB FHIR
- persistencia HAPI aislada en PostgreSQL dedicada
- ciclo de arranque del sidecar separado del lifecycle de migraciones del producto

### 3. IDs y mapping base

Resultado retenido:

- trazabilidad reproducible desde el origen a `Patient` y `Practitioner`
- referencias deterministas para sostener el ETL posterior
- base común para reconciliación y validación de carga

### 4. ETL del subset clínico inicial

Resultado retenido:

- ETL one-way e idempotente para el subset aprobado
- orden de carga y consistencia referencial preservados
- reset/recarga sencilla sobre la persistencia HAPI

### 5. Superficie FHIR mínima

Resultado retenido:

- `CapabilityStatement` coherente con el subset
- `read` y `search` activos para los recursos aprobados
- respuestas `Bundle` coherentes sobre la carga realizada
- FastAPI preservado como API principal del producto

### 6. Seguridad, auditoría y validación

Resultado retenido:

- acceso restringido sobre la superficie FHIR
- validación estructural mínima integrada
- auditoría/logging sanitizados para contexto sanitario
- baseline de operación suficientemente controlada para uso interno local

## Verificación mínima retenida

- arranque del sidecar
- `CapabilityStatement`
- lectura individual de recursos
- búsquedas FHIR básicas
- integridad de referencias
- contraste de conteos y muestras con la base actual

## Qué no representa este archivo

- no sustituye la arquitectura implementada
- no sustituye el contrato operativo del repo
- no sustituye GitHub Issues como backlog/status

## Notas residuales

- Si hace falta trabajo adicional, debe abrirse o actualizarse en GitHub Issues; no reactivar este archivo como backlog.
- El rojo global del gate por deuda heredada de `mypy` sigue siendo un riesgo residual externo al propósito histórico de este bundle.
- El cierre administrativo o la actualización de estado de las issues relacionadas también vive en GitHub, no aquí.