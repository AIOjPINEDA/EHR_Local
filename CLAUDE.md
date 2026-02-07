# ConsultaMed - Claude Code Context

This project uses a centralized agent contract for consistent AI collaboration.

## Primary Reference

👉 **See [AGENTS.md](./AGENTS.md)** for all rules, commands, constraints, and project context.

## Quick Context

- **Project**: Electronic Health Record (EHR) for private medical practices in Spain
- **Phase**: MVP Complete, pending production deployment
- **Stack**: FastAPI (Python 3.11+) + Next.js 14 (TypeScript) + PostgreSQL/Supabase
- **Domain**: Healthcare with FHIR R5 alignment

## Critical Reminders

1. This is a **healthcare application** - follow all security constraints in AGENTS.md
2. Run tests before committing changes
3. Never bypass authentication or RLS policies
4. Patient data is GDPR/LOPD-GDD protected
