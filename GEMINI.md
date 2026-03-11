# ConsultaMed - Gemini Context

This project uses a centralized agent contract for consistent AI collaboration.

## Primary Reference

👉 **See [AGENTS.md](./AGENTS.md)** for all rules, commands, constraints, and project context.

This repo uses a spec-anchored brownfield workflow.

## Quick Context

- **Project**: Electronic Health Record (EHR) for private medical practices in Spain
- **Phase**: MVP Complete, pending production deployment
- **Stack**: FastAPI (Python 3.11+) + Next.js 14 (TypeScript) + PostgreSQL/Supabase
- **Domain**: Healthcare with FHIR R5 alignment

## Workflow Summary

- `AGENTS.md`: operational rules and repository-wide constraints
- `docs/architecture/overview.md`: implemented architecture only
- `docs/specs/`: proposed changes and phased plans
- GitHub Issues: only active execution backlog

Execution cycle: `Clarify → Plan → Tasks → Implement → Analyze`

Use the lightest artifact that fits the change:

- Small or low-risk changes: work directly from the issue if clear
- Medium-risk changes: add `spec.md`
- Large or multi-phase changes: use `spec.md` + `plan.md`
- `tasks.md` is optional and temporary

## Boundaries Summary

### Always
- Run tests before committing
- Use `backend/.venv` as the canonical local Python environment for backend workflows
- Use type hints and strict mode
- Follow FHIR naming for data models

### Ask First
- Adding dependencies
- Modifying schema/RLS policies
- Creating new API endpoints

### Never
- Bypass authentication
- Modify security validators without approval
- Log PII (patient data)

Do not use legacy planning notes as a second backlog or as architecture truth.

## Related Files

- [AGENTS.md](./AGENTS.md) - Canonical agent contract
- [CLAUDE.md](./CLAUDE.md) - Claude Code shim
- [docs/architecture/overview.md](./docs/architecture/overview.md) - System architecture
