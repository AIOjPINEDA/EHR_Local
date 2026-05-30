# Guia Reutilizable: Infraestructura Inicial Moderna (Agent-First)

## Objetivo

Framework base minimalista para cualquier repo: consistente para humanos y agentes, simple en fase inicial, escalable sin romper lo existente, basado en fuentes oficiales y verificables.

Aplica a trading, salud/FHIR, data y otros dominios.

## Working model recomendado

- `AGENTS.md`: contrato operativo y reglas globales.
- `docs/architecture/overview.md`: arquitectura implementada.
- `docs/specs/` o `specs/`: cambio propuesto y decisiones. Si un repo prefiere `specs/` en raiz, declararlo en `AGENTS.md`.
- GitHub Issues: unico backlog activo. Sin carpeta `plans/` paralela.
- Archivos agent-specific (`copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`): shims breves alineados con `AGENTS.md`, sin inventar gobernanza propia.

> **Tracking ligero**: para repos de 1-3 contributors, Milestones + labels con prefijo (`type:bug/infra/…`, `priority:high/medium/low`) cubren agrupacion y priorizacion sin GitHub Projects. Escalar a Projects solo si hay multiples workstreams concurrentes.

> **ConsultaMed**: usa `docs/specs/`, `docs/architecture/overview.md`, y GitHub Issues + Milestone "MVP Hardening" como backlog activo.

> **Criterio editorial**: solo fuentes oficiales; sin estructura anticipada ni toolkits prescriptivos; no asumir stack o IDE en invariantes universales.

---

## Marco mental (6 capas)

| # | Capa | Que resuelve | Artefacto |
|---|------|--------------|-----------|
| 0 | **Principios gobernantes** | Non-negotiables del proyecto (compliance, quality gates, constraints) | Seccion dedicada en `AGENTS.md` |
| 1 | **Direccion** | Problema, fase y limites del agente | `AGENTS.md` |
| 2 | **Arquitectura** | Estado real del sistema hoy, no aspiracional | `docs/architecture/overview.md` |
| 3 | **Contrato de cambio** | In/out por iteracion | `docs/specs/*` o `specs/*`, segun politica del repo |
| 4 | **Calidad automatica** | Checks minimos recurrentes | `.github/workflows/ci.yml` |
| 5 | **Consistencia de tooling** | Una fuente de verdad para herramientas | Tooling manifest del stack (`pyproject.toml`, `package.json`, `go.mod`, etc.) |

Si falta una capa, aparece friccion operativa. La capa 0 es opcional en repos pequenos pero critica en dominios regulados (salud, finanzas).

---

## Estructura minima + proposito

```text
repo/
├── AGENTS.md                           # capas 0 + 1
├── <tooling-manifest>                  # capa 5 (pyproject.toml | package.json | go.mod)
├── .github/
│   ├── copilot-instructions.md         # opcional (Copilot)
│   ├── instructions/                   # opcional (VS Code .instructions.md)
│   ├── agents/                         # opcional (custom agents)
│   └── workflows/ci.yml               # capa 4
├── .claude/                            # opcional (Claude Code)
│   ├── CLAUDE.md
│   └── rules/*.md
├── <ide-config>/                       # opcional (.vscode/ | .idea/ | etc.)
│   ├── settings.json                   # config compartida del proyecto
│   └── extensions.json                 # extensiones recomendadas
├── docs/
│   ├── architecture/overview.md        # capa 2
│   └── specs/                          # capa 3 (o `specs/` en otros repos)
│       ├── README.md                   # opcional: politica de naming, lifecycle, precedencia
│       └── 001-foundation.md
└── <test-dir>/                         # tests/ | __tests__/ | *_test.go
    └── <smoke-test>
```

