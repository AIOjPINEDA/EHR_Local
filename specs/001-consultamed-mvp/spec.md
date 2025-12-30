# Feature Specification: ConsultaMed MVP

**Feature Branch**: `001-consultamed-mvp`  
**Created**: 2024-12-30  
**Status**: Ready for Implementation  
**Input**: Sistema de Historia Clínica Electrónica para consultorio médico privado en España

## Overview

**ConsultaMed** es una aplicación web progresiva (PWA) para gestión de consultas médicas en consultorios privados pequeños (1-2 médicos).

### Problema que Resuelve

Los médicos en consultorios pequeños pierden tiempo valioso en:
- Buscar datos de pacientes en sistemas fragmentados
- Escribir tratamientos repetitivos para patologías comunes
- Generar recetas manualmente

### Propuesta de Valor

- **Registro único de paciente**: Los datos se introducen una vez y se reutilizan siempre
- **Templates de tratamiento**: Protocolos predefinidos por diagnóstico, editables antes de guardar
- **Generación automática de recetas**: PDF profesional con 1 clic

### Usuarios Objetivo

| Usuario | Descripción | Frecuencia de Uso |
|---------|-------------|-------------------|
| Médico de Familia | Sara Isabel Muñoz Mejía (Nº Col: 282886589) | Diario |
| Médico de Urgencias | Jaime A. Pineda Moreno (Nº Col: 282888890) | Diario |

**Contexto de uso**: Consultorio privado, ~50 consultas/mes, dispositivo principal PC de escritorio.

---

## User Scenarios & Testing

### User Story 1 - Autenticación de Médico (Priority: P1) 🎯 MVP

Como médico, quiero iniciar sesión de forma segura para acceder al sistema y que mis acciones queden registradas bajo mi perfil.

**Why this priority**: Sin autenticación, no hay seguridad ni trazabilidad. Es el requisito base para cumplir RGPD y usar el sistema.

**Independent Test**: Acceder a la URL → ver pantalla login → introducir credenciales válidas → acceder al dashboard → verificar nombre del médico visible → cerrar sesión → verificar redirección a login.

**Acceptance Scenarios**:

1. **Given** credenciales válidas, **When** hago login, **Then** accedo al dashboard con mi nombre visible
2. **Given** credenciales inválidas, **When** hago login, **Then** veo mensaje de error claro
3. **Given** sesión activa, **When** cierro sesión, **Then** soy redirigido al login
4. **Given** token expirado, **When** hago cualquier acción, **Then** soy redirigido al login

---

### User Story 2 - Búsqueda Rápida de Paciente (Priority: P1) 🎯 MVP

Como médico, quiero buscar un paciente por nombre o DNI con autocompletado para acceder a su ficha en menos de 3 segundos.

**Why this priority**: Es la acción más frecuente. Sin búsqueda rápida, el sistema pierde su principal valor.

**Independent Test**: Escribir "García" en búsqueda → ver lista de pacientes coincidentes → seleccionar uno → ver su ficha completa con datos correctos.

**Acceptance Scenarios**:

1. **Given** 2+ caracteres escritos, **When** busco, **Then** aparecen sugerencias en <500ms
2. **Given** resultados encontrados, **When** veo la lista, **Then** muestra nombre completo + DNI + edad
3. **Given** click en resultado, **When** selecciono, **Then** abre ficha del paciente
4. **Given** sin resultados, **When** busco, **Then** muestra opción "Crear nuevo paciente"

---

### User Story 3 - Registro de Nuevo Paciente (Priority: P1) 🎯 MVP

Como médico, quiero registrar un paciente nuevo con datos mínimos para no perder tiempo en campos innecesarios.

**Why this priority**: Sin pacientes no hay consultas. Es el segundo paso natural después de buscar.

**Independent Test**: Click "Nuevo Paciente" → rellenar nombre, apellidos, DNI "12345678Z", fecha nacimiento → guardar → verificar en búsqueda → intentar crear otro con mismo DNI → ver error.

**Acceptance Scenarios**:

1. **Given** formulario vacío, **When** veo campos, **Then** obligatorios son: Nombre, Apellidos, DNI, Fecha nacimiento
2. **Given** DNI "12345678Z", **When** guardo, **Then** backend valida letra correcta
3. **Given** DNI duplicado, **When** intento guardar, **Then** veo error "DNI ya registrado"
4. **Given** datos válidos, **When** guardo, **Then** abre automáticamente la ficha del paciente

---

### User Story 4 - Visualización de Ficha de Paciente (Priority: P1) 🎯 MVP

Como médico, quiero ver toda la información relevante del paciente en una sola pantalla para tener contexto completo antes de la consulta.

**Why this priority**: La ficha es el centro del sistema. Todo fluye desde aquí: consultas, alergias, recetas.

**Independent Test**: Abrir ficha de paciente con historial → verificar datos demográficos → verificar alergias destacadas en rojo → verificar consultas ordenadas cronológicamente → ver botón "Nueva Consulta".

