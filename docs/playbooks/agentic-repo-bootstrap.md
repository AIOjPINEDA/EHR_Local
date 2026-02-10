# Guia Reutilizable: Infraestructura Inicial Moderna (Agent-First)

## Objetivo

Framework base minimalista para cualquier repo: consistente para humanos y agentes, simple en fase inicial, escalable sin romper lo existente, basado en fuentes oficiales y verificables.

Aplica a trading, salud/FHIR, data y otros dominios.

## Criterio de curacion

| Decision | Detalle |
|----------|---------|
| **Se adopta** | Marco de 6 capas, boundaries explicitos (Always/Ask first/Never), checklist de bootstrap verificable, ciclo de trabajo agentico como feedback-loop, invariantes agnosticos de stack con perfiles concretos, config IDE como capa operativa |
| **Se ajusta** | Solo fuentes oficiales en guia base; `specs/` separada de arquitectura; archivos agent-specific opcionales; conceptos de SDD sin dependencia de CLI externo; tooling como perfil; config IDE-specific en apendice |
| **Se descarta** | Claims sin fuente primaria, estructura anticipada, toolkits prescriptivos, asumir stack o IDE especifico en invariantes universales |

---

## Marco mental (6 capas)

| # | Capa | Que resuelve | Artefacto |
|---|------|--------------|-----------|
| 0 | **Principios gobernantes** | Non-negotiables del proyecto (compliance, quality gates, constraints) | Seccion dedicada en `AGENTS.md` |
| 1 | **Direccion** | Problema, fase y limites del agente | `AGENTS.md` |
| 2 | **Arquitectura** | Estado real del sistema hoy, no aspiracional | `docs/architecture/overview.md` |
| 3 | **Contrato de cambio** | In/out por iteracion | `specs/*.md` |
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
│   └── architecture/overview.md        # capa 2
├── specs/                              # capa 3
│   └── 001-foundation.md
└── <test-dir>/                         # tests/ | __tests__/ | *_test.go
    └── <smoke-test>
