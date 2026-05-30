# Plan de implementación — 006 Windows runtime hardening

## Goal

Dejar ConsultaMed operable y fiable en el PC Windows del centro vía arranque nativo one-click: recetas PDF funcionando por el camino real, instalación de un comando, backup local automático, verificación post-arranque, repositorio limpio de lo que no participa en el flujo clínico, y frontend modularizado. Cada fase deja `./scripts/test_gate.sh` en verde.

## Context

- **Spec**: [docs/specs/006-windows-runtime-hardening/spec.md](./spec.md)
- **Rama**: `006-windows-runtime-hardening` (ya creada; el spec ya está commiteado en `a68a219`).
- **Runtime objetivo**: nativo one-click ([scripts/windows/start-consultamed.bat](../../../scripts/windows/start-consultamed.bat)); Docker solo para PostgreSQL. Un único PC Windows compartido.
- **Orquestador**: [scripts/repo-tool.mjs](../../../scripts/repo-tool.mjs) — registro de comandos en el objeto `COMMANDS` (~línea 429); patrón: una función `commandXxx()` por comando, registrada en `COMMANDS`, despachada en `main()`. Helpers existentes reutilizables: `resolvePython()`, `run()`, `capture()`, `probe()`, `fail()`, `readIntegerEnv()`, `resolveComposeArgs()`, `IS_WINDOWS`, `REPO_ROOT`, `BACKEND_DIR`, `FRONTEND_DIR`.
- **PDF**: [backend/app/services/pdf_service.py](../../../backend/app/services/pdf_service.py) usa `weasyprint.HTML().write_pdf()`. El endpoint es `GET /api/v1/prescriptions/{encounter_id}/pdf`.
- **Tests**: backend con pytest (`tests/unit`, `tests/contracts`); patrón async con `httpx.AsyncClient` + `ASGITransport` (ver `backend/tests/unit/test_health_check.py`). Frontend: `npm run lint`/`type-check`/`test`.
- **`.archive/`** ya está en `.gitignore` (línea 57). Archivar = `git mv` lógico: copiar a `.archive/` + `git rm`.
- **Verificación Windows real** (GTK/PDF one-click): solo posible en la máquina Windows; este plan deja la base validada en macOS y un checklist Windows al final.
- **Tooling**: backend Python 3.11 en `backend/.venv`; Node para repo-tool; Docker para `consultamed-db`.

## Convenciones para el ejecutor

- Trabaja siempre en la rama `006-windows-runtime-hardening`.
- Tras cada fase: `./scripts/test_gate.sh` debe pasar, luego commit semántico (`feat:`/`refactor:`/`chore:`/`docs:`).
- No abstraer sin 3+ usos con divergencia real (Code Economy de AGENTS.md).
- Comentarios de código en inglés; mensajes/CLI de cara al operador en español (coherente con el repo).
- No registrar PII en logs/stdout.

---

## Fase 1 — Limpieza y archivado

Reduce superficie antes de tocar runtime. Todo lo archivado es recuperable vía git/`.archive/`.

### Step 1.1: Archivar el módulo de interoperabilidad FHIR/HAPI

**What:** Mover, como unidad autocontenida, el sidecar y el módulo FHIR (no usados por el flujo clínico) a `.archive/fhir-interop/`, preservando su estructura relativa, y eliminarlos del árbol versionado.

**Where:**
- `sidecars/hapi-fhir/` → `.archive/fhir-interop/sidecars/hapi-fhir/`
- `backend/app/fhir/` → `.archive/fhir-interop/backend/app/fhir/`
- `scripts/start-hapi-sidecar.sh`, `scripts/stop-hapi-sidecar.sh`, `scripts/load-hapi-clinical-subset.sh` → `.archive/fhir-interop/scripts/`
- `backend/scripts/load_hapi_clinical_subset.py` → `.archive/fhir-interop/backend/scripts/`
- Tests: `backend/tests/unit/test_hapi_clinical_etl.py`, `test_hapi_sidecar_bootstrap.py`, `test_hapi_public_surface.py`, `test_fhir_base_mapping.py`, `backend/tests/integration/test_hapi_sidecar_deployment.py` → `.archive/fhir-interop/backend/tests/...`
- Escribir `.archive/fhir-interop/README.md` explicando qué es, por qué se archivó (spec 006), y cómo restaurarlo (`git log -- backend/app/fhir`).