| Archivo | Proposito |
|---------|-----------|
| `AGENTS.md` | Contrato operativo canonico: principios, rol, commands, boundaries, security |
| `docs/architecture/overview.md` | Estado real del sistema, nunca aspiracional |
| `docs/specs/README.md` | *(opcional)* Politica de specs: naming, ciclo de vida, precedencia |
| `docs/specs/*` o `specs/*` | Scope de iteracion y decisiones del cambio (ver formato unico vs bundle mas abajo) |
| `<tooling-manifest>` | Config unificada de lint, format, tests y types del stack activo |
| `.github/workflows/ci.yml` | Checks automaticos push/PR |
| `<smoke-test>` | Red minima contra regresiones |
| `<ide-config>/` | *(opcional)* Config compartida de IDE: settings de proyecto + extensiones |
| `.github/copilot-instructions.md` | *(opcional)* Shim breve apuntando a `AGENTS.md` |
| `.github/instructions/*.instructions.md` | *(opcional)* Reglas path-scoped con `applyTo` (solo cuando una regla aplica a un subset claro de archivos) |
| `.github/agents/*.agent.md` | *(opcional)* Agentes custom con tools/instrucciones especializadas |
| `CLAUDE.md` / `.claude/rules/` | *(opcional)* `@AGENTS.md` import + addendums Claude-especificos |
| `GEMINI.md` / equivalentes | *(opcional)* Shim breve para otros agentes, siempre subordinado a `AGENTS.md` |

> **Patron DRY (fuente unica)**: `AGENTS.md` es la fuente de verdad. `CLAUDE.md`, `copilot-instructions.md` y equivalentes deben importar/apuntar a `AGENTS.md` en vez de duplicar reglas. Solo el contenido agent-especifico va fuera de `AGENTS.md`.

---

## Ciclo de trabajo agentico (feedback-loop)

Este playbook usa el ciclo agentico como patron de ejecucion: `CLARIFY → PLAN → TASKS → IMPLEMENT → ANALYZE → CLOSE THE LOOP`. La definicion canonica con preguntas clave y diagrama vive en `METHODOLOGY.md` § Protocolo de ejecucion por agente. No se duplica aqui para evitar drift.

---

## Contenido de AGENTS.md (8 core areas)

