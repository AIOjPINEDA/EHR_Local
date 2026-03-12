# Ejes críticos: baseline HAPI FHIR para ConsultaMed

## Propósito

Dejar explícitos los ejes que explican la baseline HAPI ya implementada y que deben seguir preservándose si se opera o se extiende esta capacidad.

## 1. Topología y aislamiento operativo

**Decisión retenida**

- FastAPI mantiene la lógica operativa del producto.
- HAPI funciona como capacidad interoperable separada.
- Un fallo del sidecar no debe bloquear la operación diaria del MVP.

**Guardrail operativo**

HAPI conserva despliegue, configuración, health checks y troubleshooting propios.

## 2. Frontera de base de datos y ownership

**Decisión retenida**

- la DB actual soporta el producto
- la DB HAPI soporta el repositorio FHIR
- no se mezclan modelos internos

**Guardrail operativo**

Se acepta duplicación controlada de datos a cambio de claridad, rollback simple y separación de responsabilidades.

## 3. Estrategia de transferencia de datos

**Decisión retenida**

- ETL one-way
- cargas repetibles
- comportamiento idempotente
- capacidad de reset y recarga

**Guardrail operativo**

El orden de carga, las claves estables y la reconciliación básica siguen siendo parte del contrato implícito de la baseline.

## 4. Control del alcance de recursos

**Decisión retenida**

Subset inicial limitado a:

- `Patient`
- `Practitioner`
- `Encounter`
- `Condition`
- `MedicationRequest`
- `AllergyIntolerance`

**Guardrail operativo**

Todo recurso fuera de ese subset sigue fuera de la baseline salvo nueva decisión explícita.

## 5. Control del alcance de interacciones

**Decisión retenida**

- `read`
- `search`
- respuestas en `Bundle`

**Guardrail operativo**

No se abre escritura FHIR generalizada en la baseline publicada.

## 6. Fidelidad de la representación clínica

**Decisión retenida**

- `Encounter` es el recurso ancla de la consulta
- el contenido clínico mantiene trazabilidad al origen actual
- el SOAP puede apoyarse en representación transitoria documentada

**Guardrail operativo**

Se prioriza consistencia y trazabilidad sobre una modelización clínica más ambiciosa.

## 7. Estrategia de IDs y estabilidad referencial

**Decisión retenida**

- claves de origen estables
- correspondencia reproducible entre origen y recursos FHIR
- referencias deterministas entre recursos

**Guardrail operativo**

La baseline depende de esa estabilidad para ETL, reconciliación y navegación de referencias.

## 8. Línea base de seguridad

**Decisión retenida**

- acceso restringido
- `AuthorizationInterceptor`
- exposición controlada, preferiblemente interna/local

**Guardrail operativo**

No se admite un endpoint FHIR abierto aunque el alcance funcional sea limitado.

## 9. Trazabilidad de auditoría y cumplimiento

**Decisión retenida**

- línea base de auditoría desde el inicio
- BALP o equivalente para accesos y operaciones relevantes

**Guardrail operativo**

La ausencia de auditoría no se considera una simplificación válida para este dominio sanitario.

## 10. Validación y terminología

**Decisión retenida**

- `RepositoryValidatingInterceptor`
- validación estructural y de perfiles básicos
- terminología mínima para el subset inicial

**Guardrail operativo**

La baseline no necesita el stack terminológico final, pero sí validación suficiente para no degradar calidad clínica.

## 11. Disciplina de actualización y migración

**Decisión retenida**

- versionado explícito
- política de upgrade documentada
- migraciones HAPI tratadas como parte normal de la plataforma

**Guardrail operativo**

No debe ampliarse esta capacidad sin dejar claro cómo se verifican upgrades y cambios de plataforma.

## 12. Verificación retenida de la baseline

La baseline queda coherente mientras mantenga, sin ampliar alcance:

1. HAPI estable sobre PostgreSQL.
2. `/fhir/metadata` coherente con el subset acordado.
3. ETL repetible.
4. recursos legibles y buscables con referencias consistentes.
5. línea base de seguridad, auditoría y validación.