**Verify:**
- `grep -rn "from app.fhir\|import.*app.fhir" backend/app` → sin resultados.
- `grep -rn "app.fhir\|hapi" backend/tests` → sin resultados.
- `cd backend && .venv/bin/python -c "from app.main import app; print(len(app.routes))"` → imprime un número (la app carga sin el módulo fhir).
- `cd backend && .venv/bin/python -m pytest tests/unit tests/contracts -q` → todo verde, conteo reducido (~108 → ~963 menos los archivados; debe pasar sin errores de import).

### Step 1.2: Eliminar artefactos históricos no soportados

**What:** Borrar del repo los restos marcados como históricos/no soportados.

**Where:**
- `git rm scripts/smoke_phase1.sh scripts/smoke_step13_clinical.sh`
- `git rm supabase/config.toml backend/.env.supabase.example`
- Si `supabase/` queda solo con `.gitignore`, evaluar `git rm -r supabase/`.
- Actualizar referencias: en `README.md` y `docs/release/DEPLOYMENT_GUIDE.md`, quitar/ajustar las menciones a `smoke_phase1`/`smoke_step13` (sustituir por `repo-tool smoke`, que se crea en Fase 4) y a Supabase.

**Verify:**
- `grep -rn "smoke_phase1\|smoke_step13\|env.supabase\|supabase/config" . --include='*.md' --include='*.sh' --include='*.mjs' | grep -v .archive` → sin resultados (o solo referencias intencionales en specs históricos).
- `ls scripts/smoke_*.sh` → no existe.

### Step 1.3: Cerrar dead-code guards y gate

**What:** Asegurar que el guardrail de arquitectura no referencia rutas archivadas y que el gate completo pasa.

**Where:** `backend/tests/unit/test_architecture_dead_code_guards.py` (verificar que no asume `app/fhir`); ajustar solo si algún assert lo referencia.

**Verify:**
- `cd backend && .venv/bin/python -m pytest tests/unit/test_architecture_dead_code_guards.py -v` → verde.
- `./scripts/test_gate.sh` → "Test gate passed." Commit: `chore: archive unused HAPI FHIR sidecar and historical Supabase/smoke artifacts`.

---

## Fase 2 — Recetas PDF en el one-click (arreglo crítico)

### Step 2.1: Helper de detección de GTK en repo-tool

**What:** Añadir a [scripts/repo-tool.mjs](../../../scripts/repo-tool.mjs) una función `resolveGtkBin()` que devuelva el directorio bin de GTK3 a anteponer al PATH, o `null`:
1. `process.env.CONSULTAMED_GTK_BIN` si está definido y existe.
2. En Windows: `C:\Program Files\GTK3-Runtime Win64\bin` si existe.
3. `null` en macOS/Linux (WeasyPrint resuelve libs por sistema/brew) o si no se encuentra.

**Where:** `scripts/repo-tool.mjs`, junto a los demás helpers (antes de `COMMANDS`).

**Verify:** `node -e "import('./scripts/repo-tool.mjs')"` no es viable (ejecuta main); en su lugar añadir verificación en el siguiente step vía el comando.

### Step 2.2: Comando `start-backend` con inyección de PATH y guard

**What:** Añadir `commandStartBackend()` y registrarlo en `COMMANDS` como `"start-backend"`. Debe:
1. Resolver Python con `resolvePython([])`.
2. Calcular el PATH del proceso hijo: si `resolveGtkBin()` devuelve ruta, anteponerla a `process.env.PATH` (separador `;` en Windows, `:` en otros).
3. **Guard fail-fast**: ejecutar `python -c "import weasyprint; weasyprint.HTML(string='<p>ok</p>').write_pdf()"` con ese PATH. Si falla, `fail()` con mensaje claro en español: que falta el runtime GTK3 y cómo instalarlo (`CONSULTAMED_GTK_BIN` o instalar GTK3-Runtime Win64).
4. Lanzar `python -m uvicorn app.main:app --port 8000` (sin `--reload` en producción local; aceptar flag `--reload` si se pasa) con ese PATH y `cwd: BACKEND_DIR`.

