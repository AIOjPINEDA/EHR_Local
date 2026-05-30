---
agent: agent
description: "Bootstrap agéntico personal (control-tower). Aplica el playbook agentic-repo-bootstrap.md vigente a este repo. Distinto del /init nativo de Claude Code."
---

# /init-c-tower — bootstrap agéntico personal

Eres un agente de ingeniería autónomo. Tu tarea es **bootstrappear este repositorio según la metodología `control-tower`**, usando como fuente de verdad la versión vigente del playbook publicado en GitHub.

## Fuente de verdad (siempre vigente)

El playbook se actualiza periódicamente en el repo `AIOjPINEDA/control-tower`. **No uses una copia local**: lee siempre la versión publicada antes de actuar.

- URL canónica (raw, branch `main`): `https://raw.githubusercontent.com/AIOjPINEDA/control-tower/main/playbooks/agentic-repo-bootstrap.md`
- Repo de referencia: `https://github.com/AIOjPINEDA/control-tower`

## Pasos a ejecutar

1. **Fetch del playbook**: descarga el contenido de la URL canónica anterior. Si tu entorno no permite acceso de red, pide al usuario que lo pegue o pause y pídele permiso para usar `curl`/`wget`/`gh api` desde la terminal.
2. **Identifica la versión**: extrae `Version` y `Ultima revision` del bloque `## Versionado` y muéstralos al usuario antes de continuar.
3. **Detecta el contexto del repo**:
   - ¿Repo vacío / nuevo? → aplica el **Checklist de bootstrap** estándar.
   - ¿Repo existente con código? → aplica la **Variante brownfield** del checklist.
4. **Pregunta antes de generar**: confirma con el usuario fase actual (`foundation` / `growth` / `scale`), stack principal y si quiere artefactos opcionales (specs README, invariantes, custom agents).
5. **Aplica el checklist paso a paso**:
   - Crea / actualiza solo los archivos explícitamente cubiertos por el playbook.
   - No inventes estructura no contemplada (criterio minimalista del playbook).
   - Para cada archivo creado, muestra al usuario qué sección del playbook lo justifica.
6. **Cierre**: resume archivos creados/modificados, pendientes opcionales y siguiente paso recomendado (primera spec / primer issue agéntico).

## Restricciones

- **DRY**: `AGENTS.md` es la fuente única; los shims (`CLAUDE.md`, `copilot-instructions.md`, etc.) deben importar/apuntar, no duplicar.
- **No** fuerces settings de Copilot fuera del baseline del playbook. En particular,
  no añadas `github.copilot.chat.codeGeneration.useInstructionFiles` salvo que el
  repo quiera desactivar explícitamente `.github/copilot-instructions.md`.
- **No** sustituyas el checklist por tu criterio: si el playbook ha cambiado, gana el playbook.
- Pide confirmación explícita antes de: borrar archivos existentes, sobreescribir `AGENTS.md` si ya existe, modificar CI.

## Verificación final

Tras ejecutar:

- [ ] Versión del playbook usada queda registrada en el commit message inicial.
- [ ] Las 6 capas del marco están cubiertas o explícitamente declaradas como diferidas.
- [ ] Existe al menos una spec inicial (`docs/specs/001-foundation.md` o `001-baseline.md` en brownfield).
- [ ] CI gate definido (aunque sea solo `<lint>` en brownfield).