Basado en analisis de [2,500+ repos](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) + concepto de constitution de [Spec-Kit](https://github.com/github/spec-kit) + practicas agenticas 2026 ([aipatternbook](https://aipatternbook.com/yagni), [Wix Manifesto](https://medium.com/wix-engineering/the-ai-coding-agent-manifesto-c8f61629d677), [Augment 2026](https://www.augmentcode.com/guides/how-to-build-agents-md)):

1. [ ] **Principios gobernantes** *(capa 0)* - non-negotiables: compliance, quality gates, constraints tecnicos
2. [ ] **Commands** - con flags completos (`pytest -v --tb=short`, no solo `pytest`)
3. [ ] **Testing** - que correr antes de commit, criterios de aceptacion
4. [ ] **Project structure** - descripcion de directorios clave y su proposito
5. [ ] **Code style** - ejemplo de codigo real (snippet), no solo descripcion
6. [ ] **Code economy** - cuando crear, reutilizar y borrar; reglas anti-deriva agentica
7. [ ] **Git workflow** - branches, commit messages, proceso de PR
8. [ ] **Boundaries** - ✅ Always / ⚠️ Ask first / 🚫 Never (incluir security de terminal)

> **Tip**: Un snippet real vale mas que tres parrafos. Un boundary explicito previene mas errores que una regla generica.

> **Longitud**: AGENTS.md se carga en el contexto del agente en cada sesion. Apuntar a ≤200 lineas (research 2026 sobre 2,500+ repos: longitud >150 lineas reduce success rate y aumenta coste de inferencia ~20%). Si crece, buscar duplicacion entre Security/Boundaries/Definition of Done y comprimir tablas a listas inline.

> **Que NO incluir**: principios genericos que el agente ya conoce de su entrenamiento ("write clean code", "follow best practices", DRY/KISS/YAGNI sin contexto). El AGENTS.md aporta solo *non-inferable details* — info que el agente no puede descubrir leyendo el repo. La excepcion es la **Code economy**: alli reformulamos los principios clasicos en su modo de fallo *agentico-especifico* (familiar-shape bias), porque eso si es no-inferible.

### Ejemplos canonicos por core area

Los ejemplos completos (snippets reales por seccion) viven en `templates/agents-md-template.md`. Ese template es la fuente unica que se copia al repo destino — el playbook describe *que* incluye cada area; el template *como*. Mantener una sola fuente evita drift cuando una mejora aplica solo en uno de los dos.

| Core area | Que incluye | Ver ejemplo en template |
|-----------|-------------|-------------------------|
| Principios gobernantes | Non-negotiables: stack, compliance, quality gates, constraints | § Principios gobernantes |
| Commands | Comandos ejecutables con flags completos (`pytest -v --tb=short`, no `pytest`) | § Commands |
| Testing | Que correr antes de commit; criterios de aceptacion | § Commands (gate local) |
| Project structure | Tabla de directorios clave con proposito | § Estructura del proyecto |
| Code style | Snippet real ✅/❌ del estilo esperado en ~10 lineas | § Code style |
| Code economy | Cuando crear/reutilizar/borrar; reglas anti-deriva agentica | § Code economy |
| Git workflow | Branches, commits, proceso de PR | § Git workflow |
| Boundaries | ✅ Always / ⚠️ Ask first / 🚫 Never + terminal auto-approve | § Boundaries + § Terminal auto-approve policy |

---

## Formato de specs (unico vs bundle)

### Default: spec unica (recomendado para la mayoria de casos)
```text
docs/specs/
├── 001-foundation.md
└── 002-feature-x.md
```
Un archivo por iteracion con: problema, scope (in/out), criterios de aceptacion, decisiones tecnicas.

### Escalado: spec bundle (para proyectos complejos o regulados)
```text
docs/specs/
└── 001-feature-x/
    ├── spec.md       # Que y por que (funcional, agnostico de tech)
    ├── plan.md       # Como (stack, arquitectura, componentes)
    └── tasks.md      # Opcional y temporal; evitar usarlo como backlog permanente
```

**Cuando escalar**: exploracion multi-stack, equipos con roles separados (PM → spec, architect → plan), specs estables con arquitectura evolutiva, dominios regulados donde la trazabilidad importa.

**Estrategia de mantenimiento**: elegir por repo si las specs se mantienen actualizadas (*spec-anchored*) o si solo representan el intent inicial (*spec-first*). Declarar la politica en `AGENTS.md`.

### Status recomendados para specs

| Status | Significado |
|--------|-------------|
| `Proposed` | Intent documentado, sin issues ni trabajo activo |
| `Active` | Issues abiertos, trabajo en progreso |
| `Partial (phases 0–N done)` | Ejecucion parcial — hace explicito que queda |
| `Implemented` | Scope cubierto; spec es contexto de decision |
| `Historical reference` | Ya no guia trabajo futuro, retenida por trazabilidad |
| `Superseded by XXX` | Reemplazada por otra spec o direccion |

> **Trazabilidad**: si una spec genera issues, incluir una tabla `| Finding | Issue | Status |` que vincule cada hallazgo con su issue. Mantiene el link spec↔issue explicito sin convertir la spec en backlog.

**Regla practica**: en brownfield, no crear `tasks.md` por defecto. Crear primero la spec y, si hace falta, el plan. Solo derivar `tasks.md` cuando ayude a abrir, revisar o reordenar issues.

---

## Checklist de bootstrap (30-60 min)

0. *(Opcional)* Ejecuta `/init-c-tower` para repos nuevos, o `/sync-c-tower` para repos
   existentes que necesitan alinearse con la versión vigente de este playbook. Ambos son
   comandos de VS Code Copilot — no confundir con el `/init` nativo de Claude Code.
   Ninguno sustituye el checklist; son puntos de partida que lo aplican automáticamente.
1. Definir fase actual (`foundation`, `growth`, `scale`).
2. Crear `AGENTS.md` cubriendo las 8 core areas (incluyendo principios gobernantes).
3. Documentar arquitectura real en `docs/architecture/overview.md`.
4. Crear una spec minima de la iteracion en `docs/specs/` o en el directorio de specs definido por el repo.
5. Configurar tooling manifest del stack con lint + format + types + tests (ver perfiles abajo).
6. Agregar smoke test minimo.
7. Configurar `ci.yml` con gate: `<lint> && <type-check> && <tests>`.
8. *(Opcional)* Definir 1-2 invariantes de arquitectura y validarlos con tests ligeros.
9. *(Opcional)* Programar revision periodica de deriva (mensual/trimestral).

### Variante brownfield (repo existente sin estructura agent-first)

No reescribir: documentar lo que hay y abrir issues para lo que falta.

1. **Auditar capas faltantes** vs el marco de 6 capas (existentes / parciales / ausentes).
2. **`AGENTS.md` minimo** antes de tocar codigo: commands reales, boundaries, code style observado (no aspiracional).
3. **Arquitectura tal cual esta** en `docs/architecture/overview.md`. Si hay deuda, nombrarla.
4. **Spec inicial `001-baseline.md`**: estado actual + scope de la primera iteracion. No specs retroactivas en bulk.
5. **Migrar issues** al template `templates/issue-agent.md` solo cuando se vayan a trabajar.
6. **CI gate progresivo**: empezar por `<lint>`, anadir types y tests al estabilizar.

---

## Configuracion de tooling (invariantes + perfiles)

### Invariantes (agnosticos de stack)

| Invariante | Que garantiza |
|------------|---------------|
| **Una fuente de verdad de tooling** | Un solo manifest configura lint, format, types y tests |
| **Gate local** | `<lint> && <type-check> && <tests>` antes de push |
| **Gate CI** | Mismos checks que local, en push/PR |
| **SHA pinning en CI** | Actions pineadas a SHA completo en repos de riesgo medio-alto; recomendado en bajo riesgo |

### Perfil: Python

| Rol | Herramienta | Manifest |
|-----|-------------|----------|
| Lint + format | Ruff (reemplaza Black + isort + Flake8) | `pyproject.toml` |
| Types | mypy | `pyproject.toml` |
| Tests | pytest | `pyproject.toml` |
| Gate local | `ruff check . && ruff format --check . && mypy . && pytest` | |

```toml
[project]
name = "mi-proyecto"
version = "0.1.0"
requires-python = ">=3.11"

[tool.ruff]
line-length = 88
target-version = "py311"
select = [
    "E",   # pycodestyle errors
    "F",   # pyflakes
    "I",   # isort
    "UP",  # pyupgrade
    "B",   # flake8-bugbear
    "SIM", # flake8-simplify
]
ignore = ["E501"]  # lineas largas (manejadas por formatter)

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
```

### Perfil: Node / TypeScript

| Rol | Herramienta | Manifest |
|-----|-------------|----------|
| Lint | ESLint | `package.json` / `eslint.config.js` |
| Format | Prettier | `.prettierrc` |
| Types | tsc (`--noEmit`) | `tsconfig.json` |
| Tests | Vitest / Jest | `package.json` |
| Gate local | `eslint . && prettier --check . && tsc --noEmit && vitest run` | |

```json
{
  "scripts": {
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "gate": "npm run lint && npm run format:check && npm run typecheck && npm run test"
  }
}
```

### CI (agnostico, con SHA pinning)
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      # Pinear a SHA completo, nunca tag mutable
      - uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29 # v4.1.6

      # --- Perfil Python ---
      - uses: actions/setup-python@0b93645e9fea7318ecaed2b359559ac225c90a2b # v5.3.0
        with:
          python-version: "3.11"
      - run: pip install -e ".[dev]"
      - run: ruff check . && ruff format --check . && mypy . && pytest

      # --- Perfil Node/TS (alternativa, elegir uno) ---
      # - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
      #   with:
      #     node-version: "20"
      # - run: npm ci
      # - run: npm run gate
```

---

## Robustez gradual (sin rigidez)

| Nivel | Cuando aplicar | Que incluye |
|-------|----------------|-------------|
| **1 - Base** | Cualquier repo | AGENTS.md + overview + CI gate local (`<lint> + <type-check> + <tests>`) |
| **2 - Guardrails** | Deuda repetida detectada | 1-3 tests de arquitectura concretos; revisar en cada milestone |
| **3 - Gobernanza** | Repos criticos / equipos grandes | CI dedicado a guardrails; auditorias programadas; Definition of Done por fase |

Principio operativo: la guia recomienda; el repo decide que vuelve obligatorio segun riesgo, dominio y fase.

---

## Prompt reutilizable para agentes

```text
Objetivo: disenar/ajustar infraestructura base sin sobre-ingenieria.

1) Lee AGENTS.md, docs/architecture/overview.md, specs activas.
2) Aplica el ciclo agentico (Clarify → Plan → Tasks → Implement → Analyze → Close the loop).
3) Propone solo MVP escalable: que agregas, que dejas fuera, tradeoffs, guardrails.
4) Entrega: plan por fases con diff, checks (local + CI), links oficiales.
```

---

## Cadencia y fuentes externas

- **Revision**: mensual junto al resto de la metodologia (ver `METHODOLOGY.md` § Cadencias de revision).
- **Volatilidad de herramientas**: los frameworks agenticos (Spec-Kit, agents.md spec, Copilot/Claude/Codex docs) iteran a alta velocidad. Al referenciar un toolkit externo: pinear la version usada, mantener overrides locales separados de templates vendored, y usar diff/merge en vez de overwrite al actualizar.
- **Links oficiales (evergreen)**: la lista canonica vive en `REFERENCES.md` agrupada por proposito (multi-agente, instrucciones AI, SDD, tooling por stack, code economy). No se duplica aqui para evitar drift entre dos fuentes que se revisan a cadencias distintas.

---

## Apendice A: Aplicacion al dominio salud (FHIR)

Si creas un repo de historia clinica electronica:
1. Activar capa 0 con principios de compliance (HIPAA, FHIR R4, zero PHI en logs).
2. Usar formato bundle en specs para trazabilidad regulatoria.
3. Agregar tests de contrato FHIR (schema + perfiles).
4. Definir security boundaries estrictos en AGENTS.md (no auto-approve, no network requests sin consentimiento).

**Links**: [FHIR R5](https://hl7.org/fhir/r5) · [FHIR R4](https://hl7.org/fhir/r4) · [FHIR overview](https://www.hl7.org/fhir/overview.html) · [SMART on FHIR](https://docs.smarthealthit.org/)

---

## Apendice B: Config por agente (settings y hooks)

Settings y hooks recomendados por agente, segun capacidades nativas de la tabla
en `METHODOLOGY.md` § Delegacion a agentes. Los guardrails textuales del template
siguen siendo el unico mecanismo *portable* cross-agente; los hooks nativos de
Claude Code son control *mecanico* complementario (no sustituto), util en repos
trabajados primariamente con Claude.

### Hooks nativos de Claude Code (`.claude/settings.json`)

Hooks que convierten guardrails textuales en controles mecanicos no-saltables.
Solo aplica si el repo usa Claude Code; Copilot/Codex/OpenCode no tienen
equivalente nativo.

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "<gate local del repo, ej: ruff check . && pytest -q>",
            "description": "Antes de cerrar la sesion, fuerza el gate local. Convierte 'no marcar done sin evidencia' (guardrail textual) en control mecanico."
          }
        ]
      }
    ]
  }
}
```

