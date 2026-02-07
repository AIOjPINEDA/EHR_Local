# ConsultaMed - Gemini Context

This project uses a centralized agent contract for consistent AI collaboration.

## Primary Reference

👉 **See [AGENTS.md](./AGENTS.md)** for all rules, commands, constraints, and project context.

## Quick Context

- **Project**: Electronic Health Record (EHR) for private medical practices in Spain
- **Phase**: MVP Complete, pending production deployment
- **Stack**: FastAPI (Python 3.11+) + Next.js 14 (TypeScript) + PostgreSQL/Supabase
- **Domain**: Healthcare with FHIR R5 alignment

## Boundaries Summary

### Always
- Run tests before committing
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

## Related Files

- [AGENTS.md](./AGENTS.md) - Canonical agent contract
- [CLAUDE.md](./CLAUDE.md) - Claude Code shim
- [docs/architecture/overview.md](./docs/architecture/overview.md) - System architecture
