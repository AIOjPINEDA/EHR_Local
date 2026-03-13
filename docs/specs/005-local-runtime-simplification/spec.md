# Simplificación del runtime local y retirada de complejidad Supabase

**Feature Branch**: `005-local-runtime-simplification`
**Created**: 2026-03-13
**Status**: Active direction applied
**Last Updated**: 2026-03-13

## Propósito

Reencuadrar ConsultaMed como proyecto `local-first` para el ciclo MVP actual, retirando soporte activo y complejidad documental/técnica asociada a Supabase cuando no aporte valor operativo real.

La meta no es endurecer toda la seguridad posible ni ampliar arquitectura cloud, sino dejar una base local más simple, coherente y operable sobre la que seguir construyendo producto.

## Decisión directriz

Mientras el despliegue local sea la ruta operativa prioritaria:

1. el runtime soportado por defecto será PostgreSQL local + FastAPI + Next.js + sidecar HAPI local;
2. Supabase deja de considerarse ruta activa recomendada;
3. toda referencia a Supabase debe pasar de "camino soportado" a una de estas categorías:
   - eliminar,
   - desactivar,
   - marcar como histórica.

## Principios de ejecución

1. Priorizar simplicidad operativa sobre opcionalidad no usada.
2. Reducir deriva técnica y documentación engañosa antes de introducir nuevas capacidades.
3. No mantener dos modos de despliegue equivalentes si solo uno es real y operativo.
4. Si un componente cloud sigue existiendo temporalmente, debe tener un plan explícito de extracción o neutralización.
5. La seguridad se mapeará en issues, pero solo bloqueará la secuencia actual cuando afecte al runtime local o a la base operativa del proyecto.

## Alcance

### Incluido

- limpieza de documentación que presenta Supabase como camino activo
- reencuadre de specs e issues para eliminar backlog ya no alineado
- desacoplar el bootstrap local de nomenclatura/estructura Supabase cuando sea viable
- definición de un único camino operativo recomendado para DB local
- orden de ejecución para minimizar riesgo y complejidad

### Fuera de alcance

- rediseño funcional del dominio clínico
- despliegue cloud alternativo nuevo
- migración a otro proveedor gestionado en esta fase
- hardening exhaustivo no necesario para operar la base local actual

## Estado actual relevante

Tras `#28`, el bootstrap local ya quedó desacoplado de Supabase:

- `scripts/setup-local-db.sh` usa `database/migrations` como fuente SQL neutral del runtime local;
- `supabase/` ya no sostiene el bootstrap operativo y queda solo como artefacto histórico fuera del camino activo.

La limpieza posterior debe centrarse en retirar referencias que todavía puedan sugerir un camino soportado alternativo.

## Objetivo técnico

Al final de esta iniciativa, el repositorio debe reflejar con claridad que:

1. el camino operativo recomendado es local;
2. el esquema SQL local no depende conceptualmente de Supabase;
3. la documentación no promete un runtime cloud que el equipo no quiere seguir soportando;
4. las issues abiertas ya no arrastran trabajo Supabase que quedó fuera de dirección.

## Fases propuestas

### Fase 0: Alineación de backlog y planning

- cerrar o reencuadrar issues centradas en Supabase que ya no aplican;
- dejar una issue nueva de simplificación local-first como paraguas de dirección (`#27`);
- actualizar specs para que no funcionen como backlog paralelo ni contradigan la dirección actual.

### Fase 1: Base operativa local

- completar hardening operativo mínimo que sí afecta al runtime local;
- prioridad inmediata: health check real de DB y estabilidad del gate donde bloquee trabajo diario.

### Fase 2: Desacoplo técnico de Supabase

- mover `supabase/migrations` a una ubicación neutral del proyecto;
- actualizar `scripts/setup-local-db.sh` para usar `database/migrations`;
- dejar de tratar el SQL del proyecto como si dependiera de Supabase CLI.

Estado: implementado en esta workspace el 2026-03-13 mediante `#28`.

### Fase 3: Limpieza documental y de artefactos

- retirar ejemplos `.env.supabase` y referencias equivalentes si dejan de tener valor;
- eliminar secciones Supabase de README y deployment docs cuando el desacoplo técnico esté hecho;
- revisar diagramas y documentación activa para que solo describan el estado implementado soportado.

## Impacto esperado

### Beneficios

- menos modos operativos y menos ambigüedad
- menos documentación falsa o incompleta
- menor coste cognitivo para nuevos agentes o desarrolladores
- mejor modularidad al separar bootstrap SQL local de vendor-specific tooling
- menor deriva técnica en backlog y en archivos de entorno

### Riesgos

- mover las migraciones sin cuidado puede romper el setup local
- parte de la documentación release/compliance puede conservar referencias históricas que deban revalidarse tras el desacoplo
- algunas issues de seguridad centradas en Supabase dejarán de ser aplicables y habrá que cerrarlas con trazabilidad

## Issues que deben revalidarse bajo esta dirección

- issue de RLS Supabase: probablemente fuera de alcance si ya no habrá exposición vía Supabase/PostgREST
- issue de rotación de credenciales Supabase: fuera de alcance si el entorno deja de usarse
- modernización de versiones cloud específicas: pospuesta o descartada hasta nueva decisión estratégica

Estado aplicado el 2026-03-13:

- `#15` cerrada por quedar fuera de dirección (`RLS Supabase`)
- `#17` cerrada por quedar fuera de dirección (`rotación de credenciales Supabase`)
- `#27` abierta como issue paraguas `local-first`
- `#28` implementada en esta workspace para desacoplar el bootstrap local de `supabase/migrations`
- `#29` abierta para mapear la sustitución de `python-jose`
- `#30` abierta para mapear el riesgo de PHI en logs SQL

## Criterios de aceptación sugeridos

1. Existe una issue paraguas de simplificación local-first.
2. Las issues abiertas ya no empujan trabajo de Supabase fuera de dirección.
3. El bootstrap local sigue funcionando tras cualquier cambio de rutas SQL.
4. La documentación activa deja claro que el camino recomendado es local.
5. Las specs activas no actúan como backlog paralelo a GitHub Issues.

## Plan de ejecución propuesto

1. Ejecutar `#27` como marco de simplificación y triage de documentación/backlog.
2. Resolver `#16` health check real, porque mejora la operativa local inmediatamente.
3. Revaluar y, si sigue bloqueando el trabajo diario, ejecutar `#24` para limpiar el gate.
4. Tomar `#28` como base ya implementada para el desacoplo de `supabase/migrations`.
5. Limpiar `.env`, docs activas y deployment docs de referencias Supabase que ya no aporten valor operativo.
6. Mantener `#29` y `#30` mapeadas; ejecutarlas cuando toque hardening del runtime local sin perder foco operativo.

## Referencias verificadas en repo

- `scripts/setup-local-db.sh`
- `database/migrations/`
- `supabase/config.toml`
- `README.md`
- `docs/release/DEPLOYMENT_GUIDE.md`
- `docs/architecture/overview.md`
- `docs/specs/003-refactor-plan/spec.md`
- `docs/specs/004-infrastructure-version-modernization/spec.md`