**Where:** `scripts/repo-tool.mjs`.

**Verify (macOS):**
- `node scripts/repo-tool.mjs start-backend` arranca uvicorn; `curl -s localhost:8000/health` → `{"status":"healthy"}` (con DB levantada) o 503 legible (sin DB). El guard NO debe abortar en macOS (WeasyPrint resuelve sin GTK explícito). Parar con Ctrl-C.
- Forzar fallo simulado: `CONSULTAMED_GTK_BIN=/ruta/inexistente node scripts/repo-tool.mjs start-backend` → si la ruta no existe, `resolveGtkBin` la ignora (no rompe). (El fallo real de GTK solo se reproduce en Windows.)

### Step 2.3: Cablear `start-consultamed.bat` al nuevo comando

**What:** En [scripts/windows/start-consultamed.bat:55](../../../scripts/windows/start-consultamed.bat), sustituir el lanzamiento directo de uvicorn por:
```bat
start "Backend" cmd /k "cd /d ""%ROOT_DIR%"" && node scripts\repo-tool.mjs start-backend --reload"
```
(Mantener el resto del `.bat` igual: verificación Docker, DB, frontend, navegador.)

**Where:** `scripts/windows/start-consultamed.bat`.

**Verify:** Revisión de diff (el arranque real es parte del checklist Windows). `./scripts/test_gate.sh` verde. Commit: `feat(windows): wire prescription PDF (GTK) into one-click backend startup`.

---

## Fase 3 — Bootstrap de un comando

### Step 3.1: Comando `bootstrap` idempotente en repo-tool

**What:** Añadir `commandBootstrap()` registrado como `"bootstrap"`. Idempotente:
1. Verificar Python 3.11 (`resolvePython`), Node, Docker (`probe("docker", ["--version"])`); si falta alguno, `fail()` con instrucción.
2. Si no existe `backend/.venv`, crearlo (`python -m venv .venv`) y `pip install -r requirements.txt`.
3. Si no existe `frontend/node_modules`, `npm install` en `FRONTEND_DIR`.
4. Si no existe `backend/.env`, copiar de `backend/.env.example`. Si no existe `frontend/.env.local`, crear con `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
5. En Windows: comprobar GTK3 (`resolveGtkBin`) y VC++ redist; si faltan, intentar `winget install` cuando el paquete exista, si no imprimir instrucción + URL. En macOS/Linux: no-op de GTK (informar `brew install weasyprint` si WeasyPrint no importa).

**Where:** `scripts/repo-tool.mjs`. Reutilizar helpers; no duplicar la lógica de detección de Python.

**Verify (macOS):**
- En un entorno ya bootstrapeado: `node scripts/repo-tool.mjs bootstrap` → no recrea nada, imprime estado "ya listo" para cada paso, exit 0 (idempotencia).
- `cd backend && .venv/bin/python -m pytest tests/unit -q` sigue verde.

### Step 3.2: Wrapper `bootstrap.bat` y actualización del playbook

**What:** Crear `scripts/bootstrap.bat` (doble clic) que llame `node scripts\repo-tool.mjs bootstrap` con `pause` final. Reescribir `docs/playbooks/windows-local-manual-run.md` §1.1 para que la "primera vez" sea: instalar prerequisitos + `bootstrap.bat`. Conservar el modo manual como sección "avanzado/troubleshooting".

**Where:** `scripts/bootstrap.bat`, `docs/playbooks/windows-local-manual-run.md`.

**Verify:** Revisión de diff; `./scripts/test_gate.sh` verde. Commit: `feat(windows): one-command bootstrap (repo-tool bootstrap + bootstrap.bat)`.

---

## Fase 4 — Backup local + smoke check

### Step 4.1: Comandos `backup` y `restore`

**What:** Añadir `commandBackup()` y `commandRestore()`:
- `backup`: resolver `consultamed-db` vía compose; `docker exec -T consultamed-db pg_dump -U postgres consultamed` → escribir a `${CONSULTAMED_BACKUP_DIR:-<default>}/consultamed-YYYYMMDD-HHMMSS.sql.gz` (comprimir con gzip). Default Windows: `%USERPROFILE%\ConsultaMed-Backups`; macOS/Linux: `~/ConsultaMed-Backups`. Crear el dir si falta. Rotación: conservar `${CONSULTAMED_BACKUP_KEEP:-14}` más recientes, borrar el resto.
- `restore <fichero>`: descomprimir y `docker exec -i consultamed-db psql -U postgres consultamed`. Pedir confirmación o exigir flag `--yes` (sobrescribe datos).

**Where:** `scripts/repo-tool.mjs`.

**Verify (macOS, con `consultamed-db` levantada):**
- `node scripts/repo-tool.mjs backup` → crea `~/ConsultaMed-Backups/consultamed-*.sql.gz` no vacío.
- `node scripts/repo-tool.mjs restore <ese fichero> --yes` → exit 0; `curl localhost:8000/api/v1/...` o consulta a la DB confirma datos intactos (round-trip).
- Ejecutar `backup` 15+ veces (o simular) → solo quedan 14 ficheros.

### Step 4.2: Comando `smoke` post-arranque

**What:** Añadir `commandSmoke()` registrado como `"smoke"`:
1. `GET http://127.0.0.1:8000/health` (reintentos hasta ~30s); esperar 200 `{"status":"healthy"}`. ✅/❌.
2. Render PDF real: `python -c "import weasyprint; weasyprint.HTML(string='<h1>smoke</h1>').write_pdf()"` con PATH GTK (reutilizar `resolveGtkBin`); verificar bytes > 0. ✅/❌.
3. Salida final legible (verde/rojo) y exit code acorde (0 si ambos ✅).

