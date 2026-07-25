# ConsultaMed - Guía de Usuario

> **Versión:** V1 Pilot  
> **Última actualización:** 2026-02-15

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
2. Pulsa tu nombre en **"Selección rápida"** (rellena tu email) o escríbelo a mano
3. Introduce tu contraseña
4. Pulsa **"Acceder al Sistema"**

> ⚠️ La sesión expira automáticamente tras 8 horas.

### Crear un Perfil Nuevo

Cualquier médico que se incorpore a la consulta puede crear su propio perfil sin
usar las credenciales de otro compañero.

1. En la pantalla de acceso, pulsa **"Crear perfil nuevo"**
2. Rellena nombre, apellidos, Nº Colegiado, especialidad y email de acceso
3. Elige una contraseña (mínimo 8 caracteres) y repítela
4. Introduce la **clave de alta** que entrega administración
5. Pulsa **"Crear perfil"** y luego **"Ir a iniciar sesión"**

> 🔑 Sin la clave de alta no se puede crear ningún perfil. Pídela a administración;
> no se envía por email ni aparece en la aplicación.

Notas:

- El email y el Nº Colegiado no pueden repetirse entre perfiles.
- El perfil nuevo aparece en la "Selección rápida" en cuanto se crea.

### Dar de Baja un Perfil

Por seguridad, las bajas **no están disponibles desde la aplicación**: retirar a un
médico afecta a la trazabilidad de la historia clínica que ha firmado. Se hacen
desde el equipo de la consulta, en una terminal, dentro de la carpeta `backend`:

```bash
.venv\Scripts\python.exe scripts/manage_practitioners.py list
.venv\Scripts\python.exe scripts/manage_practitioners.py deactivate --email medico@consultamed.es
.venv\Scripts\python.exe scripts/manage_practitioners.py activate --email medico@consultamed.es
```

- **`deactivate`** es la opción normal: el médico deja de poder entrar y desaparece
  del selector, pero sus consultas y recetas siguen firmadas con su nombre.
- **`delete`** (con `--yes`) borra el perfil definitivamente y **solo funciona si no
  tiene ninguna consulta ni receta**. Si las tiene, el comando se niega y te indica
  que uses `deactivate`.
- **`set-password`** permite reasignar una contraseña olvidada.

---

## 🚑 Vista de urgencias

### Últimos atendidos

La pantalla **Pacientes** abre en **"Últimos atendidos"**: solo los pacientes que
ya han pasado por el servicio, del más reciente al más antiguo, con la columna
*Última visita* en lenguaje de turno ("Hoy", "Hace 3 días").

- Pulsa **"Directorio A-Z"** para ver el listado completo por apellido, incluidos
  los pacientes que nunca han venido.
- El buscador funciona en las dos vistas. Si buscas en "Últimos atendidos" y no
  aparece el paciente, la propia pantalla te ofrece saltar al directorio.
- El **Dashboard** hace lo mismo: sin búsqueda muestra los últimos atendidos, y
  en cuanto escribes busca en todo el directorio.

### Actividad del servicio

La pestaña **Actividad** responde a "cuánta gente hemos visto":

- **Consultas hoy**, con la variación frente a ayer.
- Tarjetas de ayer, esta semana y la semana anterior.
- Gráfico de **consultas por día** y otro de **consultas por semana** (de lunes a
  domingo). El selector de periodo (14 / 30 / 90 días) reescala ambos.
- Cada gráfico tiene **"Ver datos en tabla"** con las cifras exactas.

Dos matices al leerlas:

- Son cifras **de todo el servicio**, no solo de tus consultas.
- **Consultas** y **pacientes** no coinciden cuando alguien reconsulta: dos
  visitas del mismo paciente en una semana son 2 consultas y 1 paciente.

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

### Editar Perfil del Paciente

1. Abre la ficha del paciente
2. Pulsa **"Editar perfil"**
3. Modifica los campos necesarios y pulsa **"Guardar cambios"**
4. Para limpiar campos opcionales, déjalos vacíos:
   - Género (Sin especificar)
   - Teléfono
   - Email

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

### Editar Consulta

1. Abre el detalle de una consulta existente
2. Pulsa **"Editar consulta"**
3. Ajusta SOAP, diagnósticos y/o tratamiento
4. Pulsa **"Actualizar Consulta"** o **"Actualizar y abrir receta"**

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
