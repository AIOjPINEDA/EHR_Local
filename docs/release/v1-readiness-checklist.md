# ConsultaMed V1 - Readiness Checklist

> **Date:** 2026-02-08
> **Version:** V1 Pilot Release
> **Target:** Internal pilot with 2 physicians

---

## ✅ Pre-Deployment Verification

### Backend

- [x] All tests pass (`pytest tests/ -v` → 31 passed)
- [x] Ruff linting clean (`ruff check .` → All checks passed)
- [x] Authentication hardened (bcrypt password hashing)
- [x] EncounterResponse includes `subject_id` for frontend navigation
- [x] SQL migration for `password_hash` column ready

### Frontend

- [x] TypeScript type-check passes (`tsc --noEmit`)
- [x] ESLint configured (`.eslintrc.json`)
- [x] Test script added (`npm run test` → placeholder)
- [x] Encounter types updated with `subject_id`

### CI/CD

- [x] Backend workflow includes ruff linting
- [x] Frontend workflow ready for PR checks

---

## 🔐 Security Checklist

- [x] Universal "demo" password removed
- [x] Bcrypt password hashing implemented
- [x] JWT token authentication working
- [x] Pilot password: `piloto2026`

---

## 📋 Smoke Test

Run before deployment:

```bash
chmod +x scripts/smoke_phase1.sh
./scripts/smoke_phase1.sh http://localhost:8000
```

Expected result: All 4 checks pass.

---

## 🚀 Deployment Steps

1. **Apply SQL Migration**
   ```bash
   psql $DATABASE_URL < supabase/migrations/20260208_add_password_hash.sql
   ```

2. **Deploy Backend**
   ```bash
   # Railway / Vercel / Docker deployment
   ```

3. **Deploy Frontend**
   ```bash
   npm run build
   npm run start
   ```

4. **Run Smoke Test**
   ```bash
   ./scripts/smoke_phase1.sh $API_URL
   ```

---

## 📝 Pilot User Credentials

| Email | Password | Role |
|-------|----------|------|
| sara@consultamed.es | piloto2026 | Test Practitioner |

---

## ⚠️ Known Limitations (V1)

- Audit logging not implemented (deferred to V2)
- Single practitioner per encounter (multi-provider support later)
- Basic error handling (will improve in production)

---

## ✅ Go/No-Go Criteria

| Criteria | Status |
|----------|--------|
| Backend tests pass | ✅ 31/31 |
| Frontend type-check | ✅ Pass |
| Ruff linting | ✅ Clean |
| Auth hardening | ✅ Bcrypt |
| Smoke test | ⏳ Run before deploy |

**Decision:** ✅ **READY FOR PILOT**
