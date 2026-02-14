# Specs Folder Policy

This folder is the canonical location for new active specs in this repository.

## Policy

- Write new specs under `docs/specs/`.
- Keep historical and archived material in local-only `.archive/` (not versioned in git).
- Do not move legacy specs unless there is a specific migration task.

## Naming

- Single-file mode: `docs/specs/00X-feature-name.md`
- Bundle mode: `docs/specs/00X-feature-name/spec.md` (+ optional `plan.md`, `tasks.md`)

## Source of Truth

When conflicts appear, follow this precedence:

1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`
