# ConsultaMed V1 - Plan de Ejecución Pragmático

> **Enfoque**: Feature-first, ejecutable, práctico  
> **Timeline**: 5-6 días  
> **Objetivo**: Primera versión usable para piloto con usuarios reales en entorno seguro

---

## Resumen Ejecutivo

Plan optimizado para entregar un producto **funcional y usable** en el menor tiempo posible. La seguridad se simplifica dado el entorno controlado del piloto.

### Lo que SÍ haremos:
- ✅ Arreglar flujo de encuentros y PDF (bloqueante)
- ✅ Añadir capa de autenticación simple con passwords hasheados
- ✅ Estabilizar CI y documentar deployment

### Lo que NO haremos (diferido):
- ❌ Audit logging (post-piloto)
- ❌ RLS avanzado (usuarios comparten pacientes por diseño)
- ❌ Tests exhaustivos (solo críticos)

---

## Fase 1: Flujo Clínico Completo (Días 1-2)

### 1.1 Fix Encounter Detail Response

**Problema**: `EncounterResponse` no devuelve `subject_id`, rompiendo el flujo frontend.

**Archivos a modificar**:
- `backend/app/api/encounters.py` - Añadir `subject_id` a response
- `frontend/src/types/api.ts` - Actualizar tipo `Encounter`

**Cambio en backend** (`encounters.py`):
```python
class EncounterResponse(BaseModel):
    id: str
    status: str
    period_start: datetime
    reason_text: Optional[str]
    note: Optional[str]
    subject_id: str  # ← AÑADIR ESTO
    conditions: List[ConditionResponse] = []
    medications: List[MedicationResponse] = []
```

**Cambio en frontend** (`api.ts`):
```typescript
export interface Encounter extends EncounterSummary {
  status: string;
  note: string | null;
  subject_id: string;  // ← AÑADIR ESTO
  practitioner: { ... };
}
```

**Verificación**:
```bash
cd backend && ../.venv/bin/pytest tests/ -v --tb=short
cd frontend && npm run type-check && npm run build
```

---

### 1.2 Verificar Flujo PDF Completo

**Test manual completo**:
1. Login → Dashboard
2. Buscar paciente existente
3. Crear nueva consulta con template
4. Ver detalle de consulta
5. Generar PDF → Descargar/Imprimir

**Si hay errores**: Documentar y arreglar antes de continuar.

---

## Fase 2: Autenticación Simple (Día 3)

### 2.1 Implementar Hash de Passwords

**Objetivo**: Eliminar password "demo" universal, usar passwords hasheados reales pero simples.

**Archivos a modificar**:
- `backend/app/api/auth.py`
- `backend/app/config.py`
- `database/seed.sql`

**Implementación mínima**: Usar `passlib[bcrypt]` (ya instalado) para hashear passwords.

### 2.2 Configuración de Entorno Seguro

- Token expiration: 8 horas para piloto
- JWT_SECRET_KEY desde variables de entorno

---

## Fase 3: CI y Deployment Docs (Días 4-5)

### 3.1 Estabilizar CI
- Añadir `ruff check .` al workflow backend
- Añadir script `npm test` al frontend (placeholder)

### 3.2 Crear Runbook de Deployment
- Pre-requisitos
- Variables de entorno
- Pasos de deployment
- Rollback procedure

### 3.3 Validación Manual Final

**Checklist de aceptación**:
- [ ] Login con password real funciona
- [ ] Búsqueda de pacientes funciona
- [ ] Crear paciente con validación DNI
- [ ] Añadir alergia (badge rojo visible)
- [ ] Crear consulta con template
- [ ] Generar PDF con datos correctos
- [ ] Frontend build sin errores
- [ ] Backend tests passing

---

## Cronograma

| Día | Fase | Entregable |
|-----|------|------------|
| 1-2 | Fase 1 | Flujo clínico funcionando end-to-end |
| 3 | Fase 2 | Auth con passwords hasheados |
| 4-5 | Fase 3 | CI estable + Runbook deployment |
| 6 | Buffer | Validación final + fixes menores |

---

## Aprobaciones Requeridas

Antes de ejecutar:
1. **Schema de BD**: Añadir columna `password_hash` a practitioners
2. **Password piloto**: Definir password para usuarios piloto
3. **Token expiration**: 8 horas para piloto

---

*Plan creado: 2026-02-07*
