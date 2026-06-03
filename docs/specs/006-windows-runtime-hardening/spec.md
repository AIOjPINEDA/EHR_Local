# Endurecimiento del arranque nativo Windows, recetas PDF, backup local y limpieza del repo

**Feature Branch**: `006-windows-runtime-hardening`
**Created**: 2026-05-30
**Status**: Implemented (all 6 phases) — macOS-verified; Windows GTK/PDF one-click pending operator checklist
**Last Updated**: 2026-05-30

## Propósito

Dejar ConsultaMed operable de forma fiable en el PC Windows del centro de salud mediante el arranque nativo one-click ya existente, cerrando el hueco que hace fallar la generación de recetas PDF, reduciendo la fricción de instalación inicial, protegiendo los datos clínicos ante fallo de disco, y limpiando el repositorio de complejidad que no participa en el flujo clínico real.

La meta no es contenerizar todo ni endurecer toda la seguridad posible, sino que la herramienta vuelva a estar lista para trabajar: que arranque con un clic, genere recetas, tenga copia de seguridad, y que el repositorio activo refleje solo lo que el centro usa.

## Contexto

- El runtime objetivo del centro es **arranque nativo one-click** (`scripts/windows/start-consultamed.bat`): backend (uvicorn) y frontend (npm) nativos, PostgreSQL en Docker. No se conteneriza la aplicación.
- El tooling ya está centralizado en `scripts/repo-tool.mjs` (orquestador Node multiplataforma); los `.sh` son wrappers finos que delegan en él.
- La aplicación funciona end-to-end en macOS (verificado: 111 tests, `mypy`/`ruff` limpios, login 200, `/health` 200, WeasyPrint renderiza PDF nativo).
- El módulo `backend/app/fhir/` y el sidecar `sidecars/hapi-fhir/` existen solo para interoperabilidad FHIR futura; **el flujo clínico (pacientes · consultas · recetas) no los usa** y el one-click no los arranca.

## Decisión directriz

Mientras el despliegue local en un único PC Windows sea la ruta operativa prioritaria:

1. El runtime soportado es nativo one-click con Docker solo para PostgreSQL.
2. La generación de recetas PDF (WeasyPrint) debe funcionar por el camino one-click, no solo por el playbook manual.
3. El repositorio activo contiene solo lo que participa en el flujo clínico u operativo real; la interoperabilidad FHIR se archiva como contexto, no se mantiene en el runtime activo.
4. Los datos clínicos deben tener copia de seguridad local automática fuera del volumen Docker.

## Principios de ejecución

1. Construir sobre el trabajo nativo del agente de Windows, no reemplazarlo.
2. Centralizar la lógica en `repo-tool.mjs`; `.bat`/`.ps1` quedan como envoltorios finos.
3. Crear con evidencia, no por anticipación (Code Economy de `AGENTS.md`): no abstraer sin 3+ usos con divergencia real.
4. Archivar/eliminar es reversible vía git; toda retirada queda documentada.
5. Cada fase termina con `./scripts/test_gate.sh` en verde.
6. No introducir un segundo modo de despliegue (contenedores) en paralelo al nativo.

## Topología operativa asumida

- **Un solo PC Windows compartido** por los 2 médicos (por turnos), acceso por `localhost`. Sin red LAN, sin HTTPS, sin multi-instancia. (Confirmado con el usuario.)

## Alcance

### Incluido

**A — Recetas PDF en el one-click (arreglo crítico)**
- Detección del runtime GTK3 en Windows (override `CONSULTAMED_GTK_BIN` → ruta estándar `C:\Program Files\GTK3-Runtime Win64\bin` → ya en PATH). No-op en macOS/Linux.
- Comando `repo-tool start-backend` que resuelve Python e inyecta el bin de GTK al PATH del proceso uvicorn.
- Guard fail-fast: verificar que WeasyPrint importa/renderiza antes de servir; si falla por GTK, mensaje claro con instrucción de instalación.
- `start-consultamed.bat` arranca el backend vía `repo-tool start-backend` en lugar de invocar uvicorn directamente.