**Acceptance Scenarios**:

1. **Given** paciente seleccionado, **When** abro ficha, **Then** veo nombre, edad calculada, DNI
2. **Given** paciente con alergias, **When** veo ficha, **Then** alergias aparecen con badge rojo prominente
3. **Given** paciente con historial, **When** veo consultas, **Then** están ordenadas por fecha (más reciente primero)
4. **Given** cualquier paciente, **When** veo ficha, **Then** hay botón "Nueva Consulta" prominente

---

### User Story 5 - Gestión de Alergias (Priority: P2)

Como médico, quiero registrar y ver alergias del paciente de forma destacada para evitar prescribir medicamentos contraindicados.

**Why this priority**: Crítico para seguridad del paciente, pero requiere que existan pacientes primero.

**Independent Test**: Desde ficha de paciente → añadir alergia "Penicilina" tipo "medicamento" criticidad "alta" → guardar → verificar badge rojo → iniciar nueva consulta → verificar alergia visible durante prescripción.

**Acceptance Scenarios**:

1. **Given** ficha de paciente, **When** añado alergia, **Then** puedo especificar nombre, tipo, criticidad
2. **Given** alergia guardada, **When** veo ficha, **Then** aparece con badge rojo
3. **Given** paciente con alergias, **When** creo consulta, **Then** alergias visibles durante todo el proceso

---

### User Story 6 - Registro de Nueva Consulta (Priority: P2)

Como médico, quiero registrar una consulta con diagnóstico y tratamiento para mantener el historial clínico del paciente.

**Why this priority**: Core del negocio, pero requiere pacientes existentes y preferiblemente templates.

**Independent Test**: Desde ficha de paciente → click "Nueva Consulta" → escribir motivo → seleccionar diagnóstico "Catarro común" → verificar template cargado → modificar dosis → guardar → verificar en historial.

**Acceptance Scenarios**:

1. **Given** nueva consulta iniciada, **When** veo formulario, **Then** fecha es hoy automáticamente
2. **Given** diagnóstico con template, **When** lo selecciono, **Then** tratamiento se carga automáticamente
3. **Given** tratamiento cargado, **When** quiero modificar, **Then** puedo editar antes de guardar
4. **Given** consulta completa, **When** guardo, **Then** aparece en historial del paciente

---

### User Story 7 - Templates de Tratamiento (Priority: P2)

Como médico, quiero tener tratamientos predefinidos para patologías frecuentes para no escribir lo mismo repetidamente.

**Why this priority**: Acelera dramáticamente la documentación. Objetivo: consulta <60 segundos con template.

**Independent Test**: Ir a configuración → crear template "ITU adulto" con diagnóstico "Infección urinaria", medicamentos [ciprofloxacino, ibuprofeno] → crear consulta con ese diagnóstico → verificar template cargado → modificar y guardar.

**Acceptance Scenarios**:

1. **Given** configuración templates, **When** creo uno, **Then** puedo definir nombre, diagnóstico, medicamentos, indicaciones
2. **Given** template existente, **When** marco favorito, **Then** aparece primero en listas
3. **Given** consulta con diagnóstico coincidente, **When** lo selecciono, **Then** template se carga automáticamente
4. **Given** template cargado, **When** edito, **Then** cambios son solo para esta consulta (no afectan template original)

---

### User Story 8 - Generación de Receta PDF (Priority: P2)

Como médico, quiero generar una receta PDF profesional con 1 clic para entregarla al paciente inmediatamente.

**Why this priority**: Deliverable tangible para el paciente. Sin receta, la consulta no está completa.

**Independent Test**: Completar consulta con tratamiento → click "Generar Receta" → ver vista previa con todos los datos → descargar PDF → verificar formato profesional con datos del paciente, diagnóstico, medicamentos, médico.

**Acceptance Scenarios**:

1. **Given** consulta guardada, **When** genero receta, **Then** PDF incluye datos paciente (nombre, DNI, edad)
2. **Given** PDF generado, **When** veo contenido, **Then** incluye diagnóstico, medicamentos con dosis y duración
3. **Given** PDF generado, **When** veo pie, **Then** incluye nombre médico, nº colegiado, fecha
4. **Given** PDF listo, **When** interactúo, **Then** puedo descargar o imprimir directamente

---

### User Story 9 - Configuración del Médico (Priority: P3)

Como médico, quiero configurar mis datos profesionales para que aparezcan correctamente en las recetas.

**Why this priority**: Necesario para recetas válidas, pero puede hacerse post-setup inicial.

**Independent Test**: Ir a configuración → editar nombre, nº colegiado, especialidad → guardar → generar receta → verificar nuevos datos en PDF.

**Acceptance Scenarios**:

