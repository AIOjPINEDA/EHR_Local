# ConsultaMed API - Documentación

> **Estado**: ✅ MVP Completo - Todos los endpoints funcionales  
> **Base URL**: `http://localhost:8000/api/v1`

## Autenticación

Todas las rutas (excepto `/auth/login`) requieren token JWT:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### Authentication

| Method | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Iniciar sesión (form-data) | ✅ |
| GET | `/auth/me` | Usuario actual | ✅ |

### Patients

| Method | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/patients/` | Listar/buscar pacientes | ✅ |
| GET | `/patients/{id}` | Obtener paciente | ✅ |
| POST | `/patients/` | Crear paciente | ✅ |
| PATCH | `/patients/{id}` | Actualizar paciente | ✅ |

### Allergies

| Method | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/patients/{id}/allergies` | Listar alergias | ✅ |
| POST | `/patients/{id}/allergies` | Añadir alergia | ✅ |
| DELETE | `/patients/{id}/allergies/{allergy_id}` | Eliminar alergia | ✅ |

### Encounters

| Method | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/encounters/patient/{patient_id}` | Historial consultas | ✅ |
| GET | `/encounters/{id}` | Detalle consulta | ✅ |
| POST | `/encounters/patient/{patient_id}` | Nueva consulta | ✅ |
| PATCH | `/encounters/{id}` | Actualizar consulta | ✅ |

### Templates

| Method | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/templates/` | Listar templates | ✅ |
| GET | `/templates/{id}` | Obtener template | ✅ |
| GET | `/templates/match?diagnosis=X` | Buscar por diagnóstico | ✅ |
| POST | `/templates/` | Crear template | ✅ |
| PATCH | `/templates/{id}` | Actualizar template | ✅ |
| DELETE | `/templates/{id}` | Eliminar template | ✅ |

### Prescriptions

| Method | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/prescriptions/{encounter_id}/preview` | Vista previa datos | ✅ |
| GET | `/prescriptions/{encounter_id}/pdf` | Descargar PDF | ✅ |

## Códigos de Error

| Código | Significado |
|--------|-------------|
| 400 | Validación fallida (ej: DNI inválido) |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej: DNI duplicado) |
| 422 | Error de validación Pydantic |
| 500 | Error interno |

## Ejemplos

Ver [SPEC.md](./SPEC.md) sección 5 para ejemplos detallados de request/response.
