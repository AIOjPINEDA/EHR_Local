# PR Test Checklist

Use this checklist for every functional change.

## 1) Scope

- [ ] I identified which layer changed (`backend unit`, `backend contract`, `frontend contract/smoke`).
- [ ] I added tests only for changed behavior (no unrelated test growth).

## 2) Backend

- [ ] Unit tests added/updated under `backend/tests/unit/` when logic changed.
- [ ] Contract tests added/updated under `backend/tests/contracts/` when API schema changed.
- [ ] Test module includes marker (`unit`, `contract`, or `integration`).

## 3) Frontend

- [ ] `frontend/scripts/contracts-smoke.mjs` updated when route contract changed.
- [ ] If backend schema changed: run `npm run generate:types` in frontend.
- [ ] `./scripts/verify-schema-hash.sh` passes (no schema drift).

## 4) Local Verification

- [ ] I ran `./scripts/test_gate.sh`.
- [ ] I resolved failures before commit.

## 5) Quality

- [ ] No skipped tests without explicit reason.
- [ ] Regression fixes include a test that would fail before the fix.
