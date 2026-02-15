# ConsultaMed API - Documentación

> **Versión:** V1 Pilot  
> **Estado:** ✅ MVP Completo - Todos los endpoints funcionales  
> **Base URL:** `http://localhost:8000/api/v1`

---

## 🔐 Autenticación

### Sistema

ConsultaMed usa **JWT (JSON Web Tokens)** con:
- Algoritmo: HS256
- Expiración: 8 horas
- Contraseñas: bcrypt hash

### Header Requerido

Todas las rutas (excepto `/auth/login`) requieren:

```
Authorization: Bearer <JWT_TOKEN>
```

### Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=sara@consultamed.es&password=piloto2026"
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "practitioner": {
    "id": "uuid",
    "identifier_value": "12345678Z",
    "name_given": "Sara Isabel",
    "name_family": "Muñoz Mejía",
    "telecom_email": "sara@consultamed.es"
  }
}
```

---

## 📡 Endpoints

### Authentication

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Iniciar sesión (form-data) |
| GET | `/auth/me` | Usuario actual |

### Health Checks (fuera de `/api/v1`)

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del backend |
| GET | `/` | Health básico con metadata |

### Patients

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/patients/` | Listar/buscar pacientes |
| GET | `/patients/{id}` | Obtener paciente |
| POST | `/patients/` | Crear paciente |
| PATCH | `/patients/{id}` | Actualizar paciente |

`PATCH /patients/{id}` usa semántica parcial:
- Para limpiar campos opcionales enviar `null` en `gender`, `telecom_phone` o `telecom_email`.
- `name_given`, `name_family` y `birth_date` no aceptan `null` ni texto vacío.

**Búsqueda:**
```bash
GET /patients/?search=Garcia&offset=0&limit=20
```

### Allergies

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/patients/{id}/allergies` | Listar alergias |
| POST | `/patients/{id}/allergies` | Añadir alergia |
| DELETE | `/patients/{id}/allergies/{allergy_id}` | Eliminar alergia |

### Encounters

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/encounters/patient/{patient_id}` | Historial consultas |
| GET | `/encounters/{id}` | Detalle consulta |
| POST | `/encounters/patient/{patient_id}` | Nueva consulta |
| PUT | `/encounters/{id}` | Editar/reemplazar consulta existente |

**Respuesta incluye `subject_id`** para navegación frontend:
```json
{
  "id": "encounter-uuid",
  "subject_id": "patient-uuid",
  "status": "finished",
  "period_start": "2026-02-07T10:30:00Z",
  "reason_text": "Dolor de garganta",
  "subjective_text": "Odinofagia y febrícula desde hace 72h.",
  "objective_text": "Faringe eritematosa. T 37.8C.",
  "assessment_text": "Faringoamigdalitis aguda sin signos de alarma.",
  "plan_text": "Tratamiento sintomático y control evolutivo.",
  "recommendations_text": "Hidratación, reposo y reevaluar si empeora.",
  "conditions": [...],
  "medications": [...]
}
```

**Payload recomendado para nueva consulta (flujo SOAP):**
```json
{
  "reason_text": "Dolor de garganta",
  "subjective_text": "Dolor al tragar desde hace 3 días.",
  "objective_text": "Amígdalas hiperémicas, sin exudado.",
  "assessment_text": "Faringitis aguda no complicada.",
  "plan_text": "Analgesia, control sintomático, revisión en 48-72h si persiste.",
  "recommendations_text": "Reposo relativo e hidratación.",
  "conditions": [
    { "code_text": "Faringitis aguda", "code_coding_code": "J02.9" }
  ],
  "medications": [
    {
      "medication_text": "Paracetamol 1g",
      "dosage_text": "1 comprimido cada 8 horas",
      "duration_value": 3,
      "duration_unit": "d"
    }
  ]
}
```

`PUT /encounters/{id}` usa el mismo payload SOAP y reemplaza `conditions`/`medications` (delete + recreate).  
Si no se envía `note` y no hay contenido SOAP nuevo, se preserva la nota legacy existente.

### Templates

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/templates/` | Listar templates |
| GET | `/templates/{id}` | Obtener template |
| GET | `/templates/match?diagnosis=X` | Buscar por diagnóstico |
| POST | `/templates/` | Crear template |
| PUT | `/templates/{id}` | Actualizar template |
| DELETE | `/templates/{id}` | Eliminar template |

### Prescriptions

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/prescriptions/{encounter_id}/preview` | Vista previa datos |
| GET | `/prescriptions/{encounter_id}/pdf` | Descargar PDF |

---

## ⚠️ Códigos de Error

| Código | Significado |
|--------|-------------|
| 400 | Validación fallida (ej: DNI inválido) |
| 401 | No autenticado o token expirado |
| 403 | Sin permisos |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej: DNI duplicado) |
| 422 | Error de validación Pydantic |
| 500 | Error interno del servidor |

**Formato de error:**
```json
{
  "detail": "Email o contraseña incorrectos"
}
```

---

## 🧪 Testing con cURL

### Flujo completo

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -d "username=sara@consultamed.es&password=piloto2026" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# 2. Listar pacientes
curl -s "http://localhost:8000/api/v1/patients/" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Crear consulta
curl -X POST "http://localhost:8000/api/v1/encounters/patient/{patient_id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason_text":"Dolor de cabeza","subjective_text":"Cefalea frontal 24h","assessment_text":"Cefalea tensional"}'
```

---

## 📚 Referencias

- [Swagger UI](http://localhost:8000/docs) - Documentación interactiva
- [ReDoc](http://localhost:8000/redoc) - Documentación alternativa
- [USER_GUIDE.md](./USER_GUIDE.md) - Guía de uso
