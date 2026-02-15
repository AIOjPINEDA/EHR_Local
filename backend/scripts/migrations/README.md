# Migraciones de Datos - ConsultaMed

## CRM Antiguo (Guadalix)

> Estado actual: este flujo se ejecuta y valida en **Windows (PowerShell)**.
> La primera ejecución histórica fue en macOS; por eso abajo se documentan diferencias por plataforma.

### Metadata
- **Fuente original**: `.archive/CRM_Antiguo/CUADERNO DE VISITAS.xlsx`
- **Datos procesados**: `data/pacientes_validados_limpios.xlsx`
- **Total pacientes actuales en archivo limpio**: 817
- **Validación**: DNI/NIE válidos, edades 2-99 años
- **Fecha procesamiento inicial**: 2026-02-14 (macOS)
- **Fecha última validación**: 2026-02-15 (Windows)

### Calidad de Datos

| Métrica | Valor |
|---------|-------|
| Pacientes únicos (archivo inicial) | 826 |
| DNI válidos | 750 (90.8%) |
| NIE válidos | 76 (9.2%) |
| Con edad | 826 (100%) |
| Con fecha nacimiento | 817 (98.9%) |

> Nota operativa: en validación Windows se descartaron 9 filas por `Fecha_Nacimiento` vacía para ejecutar migración sin errores.

### Ejecución (Windows / PowerShell)

```powershell
cd backend
& ".venv/Scripts/Activate.ps1"
$env:PYTHONPATH = (Get-Location).Path
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
python scripts/migrations/import_patients.py
```

### Resultado esperado en re-ejecución (idempotencia)

- `Creados: 0`
- `Duplicados: 817`
- `Errores: 0`

### Diferencias importantes por plataforma

- **Activación de entorno**
	- Windows: `& ".venv/Scripts/Activate.ps1"`
	- macOS/Linux: `source .venv/bin/activate`
- **Import path (`app.*`)**
	- Windows PowerShell: `$env:PYTHONPATH = (Get-Location).Path`
	- macOS/Linux: `export PYTHONPATH=$(pwd)`
- **Codificación consola**
	- En Windows se recomienda `PYTHONIOENCODING=utf-8` y `PYTHONUTF8=1` para evitar errores con caracteres Unicode en logs.
- **Separadores de ruta**
	- Internamente Python maneja ambos, pero en documentación usar comando nativo del shell donde se ejecuta.

### Ejecución equivalente (macOS/Linux)

```bash
cd backend
source .venv/bin/activate
export PYTHONPATH=$(pwd)
PYTHONIOENCODING=utf-8 PYTHONUTF8=1 python scripts/migrations/import_patients.py
```

### Estructura de Datos

Columnas en Excel:
- `DNI_NIE`: Documento de identidad validado
- `Nombre`: Nombre del paciente
- `Apellidos`: Apellidos del paciente
- `Edad`: Edad calculada (referencia)
- `Fecha_Nacimiento`: Fecha en formato DD/MM/YYYY
- `Última_Consulta`: Última consulta registrada

### ⚠️ SEGURIDAD - CRÍTICO

**IMPORTANTE: Los archivos de datos con información de pacientes NUNCA deben estar en git.**

- ✅ Los archivos `data/*.xlsx`, `data/*.csv`, `data/*.xls` están en `.gitignore`
- ✅ Los datos existen **solo localmente** en tu máquina
- ❌ **NUNCA** hacer `git add -f` para forzar tracking de datos de pacientes
- 🔒 Cumplimiento GDPR/LOPD-GDD: PII no puede estar en repositorios

Si necesitas compartir datos:
1. Usa canales seguros y encriptados
2. Nunca uses git/GitHub para datos de pacientes
3. Documenta el proceso en este README (no los datos)

### Notas

- El script maneja duplicados automáticamente (skip si ya existe)
- Logs enmascaran PII (solo primeros 4 dígitos de DNI)
- Usa `PatientService.create()` para validación completa