> **Por que solo `Stop` y no `PostToolUse`**: el patron `PostToolUse` (correr
> tests tras cada Edit/Write) genera ruido de output sin aportar control que el
> humano no pueda forzar al cierre. `Stop` aplica el gate una vez, al final,
> donde realmente importa. Mantener el numero de hooks minimo es coherente con
> "tools simples > hiperespecializadas" (Vercel 2026, ver REFERENCES).

### VS Code / Copilot settings (`.vscode/settings.json`)

Settings de workspace recomendados para VS Code o IDEs compatibles (Antigravity,
Cursor, etc.).

> **Nota de portabilidad**: no todos los forks de VS Code soportan todas las keys Copilot. Usar `.vscode/` como baseline pero verificar compatibilidad en cada IDE.

#### settings.json minimal y seguro
```jsonc
{
  // --- Instrucciones AI ---
  "chat.useAgentsMdFile": true,
  // .github/copilot-instructions.md se carga por defecto en VS Code.
  // Si existe, mantenerlo como shim breve hacia AGENTS.md.

  // --- Seguridad de terminal ---
  // Formato: boolean (false/true) o allowlist objeto segun version de VS Code
  "chat.tools.terminal.autoApprove": false,
  "chat.agent.allowedDomains": {},

  // --- Formateo del proyecto (ejemplo TS) ---
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
```

