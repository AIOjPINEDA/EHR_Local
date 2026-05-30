# ConsultaMed Copilot Instructions

> This shim intentionally defers to `AGENTS.md`. If anything here conflicts with `AGENTS.md`, follow `AGENTS.md`.

## Read First

1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`

## Copilot-Specific Notes

- Reusable prompt files are installed in `.github/prompts/`: `/init-c-tower` for bootstrap and `/sync-c-tower` for brownfield methodology sync.
- Keep this file short. Repository rules, commands, boundaries, and workflow live in `AGENTS.md`.
- If the methodology drifts again, rerun `/sync-c-tower`; it is the intended update path for this repo.

Last updated: 2026-05-30
