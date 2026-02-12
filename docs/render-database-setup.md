# Configuración de Base de Datos en Render

## Pasos para configurar PostgreSQL en Render

### 1. Crear Base de Datos en Render

1. Ir a [Render Dashboard](https://dashboard.render.com/)
2. Click en "New +" → "PostgreSQL"
3. Configurar:
   - **Name**: `consultamed-db`
   - **Database Name**: `consultamed`
   - **User**: `consultamed_user` (o dejar el default)
   - **Region**: Eligir la más cercana a los usuarios (Europa)
   - **PostgreSQL Version**: 16 (latest)
   - **Instance Type**: Free para MVP (puede upgrade después)
4. Click en "Create Database"

### 2. Obtener URLs de Conexión

Una vez creada la base de datos, Render mostrará dos URLs:

**Internal Database URL** (para uso dentro de Render):
```
postgresql://USER:PASSWORD@dpg-XXXX-a/DATABASE
```

**External Database URL** (para acceso desde local/deployments):
```
postgresql://USER:PASSWORD@dpg-XXXX-a.REGION-postgres.render.com/DATABASE
```

### 3. Configurar Variables de Entorno

En el backend, agregar las siguientes variables de entorno:

```bash
# Para producción en Render
DATABASE_MODE=render_cloud
RENDER_DATABASE_URL=postgresql+asyncpg://user:password@host:5432/consultamed

# Para desarrollo local
DATABASE_MODE=local_pg17
```

### 4. Aplicar Migraciones

Desde el directorio del proyecto:

```bash
# Ver migraciones sin ejecutar (dry run)
python scripts/migrate_render.py --dry-run

# Aplicar migraciones
RENDER_DATABASE_URL="postgresql+asyncpg://user:password@host:5432/consultamed" python scripts/migrate_render.py
```

O usando psql directamente:

```bash
# Exportar la URL
export RENDER_EXTERNAL_DB_URL="postgresql://user:password@host:5432/consultamed"

# Aplicar migraciones en orden
psql $RENDER_EXTERNAL_DB_URL -f supabase/migrations/20260207202822_create_initial_schema.sql
psql $RENDER_EXTERNAL_DB_URL -f supabase/migrations/20260208090000_add_password_hash.sql
psql $RENDER_EXTERNAL_DB_URL -f supabase/migrations/20260208090100_add_encounter_soap_fields.sql
psql $RENDER_EXTERNAL_DB_URL -f supabase/migrations/20260207202849_seed_initial_data.sql
```

### 5. Verificar Configuración

```bash
# Verificar tablas creadas
psql $RENDER_EXTERNAL_DB_URL -c "\dt"

# Verificar practitioners (debe tener 2 registros)
psql $RENDER_EXTERNAL_DB_URL -c "SELECT COUNT(*) FROM practitioners;"

# Verificar patients (debe tener 3 registros)
psql $RENDER_EXTERNAL_DB_URL -c "SELECT COUNT(*) FROM patients;"
```

### 6. Configurar en Render (Backend)

En el dashboard de Render:
1. Ir al servicio del backend
2. "Environment" → "Add Environment Variable"
3. Agregar/actualizar:
   - `DATABASE_MODE=render_cloud`
   - `RENDER_DATABASE_URL=postgresql+asyncpg://user:password@host:5432/consultamed`

### Notas Importantes

- La base de datos de Render tiene un limite de conexiones en el plan free
- Usar siempre la URL con `+asyncpg` para el backend FastAPI
- La URL externa es útil para scripts de migración y backups
- Render incluye backups automáticos en planes pagados
- El plan free tiene sleep after 15 min de inactividad

## Troubleshooting

### Error: "too many connections"
- Upgrade del plan free o implementar connection pooling

### Error: "FATAL: database "consultamed" does not exist"
- Verificar que el nombre de la base de datos sea correcto
- Crear la base de datos si no existe

### Error: "permission denied for table"
- Verificar que el usuario tenga los permisos correctos
- Usar el usuario por defecto de Render o concesiones explícitas