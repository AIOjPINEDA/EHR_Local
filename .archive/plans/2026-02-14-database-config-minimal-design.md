# Minimal Database Config Design (MVP)

**Date:** 2026-02-14  
**Status:** Proposed  
**Branch:** `chore-db-config-single-database-url`

## Context

Current backend settings support multiple database selectors (`DATABASE_MODE`, `LOCAL_DATABASE_URL`, `SUPABASE_DATABASE_URL`, `RENDER_DATABASE_URL`) plus `DATABASE_URL` override.  
This works, but introduces avoidable complexity and documentation drift for an MVP that is still evaluating infrastructure.

## Goals

1. Keep runtime configuration minimal and predictable.
2. Make local vs Supabase switching explicit but simple.
3. Reduce maintenance overhead in code, tests, and docs.
4. Preserve current operational flexibility during MVP.

## Non-Goals

1. No schema/migration strategy changes.
2. No auth model changes.
3. No RLS rollout in this change.

## Options Evaluated

### Option 1: Keep current dual-mode resolver

- Keep `DATABASE_MODE` and mode-specific URLs in `backend/app/config.py`.
- Keep current docs and tests with small cleanup.

Pros:
- No runtime behavior change.
- Lowest short-term risk.

Cons:
- Multiple sources of truth remain.
- Higher cognitive load and operator error risk.
- More code paths to test and document.

### Option 2 (Recommended): Single source of truth = `DATABASE_URL`

- Runtime backend config depends only on `DATABASE_URL`.
- Keep local/Supabase choice outside code through environment profile files.
- Use docs and optional shell copy commands to switch profiles.

Pros:
- Minimal code and minimal runtime branching.
- Clear operational model: one variable decides database target.
- Easier to maintain while infra is temporary/iterative.

Cons:
- Requires updating docs/tests currently tied to `DATABASE_MODE`.
- Requires disciplined `.env` management.

### Option 3: Provider abstraction layer (strategy classes)

- Build explicit DB provider abstraction in config/services.

Pros:
- Extendable if many providers are expected.

Cons:
- YAGNI for MVP.
- More moving parts than needed.

## Recommended Design

Adopt **Option 2**:

1. Simplify `backend/app/config.py`:
   - Remove `DATABASE_MODE`, `LOCAL_DATABASE_URL`, `SUPABASE_DATABASE_URL`, `RENDER_DATABASE_URL`.
   - Keep `DATABASE_URL` as required runtime variable.
   - Keep async URL normalization helper (`postgresql://` -> `postgresql+asyncpg://`).
2. Keep infra scripts unchanged:
   - `scripts/setup-local-db.sh` still provisions local PostgreSQL and migrations.
3. Add environment profile examples:
   - `backend/.env.local.example`
   - `backend/.env.supabase.example`
4. Update active docs to describe profile-based switching with one effective runtime variable.

## Operator Workflow After Change

Local PostgreSQL:

1. Run `./scripts/setup-local-db.sh`
2. Set `DATABASE_URL` in `backend/.env` to local PG URL
3. Start backend

Supabase:

1. Set `DATABASE_URL` in `backend/.env` to Supabase URL
2. Start backend

## Risks and Mitigations

1. Risk: Missing `DATABASE_URL` causes startup failure.
   - Mitigation: required setting + explicit docs + `.env.example` defaults.
2. Risk: Drift in old docs/tests.
   - Mitigation: update all active references and keep config guard tests aligned.

## Acceptance Criteria

1. Backend loads with only `DATABASE_URL`.
2. Local and Supabase can both be selected by changing only `DATABASE_URL` profile.
3. No remaining active-doc instructions depend on `DATABASE_MODE`.
4. Unit tests for config behavior pass.
