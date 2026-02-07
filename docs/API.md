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
    "name": "Sara Isabel",
    "family": "Muñoz Mejía",
    "email": "sara@consultamed.es"
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

### Patients

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/patients/` | Listar/buscar pacientes |
| GET | `/patients/{id}` | Obtener paciente |
| POST | `/patients/` | Crear paciente |
| PATCH | `/patients/{id}` | Actualizar paciente |

**Búsqueda:**
```bash
GET /patients/?search=Garcia&skip=0&limit=20
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
| PATCH | `/encounters/{id}` | Actualizar consulta |

**Respuesta incluye `subject_id`** para navegación frontend:
```json
{
  "id": "encounter-uuid",
  "subject_id": "patient-uuid",
  "status": "finished",
  "period_start": "2026-02-07T10:30:00Z",
  "reason_text": "Dolor de garganta",
  "conditions": [...],
  "medications": [...]
}
```

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
  -d '{"reason_text": "Dolor de cabeza"}'
```

---

## 📚 Referencias

- [Swagger UI](http://localhost:8000/docs) - Documentación interactiva
- [ReDoc](http://localhost:8000/redoc) - Documentación alternativa
- [USER_GUIDE.md](./USER_GUIDE.md) - Guía de uso
