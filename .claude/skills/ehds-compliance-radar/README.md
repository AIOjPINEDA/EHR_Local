# EHDS Compliance Radar Skill

> **Agent Skill para analizar cumplimiento de ConsultaMed con EHDS Regulation (EU) 2025/327**

## 📋 Descripción

Este skill genera un documento de compliance radar que mapea las funcionalidades actuales de ConsultaMed contra los artículos de la regulación EHDS (European Health Data Space). Identifica qué cumplimos, qué falta, y proporciona un roadmap priorizado.

## 🎯 Uso

### Invocación Manual (Recomendado)

```bash
/ehds-compliance
```

El skill está configurado con `disable-model-invocation: true`, lo que significa que **solo tú puedes invocarlo**, no Claude automáticamente. Esto previene generaciones accidentales del radar.

### Cuándo Ejecutarlo

- **Después de cerrar un milestone** o release
- **Después de PRs mayores** que añaden endpoints, modelos, o schemas
- **Cada 3 meses mínimo** para verificar frescura del cache
- **Antes de auditorías** o reuniones con stakeholders legales

## 📂 Estructura

```
.claude/skills/ehds-compliance-radar/
├── SKILL.md                              # Instrucciones principales (92 líneas)
├── scripts/
│   └── fetch-ehds-data.sh               # Ingesta API EHDS → cache local
├── references/
│   ├── relevance-matrix.md              # Análisis de pertinencia (qué artículos aplican)
│   ├── ehds-articles-cache.json         # 59 artículos (Ch. 1-3, 5)
│   ├── ehds-definitions-cache.json      # 159 definiciones
│   └── .gitignore                       # Excluye caches de git
└── assets/
    └── radar-template.md                # Template del documento de salida
```

## 🔄 Workflow del Skill

1. **Ingesta**: Ejecuta `fetch-ehds-data.sh` para actualizar cache EHDS
2. **Carga**: Lee matriz de relevancia, artículos cacheados, definiciones, y template
3. **Análisis**: Escanea `backend/`, `frontend/`, `docs/` y determina estado de compliance por artículo
4. **Generación**: Produce `docs/compliance/EHDS_COMPLIANCE_RADAR.md`
5. **Reporte**: Muestra resumen con top 3 gaps críticos

## 📊 Output

**Archivo generado**: [`docs/compliance/EHDS_COMPLIANCE_RADAR.md`](../../../docs/compliance/EHDS_COMPLIANCE_RADAR.md)

**Contenido**:
- Resumen ejecutivo con % de compliance (Implementado/Parcial/Roadmap/N-A)
- Análisis artículo-por-artículo con evidencia de código
- Identificación de gaps con priorización (HIGH/MEDIUM/LOW)
- Roadmap de implementación en 3 fases
- Definiciones clave de EHDS

## 🛠️ Mantenimiento

### Actualizar Cache EHDS

Si la regulación EHDS cambia (raro, es legislación publicada):

```bash
bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
```

El script detecta cambios via hash de fecha. Si el cache está fresco, sale inmediatamente.

### Actualizar Matriz de Relevancia

Si cambia el scope de ConsultaMed (ej: añadimos secondary use):

```bash
# Editar manualmente
vim .claude/skills/ehds-compliance-radar/references/relevance-matrix.md
```

Ajustar la clasificación HIGH/MEDIUM/LOW según nueva funcionalidad.

### Actualizar Template

Si necesitas cambiar la estructura del radar:

```bash
vim .claude/skills/ehds-compliance-radar/assets/radar-template.md
```

Mantener los placeholders `{{VARIABLE}}` para que el skill los reemplace.

## 📝 Campos del Frontmatter

```yaml
name: ehds-compliance-radar                 # Nombre del comando slash
description: Analyze ConsultaMed...         # Descripción para discovery
disable-model-invocation: true              # Solo invocación manual
```

**Por qué `disable-model-invocation: true`?**
- Previene que Claude genere el radar sin tu consentimiento
- El radar es un documento formal que debe revisarse con legal counsel
- Evita re-generaciones accidentales que sobrescriban cambios manuales

## 🔍 Troubleshooting

### El skill no aparece en `/` menu

**Causa**: Claude Code carga skills automáticamente desde `.claude/skills/`, pero el comando solo aparece si `user-invocable` no es `false`.

**Verificación**:
```bash
grep -A2 "^name:" .claude/skills/ehds-compliance-radar/SKILL.md
```

Debe mostrar `name: ehds-compliance-radar`. Si el nombre tiene caracteres no válidos o supera 64 chars, no se cargará.

### Error "Cache not found"

**Causa**: El script de ingesta no se ha ejecutado.

**Solución**:
```bash
bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
```

### El radar se genera pero con datos incorrectos

**Causa**: Cache desactualizado o matriz de relevancia no refleja el código actual.

**Solución**:
1. Regenerar cache: `bash scripts/fetch-ehds-data.sh`
2. Revisar matriz: `cat references/relevance-matrix.md`
3. Ejecutar skill de nuevo: `/ehds-compliance`

## 📚 Referencias

- **Spec del skill**: [agentskills.io](https://agentskills.io/specification)
- **Documentación Claude Code Skills**: [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- **Documento funcional activo**: [`docs/compliance/EHDS_COMPLIANCE_RADAR.md`](../../../docs/compliance/EHDS_COMPLIANCE_RADAR.md)
- **EHDS Explorer API**: [api.ehdsexplorer.eu](https://api.ehdsexplorer.eu)

## ✅ Quality Checklist

- ✅ SKILL.md < 100 líneas (92 líneas actualmente)
- ✅ Frontmatter solo con campos estándar
- ✅ Cache files excluidos de git via `.gitignore`
- ✅ Script de ingesta idempotente (skip si cache fresco)
- ✅ Evidencia basada en file paths reales (no hallucinations)
- ✅ Template con placeholders claros (`{{VARIABLE}}`)
- ✅ Zero impacto en runtime de la app (solo docs)

## 🚀 Próximos Pasos (Fase 2 - Fuera de Scope)

Si se retoma una visualización interactiva del radar en la UI, documentarla mediante una spec activa o un issue dedicado según la gobernanza actual del repositorio.

---

**Última actualización**: 2026-02-16
**Skill version**: 1.0
**Maintainer**: ConsultaMed Team
