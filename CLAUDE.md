# CLAUDE.md

This shim intentionally defers to `AGENTS.md`. If anything here conflicts with `AGENTS.md`, follow `AGENTS.md`.

## Read First

1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`

## Repo Snapshot

- FastAPI remains the operational source of truth for writes, auth, and business logic.
- Runtime is native one-click on Windows (`scripts/windows/start-consultamed.bat`), Docker only for PostgreSQL. `scripts/repo-tool.mjs` orchestrates bootstrap, start-backend, backup/restore, smoke, and the gate.
- The HAPI FHIR R5 sidecar and `app/fhir/{clinical_mapping,etl}.py` were archived to local `.archive/fhir-interop/` by spec 006 (not used by the clinical flow). `app/fhir/base_mapping.py` stays live (imported by patient/practitioner models).
- GitHub Issues are the only active execution backlog. Specs keep change scope, decisions, and historical context; they are not status boards.
- `./scripts/test_gate.sh` is the pre-commit target and is green as of spec 006. If it turns red, report the exact failing step instead of assuming pre-existing debt.

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