**Where:** `scripts/repo-tool.mjs`.

**Verify (macOS):** `node scripts/repo-tool.mjs smoke` con backend arriba → dos ✅, exit 0. Con backend parado → ❌ en health, exit ≠ 0.

### Step 4.3: Cablear smoke al `.bat` y tarea programada de backup

**What:**
- En `start-consultamed.bat`, antes de abrir el navegador, ejecutar `node scripts\repo-tool.mjs smoke` e imprimir el resultado (no abortar el navegador, pero avisar si ❌).
- Crear `scripts/register-backup-task.bat`: registra Tarea Programada diaria (`schtasks /create`) que ejecuta `node scripts\repo-tool.mjs backup`.
- Documentar en el playbook la nota BitLocker (cifrado en reposo, LOPD/GDPR) y cómo apuntar `CONSULTAMED_BACKUP_DIR` a USB/2º disco.

**Where:** `scripts/windows/start-consultamed.bat`, `scripts/register-backup-task.bat`, `docs/playbooks/windows-local-manual-run.md`.

**Verify:** Revisión de diff; `./scripts/test_gate.sh` verde. Commit: `feat(windows): local pg backup/restore + post-start smoke check`.

---

## Fase 5 — Modularización frontend

Sin cambio de comportamiento. Dividir por responsabilidad; gate verde antes y después de cada fichero.

### Step 5.1: `use-encounter-form.ts` (719 → unidades)

**What:** Separar el hook en piezas con propósito único: estado del formulario, validación, lógica de submit (create/update). Mantener la API pública del hook idéntica para los consumidores.

**Where:** `frontend/src/lib/hooks/use-encounter-form.ts` (+ nuevos ficheros en `frontend/src/lib/hooks/` o `frontend/src/lib/encounters/`).

**Verify:** `cd frontend && npm run type-check && npm run lint && npm test` → verde. Los consumidores del hook compilan sin cambios de firma.

### Step 5.2: `settings/templates/page.tsx` (615)

**What:** Extraer subcomponentes de plantilla a `frontend/src/components/...`; la página queda como composición.

**Verify:** `npm run type-check && npm run lint && npm test` verde; la ruta renderiza igual (revisión visual en el checklist).

### Step 5.3: `patients/[id]/page.tsx` (594) y `encounters/[id]/page.tsx` (329)

**What:** Extraer secciones a componentes presentacionales; las páginas orquestan datos + composición.

