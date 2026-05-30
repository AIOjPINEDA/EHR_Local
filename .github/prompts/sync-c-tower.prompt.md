---
agent: agent
description: "Sync agéntico personal (control-tower). Alinea un repo existente con la versión vigente del playbook agentic-repo-bootstrap.md. Distinto de /init-c-tower (que bootstrappea desde cero)."
---

# /sync-c-tower — sync de metodología sobre repo existente

Eres un agente de ingeniería autónomo. Tu tarea es **alinear este repositorio con la versión vigente del playbook `control-tower`**, aplicando solo el delta entre la versión con la que fue inicializado y la versión actual. No re-bootstrappeas — el AGENTS.md ya existe y tiene customizaciones propias que debes preservar.

## Fuente de verdad (siempre vigente)

El playbook y el changelog se actualizan periódicamente. **No uses una copia local**:
lee siempre la versión publicada antes de actuar.

- Playbook canónico (raw, branch `main`): `https://raw.githubusercontent.com/AIOjPINEDA/control-tower/main/playbooks/agentic-repo-bootstrap.md`
- Changelog canónico (raw, branch `main`): `https://raw.githubusercontent.com/AIOjPINEDA/control-tower/main/CHANGELOG.md`
- Repo de referencia: `https://github.com/AIOjPINEDA/control-tower`

Si tu entorno no permite acceso de red, pide al usuario que pegue ambos contenidos
o usa `curl`/`gh api` desde la terminal.

---

## Fase 1 — Audit (solo lectura, no tocas nada)

1. **Fetch del playbook y changelog vigentes** desde las URLs canónicas. Extrae
   `Version` y `Ultima revision` del bloque `## Versionado` del playbook. Extrae
   la última versión de metodología del primer encabezado `## [X.Y.Z]` del changelog.
   Muestra ambos valores al usuario.
2. **Detecta la versión base del repo** — en este orden:
   - Busca en `git log --oneline` un commit con mensaje que incluya `playbook v` (ej: `playbook v3.7.0`).
   - Si no aparece: lee el `AGENTS.md` actual y compara su estructura contra las core areas del playbook.
   - Fallback: pregunta al usuario cuál fue la última versión del playbook aplicada.
3. **Extrae el delta de versiones**: usa `CHANGELOG.md` como fuente de cronología.
   El bloque `## Versionado` del playbook solo contiene metadata vigente, no el
   histórico de cambios. Lee las entradas del changelog desde la versión base hasta
   la vigente y filtra los cambios que afecten al repo destino: playbook, prompts,
   template `AGENTS.md`, settings, shims, estructura y política de specs.
4. **Gap analysis** — para cada cambio del delta, verifica si ya está aplicado en el repo:
   - ¿Faltan core areas en `AGENTS.md`? (ej: el playbook vigente tiene 8, ¿el repo las tiene todas?)
   - ¿Hay settings deprecados que el playbook marca como eliminados?
   - ¿La heurística de longitud del `AGENTS.md` está por encima del target actual (≤200 líneas)?
   - ¿Los shims (`CLAUDE.md`, `copilot-instructions.md`, etc.) siguen el patrón DRY o duplican contenido de `AGENTS.md`?
5. **Presenta el gap report** al usuario antes de continuar:

```
## Sync report — repo: <nombre>
- Playbook version (repo): vX.Y.Z
- Playbook version (vigente): vA.B.C
- Control Tower version (vigente): vM.N.P
- Gaps detectados:
  □ [vX.Y.Z] <descripción del gap>  — Prioridad: alta / media / baja
  □ ...
- Sin gaps: <lista de áreas ya alineadas>
```

---

## Fase 2 — Propose (diálogo con el humano)

6. Para cada gap, pregunta: **¿aplicar / saltar / diferir como issue?**
   - "Aplicar": el agente lo implementa en esta sesión.
   - "Saltar": se omite sin registrar.
   - "Diferir como issue": el agente crea un issue en el repo con el template `templates/issue-agent.md` del control-tower.
7. Para gaps que requieren información del repo (ej: integrar "Code economy" necesita saber la **fase actual** del proyecto), pregunta antes de generar:
   > "Para integrar la sección Code economy necesito la fase actual del repo (`foundation` / `growth` / `scale` o regulado). Esto determina los umbrales de call sites y deadlines."
8. Presenta un **plan consolidado de cambios** y espera confirmación explícita antes de pasar a la Fase 3.

---

## Fase 3 — Apply (un commit por gap)

9. Aplica cada gap aprobado en un **commit aislado**. No agrupes todos en uno — si el usuario quiere revertir un cambio concreto, el commit individual lo permite sin deshacer el resto.
10. Formato de cada commit:
    ```
    feat(agents-md): <descripción del gap aplicado> [playbook vA.B.C]

    Aplicado por /sync-c-tower contra control-tower vM.N.P / playbook vA.B.C.
    Gap origen: <qué faltaba y por qué importa>
    ```
11. Al integrar la sección **Code economy** (si aplica):
    - Añade la sección después de `## Code style` y antes de `## Git workflow`.
    - Adapta los umbrales según la fase confirmada en Fase 2.
    - Conserva las customizaciones existentes del `AGENTS.md` — no sobreescribas secciones no relacionadas.
12. **Verificación post-apply**:
    - El `AGENTS.md` sigue siendo coherente (no hay secciones duplicadas ni contradictorias).
    - La longitud no supera el target del playbook vigente.
    - Los shims (`CLAUDE.md`, `copilot-instructions.md`) siguen apuntando a `AGENTS.md`, no duplicando.

---

## Restricciones

- **Nunca** reescribas el `AGENTS.md` completo — solo añade o modifica las secciones con gap identificado.
- **Nunca** borres customizaciones propias del repo que no tengan correspondencia con un deprecado del playbook.
- **DRY**: si el gap implica añadir contenido ya presente en otro fichero del repo, consolida en `AGENTS.md` y convierte el otro en shim.
- **No** apliques nada sin confirmación explícita en Fase 2.
- **No** sustituyas tu criterio por el del playbook: si hay ambigüedad, pregunta.

## Verificación final

- [ ] Versión del playbook y del Control Tower usadas quedan registradas en los mensajes de commit.
- [ ] Todos los gaps aprobados aplicados; los diferidos tienen issue creado.
- [ ] `AGENTS.md` tiene las core areas del playbook vigente (o gap declarado explícitamente como diferido).
- [ ] Longitud de `AGENTS.md` dentro del target del playbook vigente.
- [ ] Shims coherentes con patrón DRY.
