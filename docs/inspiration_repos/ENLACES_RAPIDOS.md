# 🔗 Enlaces Rápidos - EHR Project

## 📂 Documentación

| Documento | Propósito | Para quién |
|-----------|-----------|------------|
| [README.md](README.md) | Índice principal | Todos |
| [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md) | Guía rápida (10 min) | Managers, Tech Leads |
| [ehr_open_source_guide.md](ehr_open_source_guide.md) | Guía completa (60 min) | Desarrolladores, Arquitectos |
| [ehr_code_examples.md](ehr_code_examples.md) | Ejemplos de código | Desarrolladores |
| [CHECKLIST_IMPLEMENTACION.md](CHECKLIST_IMPLEMENTACION.md) | Plan de 6 semanas | Project Managers |

---

## 🔗 Repositorios GitHub

### Opción Recomendada: FastAPI Healthcare ⭐
https://github.com/devalentineomonya/Health-Care-Management-System-Python-FastAPI

**Clonar:**
```bash
git clone https://github.com/devalentineomonya/Health-Care-Management-System-Python-FastAPI.git
```

### Alternativas:
- **Beda EMR** (FHIR): https://github.com/beda-software/fhir-emr
- **Next.js EHR**: https://github.com/peteregbujie/ehr

---

## 📚 Documentación Externa

### Frameworks
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Pydantic: https://docs.pydantic.dev/
- Next.js: https://nextjs.org/docs

### Standards
- FHIR R5: https://www.hl7.org/fhir/R5/
- LOINC Codes: https://loinc.org/
- ICD-10: https://www.who.int/standards/classifications/classification-of-diseases

### Database
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation
- pgcrypto: https://www.postgresql.org/docs/current/pgcrypto.html

### Security
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- HIPAA: https://www.hhs.gov/hipaa/
- JWT Best Practices: https://jwt.io/introduction

---

## 🛠️ Herramientas

### Desarrollo
- VS Code: https://code.visualstudio.com/
- Docker Desktop: https://www.docker.com/products/docker-desktop
- Postman: https://www.postman.com/
- DBeaver (PostgreSQL client): https://dbeaver.io/

### Testing
- pytest: https://docs.pytest.org/
- Postman Collections
- curl commands (ver ejemplos en docs)

### Deployment
- Docker Hub: https://hub.docker.com/
- AWS: https://aws.amazon.com/
- DigitalOcean: https://www.digitalocean.com/
- Heroku: https://www.heroku.com/

### Monitoring
- Prometheus: https://prometheus.io/
- Grafana: https://grafana.com/
- Sentry: https://sentry.io/
- UptimeRobot: https://uptimerobot.com/

---

## 💻 Comandos Rápidos

### Setup Inicial
```bash
# Clonar y entrar
git clone https://github.com/devalentineomonya/Health-Care-Management-System-Python-FastAPI.git
cd Health-Care-Management-System-Python-FastAPI

# Setup
cp .env.example .env
docker-compose up -d

# Verificar
curl http://localhost:8000/docs
```

### Desarrollo
```bash
# Logs
docker-compose logs -f api

# Entrar a container
docker-compose exec api bash

# Tests
docker-compose exec api pytest tests/ -v

# Reiniciar servicios
docker-compose restart
```

### Base de Datos
```bash
# Conectar a PostgreSQL
docker-compose exec postgres psql -U healthcare_user healthcare_db

# Backup
docker-compose exec postgres pg_dump -U healthcare_user healthcare_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U healthcare_user healthcare_db < backup.sql

# Migrations
docker-compose exec api alembic upgrade head
```

---

## 📞 Soporte

### Comunidades
- FastAPI Discord: https://discord.gg/fastapi
- Stack Overflow: https://stackoverflow.com/questions/tagged/fastapi
- Reddit r/FastAPI: https://www.reddit.com/r/FastAPI/

### Issues
- Reportar bugs en GitHub Issues del proyecto

---

## 📝 Checklist Pre-Inicio

- [ ] Leer README.md
- [ ] Leer RESUMEN_EJECUTIVO.md
- [ ] Revisar CHECKLIST_IMPLEMENTACION.md
- [ ] Clonar repositorio
- [ ] Instalar Docker
- [ ] Configurar .env
- [ ] Levantar servicios
- [ ] Verificar Swagger UI

---

**Última actualización:** 7 de Febrero 2026
