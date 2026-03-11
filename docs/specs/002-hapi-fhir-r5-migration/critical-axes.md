# Ejes Criticos: Base HAPI FHIR Para ConsultaMed

## Proposito

Dejar explicitados los ejes que pueden romper la coherencia de la iniciativa si no se respetan durante la futura implementacion.

## 1. Topologia Y Aislamiento Operativo

**Decision**

- FastAPI mantiene la logica operativa del producto
- HAPI se introduce como capacidad interoperable separada
- el fallo de HAPI no debe bloquear la operacion diaria del MVP

**Consecuencia para la implementacion**

HAPI debe tener despliegue, configuracion, health checks y troubleshooting propios.

## 2. Frontera De Base De Datos Y Ownership

**Decision**

- la DB actual soporta el producto
- la DB HAPI soporta el repositorio FHIR
- no se mezclan modelos internos

**Consecuencia para la implementacion**

Se acepta duplicacion controlada de datos a corto plazo a cambio de claridad y rollback simple.

## 3. Estrategia De Transferencia De Datos

**Decision**

- ETL one-way
- cargas repetibles
- comportamiento idempotente
- capacidad de reset y recarga

**Consecuencia para la implementacion**

Hay que cerrar orden de carga, claves estables y reconciliacion basica antes del loader.

## 4. Control Del Alcance De Recursos

**Decision**

Subset inicial limitado a:

- `Patient`
- `Practitioner`
- `Encounter`
- `Condition`
- `MedicationRequest`
- `AllergyIntolerance`

**Consecuencia para la implementacion**

Todo recurso fuera de ese subset queda fuera de la primera ola salvo nueva decision explicita.

## 5. Control Del Alcance De Interacciones

**Decision**

- `read`
- `search`
- respuestas en `Bundle`

**Consecuencia para la implementacion**

No se abre escritura FHIR generalizada en la primera iteracion.

## 6. Fidelidad De La Representacion Clinica

**Decision**

- `Encounter` es el recurso ancla de la consulta
- el contenido clinico se mapea con trazabilidad al origen actual
- el SOAP puede usar representacion transitoria documentada si no existe encaje limpio inmediato

**Consecuencia para la implementacion**

Se prioriza consistencia y trazabilidad sobre una modelizacion excesivamente ambiciosa en la primera ola.

## 7. Estrategia De IDs Y Estabilidad Referencial

**Decision**

- claves de origen estables
- correspondencia reproducible entre origen y recursos FHIR
- referencias deterministas entre recursos

**Consecuencia para la implementacion**

La estrategia de IDs debe quedar cerrada antes del ETL.

## 8. Linea Base De Seguridad

**Decision**

- acceso restringido
- `AuthorizationInterceptor`
- exposicion controlada, preferiblemente interna

**Consecuencia para la implementacion**

No se admite un endpoint FHIR abierto aunque el alcance sea limitado.

## 9. Trazabilidad De Auditoria Y Cumplimiento

**Decision**

- linea base de auditoria desde el inicio
- BALP o equivalente para accesos y operaciones relevantes

**Consecuencia para la implementacion**

La ausencia de auditoria no se considera una simplificacion valida.

## 10. Validacion Y Terminologia

**Decision**

- `RepositoryValidatingInterceptor`
- validacion estructural y de perfiles basicos
- terminologia minima para el subset inicial

**Consecuencia para la implementacion**

La primera iteracion no necesita el stack terminologico final, pero si validacion suficiente para no degradar calidad clinica.

## 11. Disciplina De Actualizacion Y Migracion

**Decision**

- versionado explicito
- politica de upgrade documentada
- migraciones HAPI tratadas como parte normal de la plataforma

**Consecuencia para la implementacion**

No debe desplegarse la base HAPI sin dejar claro como se verificaran upgrades futuros.

## 12. Verificacion De La Primera Iteracion

La primera iteracion sera correcta si logra, sin ampliar el alcance:

1. HAPI estable sobre PostgreSQL.
2. `/fhir/metadata` coherente con el subset acordado.
3. ETL inicial repetible.
4. recursos legibles y buscables con referencias consistentes.
5. linea base de seguridad, auditoria y validacion.