**Verify:** `npm run type-check && npm run lint && npm test` verde tras cada fichero.

**Cierre Fase 5:** ningún fichero objetivo supera ~300 líneas. `./scripts/test_gate.sh` verde. Commit por fichero o agrupado: `refactor(frontend): modularize <fichero> without behavior change`.

---

## Fase 6 — Documentación al estado real

### Step 6.1: Actualizar docs canónicos

**What:**
- `docs/architecture/overview.md`: quitar el sidecar HAPI y `app/fhir` del estado activo; reflejar runtime nativo one-click + `repo-tool` (start-backend, bootstrap, backup, smoke).
- `AGENTS.md`: corregir `app/validators/nie.py` → `app/validators/dni.py` (el fichero correcto); retirar/actualizar el aviso de "mypy debt mantiene el gate rojo" (verificado: mypy limpio); quitar el sidecar de la lista de stack activo; resolver el warning de drift de `docs/specs`.
- `README.md`: prerequisitos Windows (incl. GTK3, VC++), flujo bootstrap/start/smoke/backup; quitar referencias a smoke legacy/Supabase.
- `docs/specs/005-local-runtime-simplification/spec.md`: anotar que el sidecar HAPI pasa a archivado por spec 006 (evitar contradicción).

**Where:** los ficheros citados.

**Verify:**
- `cd backend && .venv/bin/python -m pytest tests/unit/test_architecture_dead_code_guards.py -v` → sin warning de drift de docs (o el warning esperado desaparece).
- `grep -rn "nie.py\|sidecar" AGENTS.md` → solo menciones correctas/históricas.
- `./scripts/test_gate.sh` verde. Commit: `docs: align AGENTS/overview/README with native one-click runtime (no active sidecar)`.

---

## Final Verification

1. **Gate completo**: `./scripts/test_gate.sh` → "Test gate passed."
2. **App carga**: `cd backend && .venv/bin/python -c "from app.main import app; print(len(app.routes))"` → número > 0, sin imports de `app.fhir`.
3. **Repo limpio**: `ls sidecars backend/app/fhir scripts/smoke_*.sh supabase/config.toml 2>&1` → no existen; recuperables vía `git log`.
4. **Comandos repo-tool** presentes: `node scripts/repo-tool.mjs` (sin args) lista `start-backend`, `bootstrap`, `backup`, `restore`, `smoke` además de los existentes.
5. **Round-trip backup** verificado en macOS (Step 4.1).
6. **Smoke** verde en macOS con backend arriba (Step 4.2).
7. **Frontend**: ningún fichero objetivo > ~300 líneas; `npm run type-check/lint/test` verde.

### Checklist de verificación en Windows (lo ejecuta el usuario)

> Estos pasos solo se pueden validar en el PC Windows con GTK3 instalado.

- [ ] Doble clic en `scripts/bootstrap.bat` desde cero deja el entorno listo (idempotente al repetir).
- [ ] Doble clic en `start.bat` / `start-consultamed.bat`: arranca Docker, DB, backend, frontend; abre navegador.
- [ ] `repo-tool smoke` muestra ✅ health y ✅ PDF.
- [ ] Login `sara@consultamed.es` / `piloto2026` → dashboard.
- [ ] Flujo clínico: crear paciente → consulta SOAP → **descargar receta PDF** (debe descargar, no dar 500).
- [ ] `repo-tool backup` crea un `.sql.gz` en `CONSULTAMED_BACKUP_DIR`.
- [ ] `register-backup-task.bat` registra la tarea diaria (`schtasks /query` la lista).
- [ ] (Opcional) Simular GTK ausente → el guard de `start-backend` da error claro en español, no un 500 a mitad de consulta.

## Riesgos operativos durante la ejecución

- Archivar arrastra ~970 líneas de tests: se mueven con su código (no se pierde cobertura de código vivo). Documentado en spec §Riesgos.
- La verificación real de GTK/PDF es Windows-only; el guard fail-fast convierte cualquier fallo en error visible en vez de un 500 silencioso.
- Modularización: gate verde antes y después de cada fichero; no tocar lógica, solo estructura.
