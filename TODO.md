# ConsultaMed - Tareas Pendientes

## Sprint 0: Setup ✅
- [x] Crear estructura del repositorio
- [x] Configurar backend FastAPI
- [x] Configurar frontend Next.js
- [x] Crear schema de base de datos
- [x] Crear documentación inicial

## Sprint 1: Fundamentos (Próximo)

### Backend (Jaime)
- [ ] T-007: Completar modelo Practitioner con auth
- [ ] T-008: Crear schemas Pydantic para auth
- [ ] T-009: Implementar JWT utils
- [ ] T-010: Crear endpoints /auth/*
- [ ] T-019: Completar endpoints /patients
- [ ] T-020: Tests del validador DNI

### Frontend (Agente AI)
- [ ] T-011: Configurar TanStack Query
- [ ] T-012: Crear hook useAuth
- [ ] T-013: Completar página login
- [ ] T-014: Crear middleware auth
- [ ] T-015: Crear layout principal
- [ ] T-024: Crear hook usePatients
- [ ] T-025: Crear PatientSearch component

### Compartido
- [ ] T-005: Crear proyecto en Supabase
- [ ] T-006: Ejecutar schema SQL en Supabase

## Sprint 2: Core Funcional (Pendiente)
- Ver tasks T-027 a T-046 en SPEC.md

## Sprint 3: Templates + PDF (Pendiente)
- Ver tasks T-047 a T-064 en SPEC.md

## Sprint 4: Deploy + Polish (Pendiente)
- Ver tasks T-065 a T-080 en SPEC.md

---

## Notas

### Para iniciar desarrollo:

1. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Editar .env con credenciales
   uvicorn app.main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. **Base de datos**:
   - Crear proyecto en Supabase
   - Ejecutar `ConsultaMed_Schema_Supabase.sql` en SQL Editor
   - Ejecutar `database/seed.sql` para datos iniciales