```

| Archivo | Proposito |
|---------|-----------|
| `AGENTS.md` | Contrato operativo canonico: principios, rol, commands, boundaries, security |
| `docs/architecture/overview.md` | Estado real del sistema, nunca aspiracional |
| `specs/*.md` | Scope de iteracion (ver formato unico vs bundle mas abajo) |
| `<tooling-manifest>` | Config unificada de lint, format, tests y types del stack activo |
| `.github/workflows/ci.yml` | Checks automaticos push/PR |
| `<smoke-test>` | Red minima contra regresiones |
| `<ide-config>/` | *(opcional)* Config compartida de IDE: settings de proyecto + extensiones |
| `.github/copilot-instructions.md` | *(opcional)* Instrucciones custom para Copilot |
| `.github/agents/*.agent.md` | *(opcional)* Agentes custom con tools/instrucciones especializadas |
| `CLAUDE.md` / `.claude/rules/` | *(opcional)* Memoria y reglas modulares para Claude Code |

---

## Ciclo de trabajo agentico (feedback-loop)

Inspirado en Spec-Driven Development pero adaptado como patron ligero, sin dependencia de CLI externo.

```text
     ┌──────────────────────────────────────┐
     │                                      │
     ▼                                      │
  CLARIFY ──► PLAN ──► TASKS ──► IMPLEMENT ──► ANALYZE
     │                              │              │
     └──── feedback loop ◄──────────┘              │
                                                   │
     si hay deriva documental o tecnica ◄──────────┘
```

| Fase | Que hacer | Pregunta clave |
|------|-----------|----------------|
| **Clarify** | Validar ambiguedades antes de planificar. Preguntar lo que no esta claro | ¿Entiendo exactamente que se pide y por que? |
| **Plan** | Separar *que/por que* (funcional) del *como* (tecnico) | ¿Puedo explicar la solucion sin mencionar tecnologias? |
| **Tasks** | Descomponer en unidades implementables y testeables en aislamiento | ¿Cada tarea es verificable de forma independiente? |
| **Implement** | Ejecutar incrementalmente. Test antes de codigo cuando sea posible | ¿Pasa el gate local (`<lint> + <type-check> + <tests>`)? |
| **Analyze** | Validar consistencia cross-artifact post-implementacion | ¿La arquitectura documentada sigue reflejando la realidad? |

> **Principio**: el ciclo busca acelerar feedback-loops, no perfeccionar specs waterfall. Si la implementacion revela que la spec estaba incompleta, actualizar la spec es parte del flujo, no una excepcion.

---

## Contenido de AGENTS.md (7 core areas)

Basado en analisis de [2,500+ repos](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) + concepto de constitution de [Spec-Kit](https://github.com/github/spec-kit):

1. [ ] **Principios gobernantes** *(capa 0)* - non-negotiables: compliance, quality gates, constraints tecnicos
2. [ ] **Commands** - con flags completos (`pytest -v --tb=short`, no solo `pytest`)
3. [ ] **Testing** - que correr antes de commit, criterios de aceptacion
4. [ ] **Project structure** - descripcion de directorios clave y su proposito
5. [ ] **Code style** - ejemplo de codigo real (snippet), no solo descripcion
6. [ ] **Git workflow** - branches, commit messages, proceso de PR
7. [ ] **Boundaries** - ✅ Always / ⚠️ Ask first / 🚫 Never (incluir security de terminal)

> **Tip**: Un snippet real vale mas que tres parrafos. Un boundary explicito previene mas errores que una regla generica.

### Ejemplo de principios gobernantes (capa 0, perfil Python)
```markdown
## Principios (non-negotiable)
- Python 3.11+, tipado estricto con mypy          # adaptar al stack activo
- Cobertura de tests >= 80% en codigo critico
- Zero secrets en logs o stdout
- No dependencias externas sin aprobacion explicita
- [dominio-especifico] FHIR R4 conformance / HIPAA / GDPR segun aplique
```

### Ejemplo de code style
```python
# ✅ Good - descriptive, typed, documented
async def fetch_user_by_id(user_id: str) -> User:
    """Fetch user from database by ID.

    Args:
        user_id: Unique identifier of the user.

    Raises:
        ValueError: If user_id is empty.
    """
    if not user_id:
        raise ValueError("User ID required")
    return await db.users.get(user_id)

# ❌ Bad - vague, untyped, no docs
async def get(x):
    return await db.get(x)
```

### Ejemplo de boundaries con security
```markdown
## Boundaries
- ✅ **Always**: correr gate local antes de commit, escribir tests, usar tipos
- ⚠️ **Ask first**: agregar dependencias, cambiar schema de BD, modificar CI
- 🚫 **Never**: commitear secrets, ejecutar comandos destructivos sin aprobacion,
  auto-aprobar ejecucion de scripts de terceros, hacer requests de red sin consentimiento

## Terminal auto-approve policy
- Bajo riesgo: auto-approve minimo (solo comandos read-only conocidos)
- Medio riesgo: allowlist estrecha + denylist explicita de destructivos
- Regulado/critico: sin auto-approve, revision humana obligatoria
- NUNCA auto-aprobar por rutas completas de scripts (`/path/to/scripts/*`)
```

---

## Formato de specs (unico vs bundle)

### Default: spec unica (recomendado para la mayoria de casos)
```text
specs/
├── 001-foundation.md
└── 002-feature-x.md
```
Un archivo por iteracion con: problema, scope (in/out), criterios de aceptacion, decisiones tecnicas.

### Escalado: spec bundle (para proyectos complejos o regulados)
```text
specs/
└── 001-feature-x/
    ├── spec.md       # Que y por que (funcional, agnostico de tech)
    ├── plan.md       # Como (stack, arquitectura, componentes)
    └── tasks.md      # Unidades implementables y testeables
```

**Cuando escalar**: exploracion multi-stack, equipos con roles separados (PM → spec, architect → plan), specs estables con arquitectura evolutiva, dominios regulados donde la trazabilidad importa.

**Estrategia de mantenimiento**: elegir por repo si las specs se mantienen actualizadas (*spec-anchored*) o si solo representan el intent inicial (*spec-first*). Declarar la politica en `AGENTS.md`.

---

## Checklist de bootstrap (30-60 min)

1. Definir fase actual (`foundation`, `growth`, `scale`).
2. Crear `AGENTS.md` cubriendo las 7 core areas (incluyendo principios gobernantes).
3. Documentar arquitectura real en `docs/architecture/overview.md`.
4. Crear una spec minima de la iteracion en `specs/`.
5. Configurar tooling manifest del stack con lint + format + types + tests (ver perfiles abajo).
6. Agregar smoke test minimo.
7. Configurar `ci.yml` con gate: `<lint> && <type-check> && <tests>`.
8. *(Opcional)* Definir 1-2 invariantes de arquitectura y validarlos con tests ligeros.
9. *(Opcional)* Programar revision periodica de deriva (mensual/trimestral).

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

1) Lee primero:
   - AGENTS.md (incluyendo principios gobernantes)
   - docs/architecture/overview.md
   - specs activas

2) Aplica el ciclo agentico:
   - Clarify: valida ambiguedades antes de proponer
   - Plan: separa que/por que del como
   - Tasks: descompone en unidades verificables

3) Propone solo MVP escalable:
   - que agregas ahora y que dejas fuera
   - tradeoffs y riesgos
   - guardrails ahora vs fases posteriores

4) Entrega:
   - plan por fases con diff por archivo
   - checks para validar (local + CI)
   - links oficiales consultados
```

---

## Politica de actualizacion continua

- **Cadencia**: mensual o cuando cambie una fase.
- **Regla**: priorizar fuentes oficiales; secundarias solo como contexto.
- **Salida**: que sigue vigente, que quedo deprecado, ajuste propuesto, nivel de guardrails.
- **Volatilidad de herramientas**: los frameworks agenticos (Spec-Kit, agents.md spec, etc.) iteran a alta velocidad. Si se referencia un toolkit externo: pinear la version usada, mantener overrides locales separados de templates vendored, y usar diff/merge en vez de overwrite al actualizar.

---

## Registro de links oficiales (evergreen)

### Multi-agente / repositorio
- AGENTS.md spec: https://agents.md/
- AGENTS.md reference repo: https://github.com/openai/agents.md
- GitHub blog (2,500+ repos): https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

### Instrucciones AI y agentes custom
- VS Code custom instructions: https://code.visualstudio.com/docs/copilot/customization/custom-instructions
- VS Code custom agents: https://code.visualstudio.com/docs/copilot/customization/custom-agents
- Copilot settings reference: https://code.visualstudio.com/docs/copilot/reference/copilot-settings
- Copilot repo instructions (GitHub): https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- Copilot custom agents (GitHub, multi-IDE): https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents
- Claude Code memory: https://docs.claude.com/en/docs/claude-code/memory

### Spec-Driven Development (workflow avanzado)
- GitHub Spec-Kit *(experimental, alta velocidad de iteracion)*: https://github.com/github/spec-kit
- SDD methodology: https://github.com/github/spec-kit/blob/main/spec-driven.md

### Tooling por stack

**Python**:
- Packaging + `pyproject.toml`: https://packaging.python.org/en/latest/tutorials/packaging-projects/
- Ruff docs: https://docs.astral.sh/ruff/
- Pytest docs: https://docs.pytest.org/en/stable/

**Node / TypeScript**:
- ESLint docs: https://eslint.org/docs/latest/
- Prettier docs: https://prettier.io/docs/en/
- Vitest docs: https://vitest.dev/guide/
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/

---

## Apendice A: Aplicacion al dominio salud (FHIR)

Si creas un repo de historia clinica electronica:
1. Activar capa 0 con principios de compliance (HIPAA, FHIR R4, zero PHI en logs).
2. Usar formato bundle en specs para trazabilidad regulatoria.
3. Agregar tests de contrato FHIR (schema + perfiles).
4. Definir security boundaries estrictos en AGENTS.md (no auto-approve, no network requests sin consentimiento).

**Links**: [FHIR R5](https://hl7.org/fhir/r5) · [FHIR R4](https://hl7.org/fhir/r4) · [FHIR overview](https://www.hl7.org/fhir/overview.html) · [SMART on FHIR](https://docs.smarthealthit.org/)

---

## Apendice B: Config VS Code / Copilot

Settings de workspace recomendados para repos agent-first con VS Code o IDEs compatibles (Antigravity, Cursor, etc.).

> **Nota de portabilidad**: no todos los forks de VS Code soportan todas las keys Copilot. Usar `.vscode/` como baseline pero verificar compatibilidad en cada IDE.

### settings.json minimal y seguro
```jsonc
{
  // --- Instrucciones AI ---
  "chat.useAgentsMdFile": true,
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,

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
| `github.copilot.chat.codeGeneration.useInstructionFiles` | Usar `.github/copilot-instructions.md` | `true` | estable |
| `chat.promptFilesLocations` | Rutas a prompt files reutilizables | `{ ".github/prompts": true }` | ⚠️ version-dependent |
| `chat.agentFilesLocations` | Rutas a custom agents | `{ ".github/agents": true }` | ⚠️ version-dependent |
| `chat.tools.terminal.autoApprove` | Auto-aprobar comandos de terminal | `false` | estable (formato variable) |

> **Formato de autoApprove**: en versiones recientes de VS Code, `chat.tools.terminal.autoApprove` puede ser `boolean` (on/off global) u `object` con allowlist/denylist por comando. Verificar docs de la version instalada.

> **Advertencia drift**: Copilot puede escribir preferencias personales en `settings.json` del workspace ([#8555](https://github.com/microsoft/vscode-copilot-release/issues/8555)). Revisar diffs de `.vscode/` en PRs.

---

## Versionado

- **Version**: 3.5.1
- **Ultima revision**: 2026-02-10
- **Criterio**: minimalista, verificable, escalable, agnostico
- **Cambios en v3.5.1**:
  - Gate estandarizado a `<lint> + <type-check> + <tests>` en todos los bloques
  - Ejemplo de principios gobernantes etiquetado como perfil Python
  - Settings de Copilot con columna de estabilidad (estable/experimental/version-dependent)
  - Nota de formato variable para `autoApprove`
- **Cambios en v3.5**:
  - Config IDE de workspace como seccion agnostica (invariantes workspace vs user)
  - Apendice B: VS Code/Copilot settings concretos (fuera del core)
  - Security boundaries reforzados con terminal auto-approve policies
  - Estructura actualizada con `.github/agents/`, `.github/instructions/`, `<ide-config>/`
  - Links reorganizados: nueva subseccion instrucciones AI y agentes custom
  - Revision completa de coherencia y orden del documento
- **Cambios en v3.4**:
  - Tooling desacoplado de Python: invariantes agnosticos + perfiles por stack (Python, Node/TS)
  - Estructura minima usa placeholders de stack (`<tooling-manifest>`, `<test-dir>`)
  - Checklist y gates usan `<lint> && <type-check> && <tests>` en vez de tools hardcodeadas
  - Links evergreen ampliados con tooling de Node/TS
  - CI template muestra ambos perfiles como alternativas
- **Cambios en v3.3**:
  - Marco mental ampliado a 6 capas (nueva capa 0: principios gobernantes)
  - Ciclo de trabajo agentico (clarify → plan → tasks → implement → analyze)
  - Formato de specs escalable (unico vs bundle)
  - Security boundaries para ejecucion de terminal/scripts
  - Politica de volatilidad para herramientas de alta iteracion
  - Documento reestructurado y compactado (~40% menos lineas vs v3.0)
  - Referencia a Spec-Kit como concepto, sin dependencia de toolkit
