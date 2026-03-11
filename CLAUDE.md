# CLAUDE.md

This shim intentionally defers to `AGENTS.md`. If anything here conflicts with `AGENTS.md`, follow `AGENTS.md`.

## Read First

1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`

## Repo Snapshot

- FastAPI remains the operational source of truth for writes, auth, and business logic.
- The HAPI FHIR R5 sidecar under `sidecars/hapi-fhir/` is an implemented local baseline, not a proposed future track.
- The published/local FHIR surface is intentionally limited to `CapabilityStatement`, `read`, `search`, and search `Bundle` for the approved subset.
- HAPI uses a dedicated local PostgreSQL path; ConsultaMed product migrations do not run against that sidecar database.
- GitHub Issues are the only active execution backlog. Specs keep change scope, decisions, and historical context; they are not status boards.
- `./scripts/test_gate.sh` is still the pre-commit target, but the current repo carries inherited `mypy` debt that can keep the global gate red. Report that precisely instead of claiming it fixed.

## Common Commands

```bash
./scripts/test_gate.sh
cd backend && source .venv/bin/activate && pytest tests/unit tests/contracts -v --tb=short
cd frontend && npm run lint && npm run type-check && npm test
```

## Guardrails

- Use `backend/.venv` as the canonical backend Python environment.
- Do not treat legacy planning docs or spec bundles as a second backlog.
- See `AGENTS.md` for ask-first actions, protected validators, and repository-wide rules.