1. **Given** configuración, **When** edito perfil, **Then** puedo cambiar nombre, apellidos, nº colegiado, especialidad
2. **Given** datos guardados, **When** genero receta, **Then** mis datos aparecen correctamente
3. **Given** múltiples médicos, **When** cada uno genera receta, **Then** aparecen sus propios datos

---

### Edge Cases

- **DNI inválido**: Backend rechaza con mensaje específico ("Letra de control incorrecta")
- **Paciente sin alergias**: Sección visible pero vacía, sin badges
- **Template sin match**: Usuario puede escribir tratamiento manualmente
- **PDF con muchos medicamentos**: Layout se adapta sin cortar contenido
- **Sesión expirada durante edición**: Guarda localmente y pide re-login
- **Doble submit**: Backend idempotente, evita duplicados

---

## Requirements

### Functional Requirements - Gestión de Pacientes

| ID | Requisito | Prioridad | Story |
|----|-----------|-----------|-------|
| FR-001 | Sistema DEBE permitir crear pacientes con DNI único | Must | US-3 |
| FR-002 | Sistema DEBE validar formato DNI español (8 dígitos + letra) en backend | Must | US-3 |
| FR-003 | Sistema DEBE calcular edad automáticamente desde fecha nacimiento | Must | US-4 |
| FR-004 | Sistema DEBE permitir búsqueda por nombre parcial o DNI | Must | US-2 |
| FR-005 | Sistema DEBE mostrar alergias de forma destacada (badge rojo) | Must | US-5 |
| FR-006 | Sistema DEBE soportar NIE además de DNI | Should | US-3 |

### Functional Requirements - Gestión de Consultas

| ID | Requisito | Prioridad | Story |
|----|-----------|-----------|-------|
| FR-010 | Sistema DEBE asociar cada consulta a un paciente y un médico | Must | US-6 |
| FR-011 | Sistema DEBE registrar fecha/hora automáticamente | Must | US-6 |
| FR-012 | Sistema DEBE permitir múltiples diagnósticos por consulta | Should | US-6 |
| FR-013 | Sistema DEBE permitir múltiples medicamentos por consulta | Must | US-6 |
| FR-014 | Sistema DEBE cargar template cuando diagnóstico coincide | Must | US-7 |

### Functional Requirements - Generación de Recetas

| ID | Requisito | Prioridad | Story |
|----|-----------|-----------|-------|
| FR-020 | Sistema DEBE generar PDF en backend (WeasyPrint) | Must | US-8 |
| FR-021 | Sistema DEBE incluir todos los datos requeridos en receta | Must | US-8 |
| FR-022 | Sistema DEBE permitir vista previa antes de descarga | Must | US-8 |
| FR-023 | Sistema DEBE permitir impresión directa | Should | US-8 |

### Functional Requirements - Autenticación

| ID | Requisito | Prioridad | Story |
|----|-----------|-----------|-------|
| FR-030 | Sistema DEBE autenticar usuarios via Supabase Auth | Must | US-1 |
| FR-031 | Sistema DEBE manejar refresh de tokens automáticamente | Must | US-1 |
| FR-032 | Sistema DEBE redirigir a login si sesión expira | Must | US-1 |
| FR-033 | Sistema DEBE aplicar RLS en todas las tablas de datos | Must | US-1 |

### Key Entities

- **Patient**: Paciente con DNI/NIE único, datos demográficos, alergias asociadas
- **Practitioner**: Médico con número de colegiado, credenciales de acceso
- **Encounter**: Consulta médica vinculando paciente, médico, diagnósticos y tratamiento
- **Condition**: Diagnóstico (CIE-10 opcional) asociado a una consulta
- **MedicationRequest**: Medicamento prescrito con dosis y duración
- **AllergyIntolerance**: Alergia/intolerancia del paciente con criticidad
- **TreatmentTemplate**: Plantilla de tratamiento por diagnóstico

---

## Success Criteria

### Measurable Outcomes

| ID | Métrica | Objetivo | Método |
|----|---------|----------|--------|
| SC-001 | Tiempo documentación consulta (paciente conocido + template) | < 60 segundos | Cronómetro en pruebas |
| SC-002 | Tiempo generación receta PDF | < 5 segundos | Logs de backend |
| SC-003 | Tiempo búsqueda de paciente | < 500ms | Métricas API |
| SC-004 | Errores críticos primer mes | 0 | Monitoreo Sentry |
| SC-005 | Tasa de uso exitoso sin formación | > 90% | Test usabilidad |

---

## Out of Scope (MVP)

Explícitamente **NO** se implementará en esta fase:

- ❌ Sistema de citas/agenda
- ❌ Facturación
- ❌ Integración con receta electrónica oficial
- ❌ Multi-clínica / multi-sede
- ❌ Firma digital de documentos
- ❌ Comunicación con pacientes (email/SMS)
- ❌ Histórico de medicamentos (fuera de consultas)
- ❌ Informes estadísticos
- ❌ Soporte offline completo
- ❌ Verificación automática de interacciones medicamentosas
