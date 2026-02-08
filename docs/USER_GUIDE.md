# ConsultaMed - Guía de Usuario

> **Versión:** V1 Pilot  
> **Última actualización:** 2026-02-07

---

## 🔐 Acceso al Sistema

### Credenciales

| Campo | Valor |
|-------|-------|
| **URL** | http://localhost:3000 (desarrollo) |
| **Email** | sara@consultamed.es |
| **Password** | piloto2026 |

### Iniciar Sesión

1. Abre la aplicación en tu navegador (Chrome o Firefox recomendado)
2. Introduce tu email y contraseña
3. Pulsa **"Iniciar Sesión"**

> ⚠️ La sesión expira automáticamente tras 8 horas.

---

## 📋 Panel Principal (Dashboard)

Tras iniciar sesión verás:

- **Barra de búsqueda**: Busca pacientes por nombre o DNI
- **Accesos rápidos**: Nuevo paciente, Lista de pacientes, Templates

---

## 👤 Gestión de Pacientes

### Buscar Paciente

1. Escribe en la barra de búsqueda (mínimo 2 caracteres)
2. Selecciona el paciente de la lista
3. Accederás a su ficha completa

### Crear Nuevo Paciente

1. Pulsa **"+ Nuevo Paciente"** en el dashboard
2. Completa los campos obligatorios:
   - Nombre y apellidos
   - DNI/NIE (se valida automáticamente la letra)
   - Fecha de nacimiento
   - Teléfono
3. Pulsa **"Guardar"**

### Añadir Alergias

Las alergias son **críticas** para la seguridad del paciente:

1. Abre la ficha del paciente
2. En la sección "Alergias", pulsa **"+ Añadir"**
3. Indica:
   - Sustancia (ej: Penicilina)
   - Tipo (medicamento, alimento, ambiental)
   - Criticidad (alta o baja)
5. Pulsa **"Guardar"**

> ⚠️ Las alergias se muestran con **badge rojo** en todas las vistas del paciente.

---

## 🏥 Consultas Médicas

### Nueva Consulta

1. Abre la ficha del paciente
2. Pulsa **"Nueva Consulta"**
3. Completa la nota clínica en orden **SOAP**:
   - **Motivo de consulta**
   - **Subjetivo (S)**: lo que refiere el paciente
   - **Objetivo (O)**: hallazgos de exploración/mediciones
   - **Análisis (A)**: impresión clínica
   - **Plan (P)**: conducta terapéutica
   - **Recomendaciones**: indicaciones al paciente
4. Añade **diagnósticos** (texto o CIE-10) y, si aplica, **tratamiento farmacológico**
4. Pulsa **"Guardar"**

### Usar Templates

Los templates aceleran la documentación de diagnósticos frecuentes:

1. Al crear una consulta, pulsa **"Cargar Template"**
2. Selecciona el template apropiado
3. Se autocompletarán diagnóstico y medicamentos; las instrucciones del template se cargan en **Recomendaciones**
4. Ajusta las dosis o duración si es necesario
5. Guarda la consulta

---

## 📋 Templates de Tratamiento

### Ver Templates

1. Accede a **"Templates"** desde el dashboard
2. Verás dos secciones:
   - **Templates del Sistema**: Predefinidos (no editables)
   - **Mis Templates**: Personalizados

### Crear Template Personal

1. Pulsa **"+ Nuevo Template"**
2. Completa:
   - Nombre descriptivo (ej: "Amigdalitis Aguda")
   - Diagnóstico y código CIE-10
   - Medicamentos con dosis y duración
   - Instrucciones para el paciente
3. Marca **"Favorito"** si lo usas frecuentemente
4. Pulsa **"Guardar"**

---

## 🖨️ Recetas PDF

### Generar Receta

1. Abre el detalle de una consulta con tratamiento farmacológico
2. Pulsa **"Generar Receta PDF"** o **"Descargar Receta PDF"**
3. Opcional: usa **"Imprimir"** desde la misma pantalla

### Contenido de la Receta

- Datos del médico y nº colegiado
- Datos del paciente
- Fecha de la consulta
- Diagnóstico
- Medicamentos con pauta
- Instrucciones adicionales
- Firma digital del médico

---

## ⚙️ Configuración

### Cerrar Sesión

1. Pulsa **"Cerrar sesión"** en la esquina superior derecha del dashboard

---

## ❓ Resolución de Problemas

| Problema | Solución |
|----------|----------|
| "Email o contraseña incorrectos" | Verifica que usas `piloto2026` como contraseña |
| Sesión expirada | Vuelve a iniciar sesión |
| DNI inválido | Verifica que la letra corresponde al número |
| No carga la página | Comprueba que backend y frontend están ejecutándose |

---

## 📞 Soporte

Para problemas técnicos, contacta con el administrador del sistema.

---

*ConsultaMed V1 Pilot - Consultorio Médico Guadalix*