**B — Bootstrap de un comando**
- Comando `repo-tool bootstrap` (+ `scripts/bootstrap.bat` para doble clic), idempotente:
  - Verifica Python 3.11 / Node 20 / Docker.
  - Crea `backend/.venv` + `pip install -r requirements.txt` si falta.
  - `npm install` si falta `node_modules`.
  - Copia `backend/.env` y `frontend/.env.local` desde ejemplos si faltan.
  - Windows: comprueba VC++ redist (greenlet) y GTK3; si faltan, `winget install` cuando exista paquete, si no instrucción + URL exactas.
- Sustituye el playbook manual de "primera vez".

**C — Backup local automático**
- Comando `repo-tool backup`: `docker exec consultamed-db pg_dump` → fichero comprimido con timestamp en `CONSULTAMED_BACKUP_DIR` (por defecto fuera del volumen Docker). Rotación: conservar los últimos 14 dumps (configurable vía `CONSULTAMED_BACKUP_KEEP`; ~2 semanas de copias diarias).
- Comando `repo-tool restore <fichero>` para el round-trip.
- `scripts/register-backup-task.bat`: registra Tarea Programada diaria en Windows.
- Documentar nota BitLocker (cifrado en reposo, LOPD/GDPR).

**D — Smoke check post-arranque**
- Comando `repo-tool smoke`: `GET /health` (espera 200) **y** render de un PDF real por WeasyPrint (verifica que GTK quedó cableado). Salida ✅/❌ legible.
- `start-consultamed.bat` ejecuta `repo-tool smoke` antes de abrir el navegador.

**E — Limpieza y archivado**
- Archivar a `.archive/` (local, no en git) + `git rm`, como unidad autocontenida:
  - `sidecars/hapi-fhir/`
  - `backend/app/fhir/` (base_mapping, clinical_mapping, etl)
  - `scripts/{start,stop}-hapi-sidecar.sh`, `scripts/load-hapi-clinical-subset.sh`, `backend/scripts/load_hapi_clinical_subset.py`
  - Tests asociados: `test_hapi_clinical_etl.py`, `test_hapi_sidecar_bootstrap.py`, `test_hapi_public_surface.py`, `test_fhir_base_mapping.py`, `tests/integration/test_hapi_sidecar_deployment.py`
- Eliminar histórico no soportado: `scripts/smoke_phase1.sh`, `scripts/smoke_step13_clinical.sh`, `supabase/config.toml`, `backend/.env.supabase.example`.
- Actualizar referencias en `README.md` y `docs/release/DEPLOYMENT_GUIDE.md`.

**F — Modularización frontend (4 ficheros > 550 líneas)**
- `frontend/src/lib/hooks/use-encounter-form.ts` (719): separar estado / validación / submit.
- `frontend/src/app/settings/templates/page.tsx` (615): extraer subcomponentes de plantilla.
- `frontend/src/app/patients/[id]/page.tsx` (594): extraer secciones a componentes.
- `frontend/src/app/encounters/[id]/page.tsx` (329): extraer secciones a componentes.
- Sin cambio de comportamiento; cada unidad con propósito único y testeable.

**G — Documentación al estado real**
- `AGENTS.md`, `docs/architecture/overview.md`, `README.md`, `docs/playbooks/windows-local-manual-run.md` reflejan: runtime nativo one-click, sin sidecar activo, recetas PDF cableadas, bootstrap/backup/smoke.

### Fuera de alcance

- Contenerización de backend/frontend.
- Nube, sincronización entre máquinas, HTTPS, despliegue en LAN.
- Backups incrementales / WAL / PITR.
- Sustituir WeasyPrint por otro motor PDF.
- Rediseño funcional del dominio clínico.
- Endurecimiento de seguridad para producción (JWT prod, RLS E2E) — se mapea a issues, no bloquea esta secuencia.

