# Migración a PostgreSQL 17 - Guía Académica Paso a Paso

> **Propósito:** Documentar el proceso completo de migración desde una arquitectura basada únicamente en Supabase Cloud hacia un despliegue dual con PostgreSQL 17 local como ruta principal, manteniendo Supabase como fallback operativo.

---

## 🎯 Objetivos de Aprendizaje

Esta guía te enseñará a:
1. **Comprender** el porqué de la migración a PostgreSQL 17 local
2. **Ejecutar** una migración controlada con validaciones en cada paso
3. **Implementar** una arquitectura dual que permita switching entre proveedores
4. **Validar** el funcionamiento correcto post-migración
5. **Aplicar** procedimientos de rollback si es necesario
6. **Diagnosticar** y resolver problemas comunes durante la migración

---

## 📍 Convención de Rutas

- Los comandos con `./scripts/...` se ejecutan desde la raíz del repo (`EHR_Guadalix/`).
- Si estás en `backend/`, usa `../scripts/...`.
- Puedes validar el script local con: `ls -l scripts/setup-local-db.sh`.

---

## 📋 Prerrequisitos Tecnológicos

### Conocimientos Previos
- Fundamentos de Docker y Docker Compose
- Conceptos básicos de PostgreSQL (versiones, conexiones, migraciones)
- Entorno de línea de comandos (bash)
- Nociones de FastAPI y variables de entorno

### Herramientas Requeridas
```bash
# Verificar instalaciones
docker --version          # >= 20.10
docker compose version    # >= 2.0
psql --version           # >= 15 (cliente)
git --version            # >= 2.30
```

### Entorno de Referencia
- **Sistema Operativo:** macOS 13+ (Ventura) o Linux moderno
- **Memoria RAM:** 8GB+ mínimo
- **Espacio Disco:** 10GB libres
- **Red:** Conexión estable para descarga de imágenes Docker

---

## 🏗️ Arquitectura de Referencia

### Estado Inicial: Solo Supabase Cloud
```
[Frontend] → [Backend FastAPI] → [Supabase Cloud PostgreSQL 15]
```

### Estado Final: Dual PG17 + Supabase
```
[Frontend] → [Backend FastAPI] → [PostgreSQL 17 Local] ←→ [Supabase Cloud PostgreSQL 15]
                                      ↑
                              (Modo por defecto)
```

### Componentes Clave
1. **Docker Compose:** Orquesta contenedor PostgreSQL 17
2. **Config.py:** Normaliza/valida la URL efectiva desde `DATABASE_URL`
3. **Script de Setup:** Configuración idempotente de BD local
4. **Migraciones:** SQL versionados aplicados automáticamente

---

## 📦 Estado Actual del Repositorio

### Configuración Implementada
- **PostgreSQL 17.7** fijado en `docker-compose.yml`
- **Selector runtime único** via `DATABASE_URL` en `backend/app/config.py`
- **Variables de entorno** preparadas en `backend/.env.example`
- **Script automatizado** en `scripts/setup-local-db.sh`

### Evidencia de Validación
```bash
# Test unitario de configuración PG17
backend/tests/unit/test_pg17_spike_config.py

# Pin de versión específica
asyncpg==0.30.0  # Compatible con PostgreSQL 17
```

---

## 🚀 Proceso de Migración Detallado

### Fase 1: Preparación del Entorno

#### 1.1 Verificar Estado Actual
```bash
# Verificar que no haya contenedores PostgreSQL en ejecución
docker ps | grep postgres

# Verificar estado del repositorio
git status

# Limpiar entorno si es necesario
docker compose down -v  # Elimina volúmenes existentes
```

#### 1.2 Descargar Imágenes PostgreSQL 17
```bash
# Descargar imagen específica
docker pull postgres:17.7

# Verificar imagen descargada
docker images | grep postgres
```

### Fase 2: Configuración de URL Runtime

#### 2.1 Configurar Variables de Entorno
```bash
# Copiar plantilla de configuración
cp backend/.env.example backend/.env

# Editar configuración para modo local
nano backend/.env
```

Variables críticas:
```env
# URL efectiva para PostgreSQL 17 local
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed

# URL efectiva para Supabase (alternativa)
# DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

#### 2.2 Verificar Configuración de Docker Compose
```bash
# Verificar que la imagen está fijada a 17.7
docker compose config | grep image

