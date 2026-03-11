# ADR-001: Initial HAPI FHIR Topology

**Status**: Proposed
**Date**: 2026-03-11
**Related spec**: `docs/specs/002-hapi-fhir-r5-migration/spec.md`
**Related plan**: `docs/specs/002-hapi-fhir-r5-migration/plan.md`

## Context

ConsultaMed ya es FHIR-ready en nomenclatura, pero sigue siendo application-first en persistencia, API y seguridad operacional.

La migracion a HAPI FHIR R5 necesita una primera decision de topologia que permita:

- introducir interoperabilidad FHIR real sin bloquear el producto actual
- limitar el riesgo clinico y operativo en fases tempranas
- evitar una reescritura big-bang del backend FastAPI y de la UI
- preservar una ruta de evolucion hacia un system of record FHIR si mas adelante queda justificado

Las alternativas principales consideradas en la spec son:

1. HAPI FHIR como sidecar o servicio separado con convivencia transitoria.
2. HAPI FHIR como nuevo system of record desde fases tempranas.
3. FHIR facade sobre el modelo actual sin adoptar HAPI como repositorio real en la primera etapa.

## Decision

La recomendacion inicial es adoptar **HAPI FHIR JPA Server como servicio separado y progresivo**, con esta orientacion por fases:

1. **Fase temprana**:
   - FastAPI sigue siendo la capa principal de aplicacion.
   - La fuente de verdad operacional sigue siendo el modelo actual.
   - HAPI FHIR se introduce como servidor/repositorio interoperable aislado.
2. **Primera exposicion funcional**:
   - priorizar lectura y busqueda FHIR (`read`, `search`, `Bundle`) para un subconjunto pequeno de recursos
   - evitar escrituras FHIR tempranas mientras no exista gobernanza cerrada de IDs, referencias, rollback y auditoria
3. **Fase de reevaluacion**:
   - decidir si se mantiene una arquitectura dual controlada o si se converge hacia HAPI como system of record

## Rationale

Esta decision se adopta porque:

- minimiza el riesgo de romper el flujo clinico actual
- desacopla la introduccion de Java/HAPI del runtime principal Python en la primera fase
- permite validar interoperabilidad real antes de mover la fuente de verdad
- facilita rollback y contencion de fallos en un componente nuevo
- mantiene abierta la opcion de convergencia futura sin comprometerla prematuramente

## Explicit Non-Decision

Esta ADR **no** decide aun:

- si HAPI sera el system of record final
- el subconjunto definitivo de recursos de la primera fase
- el modelo final de autenticacion/autorizacion entre FastAPI y HAPI
- la estrategia exacta de sincronizacion o ETL entre ambos mundos
- si HAPI usara la misma base PostgreSQL fisica o una base separada de transicion

## Consequences

### Positive

- permite abrir analisis y issues por fases sin reescritura total
- reduce el acoplamiento inicial entre backend actual y repositorio FHIR
- hace viable una primera entrega read-only de interoperabilidad
- alinea la migracion con el principio brownfield incremental ya adoptado por el repo

### Negative

- introduce complejidad temporal de dos capas semanticas
- obliga a definir con precision la fuente de verdad por fase
- retrasa las escrituras FHIR completas hasta resolver la gobernanza de datos
- puede exigir sincronizacion temporal o ETL intermedio

## Rejected Alternatives For Phase 0

### HAPI as immediate system of record

Se rechaza como decision inicial porque adelanta demasiado riesgo tecnico y operativo en un repo que todavia depende funcionalmente de FastAPI y de contratos propietarios para la UI.

### FHIR facade without HAPI repository

Se rechaza como primera recomendacion porque no resuelve el objetivo estructural de evolucionar hacia una infraestructura FHIR real; solo desplaza la deuda.

## Entry Conditions To Revisit This ADR

Esta ADR debe revisarse si ocurre cualquiera de estas condiciones:

- se demuestra que el coste operativo de mantener FastAPI + HAPI es excesivo
- la primera fase exige escrituras FHIR antes de lo esperado
- el analisis de datos concluye que la fuente de verdad actual impide interoperabilidad fiable
- un requisito regulatorio o de integracion fuerza una convergencia mas rapida

## Next Artifacts Enabled By This ADR

Esta ADR habilita la siguiente ronda de trabajo no ejecutable:

1. delimitar el primer subset de recursos y operaciones FHIR
2. definir la estrategia de IDs y referencias entre ambos sistemas
3. concretar si la primera entrega FHIR sera read-only
4. derivar una primera tanda de GitHub Issues estrategicos