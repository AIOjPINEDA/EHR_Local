# Guia De Apertura De Issues: Base HAPI FHIR R5

## Proposito

Servir de traspaso para que un agente futuro pueda abrir GitHub Issues consistentes con la spec v2.

No es backlog activo ni tablero de ejecucion.

## Regla De Uso

- usar este documento solo como semilla para futuras issues
- si cambia la direccion de la iniciativa, actualizar primero la spec
- no mantener este archivo como seguimiento vivo de ejecucion

## Secuencia Recomendada De Issues

### Issue 1 - Arranque del servicio sidecar HAPI

**Objetivo**

Levantar un servicio sidecar HAPI FHIR JPA Server basado en el starter oficial.

**Criterios de aceptacion**

- existe estructura base HAPI usando el starter oficial
- el servicio arranca localmente con configuracion declarativa
- el entorno de ejecucion actual de FastAPI no se modifica
- `/fhir/metadata` responde correctamente

**Restricciones**

- no introducir capacidades avanzadas fuera de la linea base
- no exponer HAPI como API publica principal

**Dependencias**

- ninguna

### Issue 2 - PostgreSQL dedicada y persistencia HAPI

**Objetivo**

Provisionar la base PostgreSQL dedicada para HAPI y cerrar dialecto y persistencia.

**Criterios de aceptacion**

- HAPI usa una base PostgreSQL separada
- el dialecto HAPI PostgreSQL queda configurado explicitamente
- la frontera entre DB transaccional y DB FHIR queda documentada
- el lifecycle de migraciones HAPI queda documentado

**Restricciones**

- no reutilizar la base operativa del producto

**Dependencias**

- Issue 1

### Issue 3 - Health checks, logging y observabilidad minima

**Objetivo**

Definir la operacion minima segura del servicio sidecar HAPI.

**Criterios de aceptacion**

- existe health check operativo para HAPI
- el logging evita PHI innecesaria
- se documentan puntos minimos de troubleshooting

**Restricciones**

- no sobredisenar observabilidad avanzada en esta ola

**Dependencias**

- Issue 1
- Issue 2

### Issue 4 - Mapping e IDs para Patient y Practitioner

**Objetivo**

Cerrar mapping inicial e IDs estables para `Patient` y `Practitioner`.

**Criterios de aceptacion**

- mapping documentado y probado para ambos recursos
- IDs de origen y referencias definidos de forma determinista
- existe reconciliacion basica entre origen y HAPI

**Restricciones**

- no introducir dual-write

**Dependencias**

- Issue 1
- Issue 2

### Issue 5 - Mapping y ETL para Encounter, Condition, MedicationRequest y AllergyIntolerance

**Objetivo**

Completar el subset clinico inicial y su ETL repetible.

**Criterios de aceptacion**

- mapping documentado para los cuatro recursos
- el ETL corre de forma repetible e idempotente
- las referencias entre recursos quedan consistentes
- la representacion transitoria del SOAP queda explicitada

**Restricciones**

- no abrir escrituras FHIR generales

**Dependencias**

- Issue 4

### Issue 6 - Lectura/busqueda FHIR y validacion funcional del subset

**Objetivo**

Verificar que HAPI expone una superficie FHIR util sobre el subset cargado.

**Criterios de aceptacion**

- `CapabilityStatement` coherente con el subset
- `read` operativo para los recursos iniciales
- `search` devuelve `Bundle` consistente
- conteos y muestras contrastados con la base actual

**Restricciones**

- no ampliar alcance a operaciones de escritura externas

**Dependencias**

- Issue 5

### Issue 7 - Seguridad, auditoria y validacion de linea base

**Objetivo**

Introducir la linea base minima de control clinico sobre HAPI.

**Criterios de aceptacion**

- existe estrategia inicial con `AuthorizationInterceptor`
- existe linea base de auditoria con BALP o equivalente documentado
- `RepositoryValidatingInterceptor` o mecanismo equivalente queda integrado
- la terminologia minima del subset queda resuelta o claramente acotada

**Restricciones**

- no resolver aun el modelo final completo de auth corporativo

**Dependencias**

- Issue 6

## Verificacion Previa A La Apertura De Issues

Antes de abrir cualquiera de estas issues, el agente ejecutor debe validar que siguen siendo ciertas estas decisiones:

1. servicio sidecar HAPI como topologia elegida
2. PostgreSQL dedicada para HAPI
3. FastAPI como fuente de verdad inicial
4. subset inicial limitado a seis recursos
5. `read` y `search` como alcance funcional de primera ola