# Esperado: image: postgres:17.7
```

### Fase 3: Inicialización de PostgreSQL 17

#### 3.1 Ejecutar Script de Setup
```bash
# Ejecutar configuración inicial (desde raíz del repo)
./scripts/setup-local-db.sh

# El script realiza:
# 1. Inicia contenedor PostgreSQL 17
# 2. Espera por disponibilidad (healthcheck)
# 3. Crea tabla schema_migrations
# 4. Aplica migraciones en orden
# 5. Registra migraciones aplicadas
```

#### 3.2 Verificar Inicialización
```bash
# Verificar contenedor en ejecución
docker ps | grep consultamed-db

# Verificar conexión a BD
docker exec consultamed-db psql -U postgres -d consultamed -c "SELECT version();"

# Verificar migraciones aplicadas
docker exec consultamed-db psql -U postgres -d consultamed -c "SELECT * FROM schema_migrations;"
```

### Fase 4: Validación del Sistema

#### 4.1 Verificar Backend
```bash
cd backend

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
uvicorn app.main:app --reload

# En otra terminal, verificar health
curl http://localhost:8000/api/v1/health

# Esperado: {"status": "healthy"}
```

#### 4.2 Verificar Conexión a BD
```bash
# Desde el backend ejecutar test de conexión
python -c "
import asyncio
from app.config import settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT version()'))
        print('PostgreSQL Version:', result.scalar_one())

asyncio.run(test())
"
```

#### 4.3 Ejecutar Suite de Tests
```bash
pytest tests/unit/test_pg17_spike_config.py -v

cd ..
./scripts/test_gate.sh
```

### Fase 5: Testing Funcional

#### 5.1 Login de Usuario
```bash
# Probar login con usuario seed
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=sara@consultamed.es&password=piloto2026"
```

#### 5.2 Verificar Operación CRUD
```bash
# Obtener token del paso anterior
TOKEN="tu_token_jwt"

# Listar pacientes
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/patients
```

---

## 🔀 Procedimientos de Switching

### Cambiar a Modo Supabase (Fallback)
Edita `backend/.env`, aplica la URL de Supabase y reinicia backend.
Si no usas la base local, puedes detener el contenedor.
```bash
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
docker compose down
```

### Cambiar a Modo Local PG17
Edita `backend/.env` con la URL local y levanta PostgreSQL local.
```bash
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed
./scripts/setup-local-db.sh
```

---

## 🔙 Procedimientos de Rollback

### Rollback Completo a Supabase
```bash
# 1. Detener y limpiar PostgreSQL local
docker compose down -v
docker system prune -f

# 2. Revertir configuración
git checkout HEAD~1 -- backend/.env.example backend/app/config.py docker-compose.yml

# 3. Configurar modo cloud
DATABASE_URL=tu_url_supabase

# 4. Verificar operación
./scripts/smoke_phase1.sh
```

### Rollback de Cambios Recientes
```bash
# Verificar cambios
git log --oneline -5

# Revertir último commit
git revert HEAD

# O resetear a commit anterior (cuidado: destruye cambios)
git reset --hard <commit_hash>
```

---

## 🚨 Troubleshooting Común

### Error: "Database did not become ready in time"
**Causa:** PostgreSQL tardando más de lo esperado en iniciar.
**Solución:**
```bash
# Aumentar timeout
READINESS_TIMEOUT_SECONDS=300 ./scripts/setup-local-db.sh

# O verificar logs manualmente
docker logs consultamed-db
```

### Error: "no such file or directory: ./scripts/setup-local-db.sh"
**Causa:** El comando se ejecutó fuera de la raíz del repo.
**Solución:**
```bash
# Opción 1: ir a la raíz del repo
cd /ruta/a/EHR_Guadalix
./scripts/setup-local-db.sh

# Opción 2: si ya estás en backend/
../scripts/setup-local-db.sh
```

### Error: "Connection refused"
**Causa:** Contenedor no iniciado o puerto bloqueado.
**Solución:**
```bash
# Verificar contenedor
docker ps | grep postgres

# Verificar puerto
netstat -an | grep 54329

# Reiniciar si es necesario
docker compose restart db
```

### Error: "authentication failed"
**Causa:** Credenciales incorrectas en URL de conexión.
**Solución:**
```bash
# Verificar variables
echo $DATABASE_URL