## Hallazgos que originan el trabajo

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| F-A | El one-click no añade GTK al PATH; la receta PDF da 500 en el camino real | `start-consultamed.bat:55` lanza uvicorn sin PATH GTK; el playbook manual sí lo añade (`windows-local-manual-run.md:41`) |
| F-B | "Primera vez" es un playbook manual de ~6 pasos, propenso a error | `windows-local-manual-run.md` §1.1 |
| F-C | Datos clínicos en un solo disco sin backup = punto único de fallo | `docker-compose.yml` volumen `postgres_data`; sin tarea de dump |
| F-D | Sin verificación post-arranque: un 500 de receta aparece a mitad de consulta | No existe paso de smoke en el `.bat` |
| F-E | `backend/app/fhir/` + sidecar no participan en el flujo clínico | 0 imports desde `api/`/`services/`/`main.py`; router sin rutas FHIR; `.bat` sin referencias |
| F-F | Histórico no soportado ocupa el repo activo | `supabase/config.toml`, `.env.supabase.example`, `smoke_phase1/step13.sh` marcados históricos |
| F-G | 4 ficheros frontend > 550 líneas dificultan mantenimiento | `wc -l` sobre `frontend/src` |

## Riesgos y mitigaciones

- **Retirar ~970 líneas de tests al archivar el sidecar** (roza "Never remove existing tests" de `AGENTS.md`). Mitigación: los tests se mueven **junto con el código que cubren** a `.archive/`; no se pierde cobertura de código vivo; queda documentado aquí y en el commit. No es borrado, es archivado reversible.
- **Contradicción con spec 005** (declara el sidecar HAPI como runtime soportado). Mitigación: este spec supera ese punto concreto; marcar en 005 que el sidecar pasa a archivado por 006.
- **Validación real de GTK/PDF solo es posible en Windows.** Mitigación: en macOS se valida que WeasyPrint renderiza y que el guard/detección no rompen; se entrega checklist de verificación Windows. El guard fail-fast convierte un fallo silencioso en error visible.
- **Modularización sin cambio de comportamiento puede introducir regresiones.** Mitigación: dividir con tests verdes antes y después; no tocar lógica, solo estructura.

## Criterios de aceptación

1. `./scripts/test_gate.sh` en verde tras cada fase (con el subconjunto de tests de código vivo).
2. `repo-tool start-backend` arranca el backend con GTK en PATH en Windows; en macOS/Linux es no-op funcional.
3. `repo-tool smoke` devuelve ✅ para `/health` y para render PDF; devuelve ❌ legible si GTK falta.
4. `repo-tool bootstrap` deja el entorno listo desde cero de forma idempotente (repetible sin romper).
5. `repo-tool backup` produce un dump restaurable; `repo-tool restore` lo recupera (round-trip verificado).
6. El repo activo no contiene `sidecars/`, `backend/app/fhir/`, scripts HAPI, smoke legacy ni restos Supabase; siguen recuperables vía git/`.archive/`.
7. Ningún fichero frontend objetivo supera ~300 líneas tras modularizar; comportamiento idéntico.
8. `AGENTS.md`, `overview.md`, `README.md`, playbook Windows describen el estado implementado, sin mención del sidecar como activo.
9. El flujo clínico end-to-end (login → paciente → consulta SOAP → receta PDF) funciona por el camino one-click.

## Orden de ejecución (fases)

| Fase | Contenido | Razón del orden |
|------|-----------|-----------------|
| 1 | E — Limpieza y archivado | Reduce ruido y superficie antes de tocar runtime |
| 2 | A — PDF/GTK + `start-backend` | Arreglo crítico del flujo clínico |
| 3 | B — Bootstrap un comando | Reduce fricción de instalación |
| 4 | C + D — Backup + smoke | Protección de datos y verificación |
| 5 | F — Modularización frontend | Calidad de código, aislada |
| 6 | G — Documentación | Cerrar deriva al estado real |

Cada fase: implementar → `test_gate.sh` verde → commit semántico.

## Trazabilidad de issues

Se derivarán issues por fase tras la aprobación del plan. Algunas issues abiertas existentes quedan cubiertas o relacionadas:

| Finding | Issue relacionada | Nota |
|---------|-------------------|------|
| F-A/F-D | (nueva) | Recetas PDF + smoke en one-click |
| F-E/F-F | #34, #35 (FHIR/HAPI duplicación) | Quedan obsoletas al archivar el sidecar |
| F-G | warning de drift en dead-code guards | Se resuelve con docs al estado real |