### Que va en workspace vs user settings

| Workspace (commitear) | User settings (NO commitear) |
|-----------------------|-----------------------------|
| `chat.useAgentsMdFile` | `editor.fontSize`, `workbench.colorTheme` |
| `chat.tools.terminal.autoApprove` | `github.copilot.enable` (toggles personales) |
| `editor.defaultFormatter` | `editor.minimap.enabled` |
| `editor.formatOnSave` | `window.zoomLevel` |

### extensions.json
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "github.copilot",
    "github.copilot-chat"
  ]
}
```

### Settings relevantes de Copilot

| Setting | Proposito | Default | Estabilidad |
|---------|-----------|--------|-------------|
| `chat.useAgentsMdFile` | Habilitar lectura de `AGENTS.md` | `true` | estable |
| `chat.useNestedAgentsMdFiles` | AGENTS.md por subdirectorio | depende | ⚠️ experimental |
| `github.copilot.chat.codeGeneration.useInstructionFiles` | Cargar `.github/copilot-instructions.md` cuando existe | `true` | estable; no configurar salvo opt-out explícito |
| `chat.promptFilesLocations` | Rutas workspace para prompt files reutilizables | `{ ".github/prompts": true }` | estable; usar prompts de usuario para disponibilidad global |
| `chat.agentFilesLocations` | Rutas a custom agents | `{ ".github/agents": true }` | ⚠️ version-dependent |
| `chat.tools.terminal.autoApprove` | Auto-aprobar comandos de terminal | `false` | estable (formato variable) |

> **Formato de autoApprove**: en versiones recientes de VS Code, `chat.tools.terminal.autoApprove` puede ser `boolean` (on/off global) u `object` con allowlist/denylist por comando. Verificar docs de la version instalada.

> **Advertencia drift**: Copilot puede escribir preferencias personales en `settings.json` del workspace ([#8555](https://github.com/microsoft/vscode-copilot-release/issues/8555)). Revisar diffs de `.vscode/` en PRs.

---

## Versionado

- **Version**: 3.8.2
- **Ultima revision**: 2026-05-30
- **Criterio**: minimalista, verificable, escalable, agnostico
- **Historia de cambios**: ver `CHANGELOG.md` (fuente unica). El playbook solo
  mantiene aqui metadata vigente para evitar duplicar la cronologia entre dos
  ficheros con cadencias de revision distintas.