# Probar conexión manual
psql $DATABASE_URL -c "SELECT 1;"
```

### Error: "relation already exists"
**Causa:** Script de setup ejecutado sin limpiar volúmenes previos.
**Solución:**
```bash
# Limpiar completamente
docker compose down -v
./scripts/setup-local-db.sh
```

### Error: "asyncpg.exceptions.PostgresError"
**Causa:** Versión de asyncpg incompatible con PostgreSQL.
**Solución:**
```bash
# Verificar versión compatible
pip install asyncpg==0.30.0
```

---

## ✅ Checklist de Validación Final

### Validaciones Técnicas
- [ ] Contenedor PostgreSQL 17.7 en ejecución
- [ ] Salud de BD via `pg_isready`
- [ ] Migraciones aplicadas correctamente
- [ ] Backend conecta a BD sin errores
- [ ] Tests unitarios pasan
- [ ] Login con usuario seed funciona

### Validaciones Funcionales
- [ ] CRUD de pacientes opera correctamente
- [ ] Generación de PDF funciona
- [ ] UI carga datos desde backend

### Validaciones de Switching
- [ ] Cambio a modo Supabase funciona
- [ ] Retorno a modo local funciona
- [ ] Datos consistentes entre modos

---

## 📊 Métricas y Monitoreo

### Métricas Clave de PostgreSQL 17
```sql
-- Conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Tamaño de BD
SELECT pg_size_pretty(pg_database_size('consultamed'));

-- Tuples leídas/escritas
SELECT 
  schemaname,
  tablename,
  seq_tup_read,
  seq_tup_wrapped
FROM pg_stat_user_tables;
```

### Métricas de Rendimiento
```bash
# Latencia de consulta
docker exec consultamed-db psql -U postgres -c "\timing on"

-- Ejecutar consulta y medir
SELECT count(*) FROM patients;
```

---

## 📚 Referencias y Recursos Adicionales

### Documentación Oficial
- [PostgreSQL 17 Release Notes](https://www.postgresql.org/docs/release/17.0/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [FastAPI Database Guide](https://fastapi.tiangolo.com/tutorial/sql-databases/)

### Scripts Útiles
```bash
# Backup de BD local
docker exec consultamed-db pg_dump -U postgres consultamed > backup.sql

# Restore desde backup
docker exec -i consultamed-db psql -U postgres consultamed < backup.sql

# Verificar versión de PostgreSQL en container
docker exec consultamed-db psql -U postgres -c "SELECT version();"
```

### Comandos de Diagnóstico
```bash
# Estado completo de Docker
docker system df
docker system events

# Logs en tiempo real
docker logs -f consultamed-db

# Entrar a container
docker exec -it consultamed-db bash
```

---

## 🔮 Consideraciones Futuras

### Próximos Pasos Recomendados
1. **Implementar monitoreo** con Prometheus/Grafana
2. **Configurar backups automáticos** a almacenamiento externo
3. **Establecer políticas de retención** de logs y backups
4. **Evaluar replication** para alta disponibilidad
5. **Considerar connection pooling** con PgBouncer

### Mejoras Continuas
- Automatizar testing de switching en CI/CD
- Implementar health checks más granulares
- Agregar métricas de rendimiento business-critical
- Documentar procedimientos de escalado horizontal

---

## 🎓 Conclusión

Esta guía ha demostrado el proceso completo y controlado de migración desde una arquitectura basada únicamente en Supabase hacia un despliegue dual con PostgreSQL 17 local como ruta principal. 

**Lecciones clave aprendidas:**
- La configuración dual provee flexibilidad y reduce riesgo vendor lock-in
- Los scripts idempotentes son esenciales para reproducibilidad
- La validación en cada fase mitiga riesgo de errores en producción
- Los procedimientos de rollback bien definidos permiten recuperación rápida

**Best practices implementadas:**
- Version explícita de PostgreSQL (17.7)
- Separación clara de configuraciones por modo
- Validaciones automáticas de salud y conectividad
- Documentación completa de troubleshooting

Con esta base técnica y documentación, el equipo tiene la capacidad de gestionar la infraestructura de BD de forma autónoma y preparada para escalamiento futuro.

---

*Última actualización: 2026-02-12*  
*Versión: 1.0*  
*Estado: Validado y en producción*
