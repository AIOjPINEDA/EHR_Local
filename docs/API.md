# ConsultaMed API - Documentación

## Base URL

```
Production: https://api.consultamed.app
Development: http://localhost:8000
```

## Autenticación

Todas las rutas (excepto `/auth/login`) requieren token JWT:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### Authentication

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/me` | Usuario actual |

### Patients

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/patients` | Listar/buscar pacientes |
| GET | `/patients/{id}` | Obtener paciente |
| POST | `/patients` | Crear paciente |
| PUT | `/patients/{id}` | Actualizar paciente |

### Allergies

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/patients/{id}/allergies` | Añadir alergia |
| DELETE | `/patients/{id}/allergies/{allergy_id}` | Eliminar alergia |

### Encounters

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/patients/{id}/encounters` | Historial consultas |
| POST | `/patients/{id}/encounters` | Nueva consulta |

### Templates

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/templates` | Listar templates |
| GET | `/templates/match?diagnosis=X` | Buscar template por diagnóstico |
| POST | `/templates` | Crear template |
| PUT | `/templates/{id}` | Actualizar template |
| DELETE | `/templates/{id}` | Eliminar template |

### Prescriptions

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/encounters/{id}/prescription/preview` | Vista previa datos |
| GET | `/encounters/{id}/prescription/pdf` | Descargar PDF |

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
