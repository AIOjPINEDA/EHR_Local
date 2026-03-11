# Mapeo histórico de issues: baseline HAPI FHIR R5

## Propósito

Conservar la trazabilidad entre este bundle y las GitHub Issues que se sembraron a partir de él.

No es backlog activo ni tablero de ejecución.

## Regla de uso

- usar este archivo solo como referencia histórica
- consultar GitHub Issues para estado, prioridad y cierre administrativo
- no mantener este archivo como seguimiento vivo de ejecución

## Mapeo retenido

| Issue | Workstream histórico | Qué conserva este bundle |
|---|---|---|
| `#18` | bootstrap del sidecar HAPI | topología sidecar, starter oficial, arranque y operación mínima |
| `#19` | PostgreSQL dedicada y persistencia HAPI | frontera de DB, dialecto y lifecycle de persistencia |
| `#20` | estrategia determinista de IDs y mapping base | trazabilidad reproducible para `Patient` y `Practitioner` |
| `#21` | ETL repetible del subset clínico inicial | carga idempotente, orden de carga y consistencia referencial |
| `#22` | superficie FHIR de lectura y búsqueda | `CapabilityStatement`, `read`, `search` y `Bundle` |
| `#23` | línea base de seguridad, auditoría y validación | acceso restringido, validación estructural y auditoría sanitizada |

## Nota de gobernanza

Si el estado abierto/cerrado de esas issues no coincide con el relato histórico de este bundle, la fuente de verdad para ejecución sigue siendo GitHub Issues. La corrección de ese desfase debe hacerse allí, no reinterpretando este archivo como backlog vivo.