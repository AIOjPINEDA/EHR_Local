# Migraciones de Datos - ConsultaMed

## CRM Antiguo (Guadalix)

### Metadata
- **Fuente original**: `.archive/CRM_Antiguo/CUADERNO DE VISITAS.xlsx`
- **Datos procesados**: `data/pacientes_validados_limpios.xlsx`
- **Total pacientes**: 826 validados
- **Validación**: DNI/NIE válidos, edades 2-99 años
- **Fecha procesamiento**: 2026-02-14

### Calidad de Datos

| Métrica | Valor |
|---------|-------|
| Pacientes únicos | 826 |
| DNI válidos | 750 (90.8%) |
| NIE válidos | 76 (9.2%) |
| Con edad | 826 (100%) |
| Con fecha nacimiento | 817 (98.9%) |

### Ejecución

```bash
cd backend
source .venv/bin/activate
python scripts/migrations/import_patients.py
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
