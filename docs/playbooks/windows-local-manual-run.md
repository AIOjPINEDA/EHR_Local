# Windows Local Run - Guía mínima (estilo macOS)

Objetivo: usar los comandos más cortos posibles.

Empieza siempre en la raíz del repo:

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local"
```

---

## 1) Modo mínimo (recomendado)

### 1.1 Primera vez (un solo paso)

Requisitos previos instalados: **Python 3.11**, **Node.js 20+**, **Docker Desktop**,
**GTK3-Runtime Win64** (para recetas PDF). Si el backend se queja de `greenlet`,
instala además **VC++ redistributable** (ver sección 5).

Doble clic en `scripts\bootstrap.bat`, o desde PowerShell en la raíz del repo:

```powershell
.\scripts\bootstrap.bat
```

Crea `backend\.venv`, instala dependencias de backend y frontend, prepara los `.env`
y avisa si falta algún prerequisito (Docker, GTK3). Es idempotente: puedes repetirlo
sin romper nada.

### 1.2 Cada día

Doble clic en `start.bat` (arranca Docker DB + backend + frontend y abre el navegador).

El arranque del backend pasa por `repo-tool start-backend`, que antepone el runtime
GTK3 al PATH para que WeasyPrint genere recetas PDF, con un guard que falla rápido y
con mensaje claro si GTK3 no está disponible.

---

## 2) Modo manual (avanzado / diagnóstico)

Alternativa a `bootstrap.bat` si necesitas ejecutar los pasos uno a uno.
Úsalo para diagnóstico o para evitar errores por archivos ya existentes.

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local\backend"
if (!(Test-Path .venv\Scripts\python.exe)) { py -3.11 -m venv .venv }
Copy-Item .env.example .env -Force

cd ..\frontend
if (!(Test-Path .env.local)) { "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" | Out-File -Encoding ascii .env.local }
```

Resumen:
- `if`: evita crear/reemplazar cosas si ya existen.
- `-Force`: reemplaza sin preguntar.

---

## 3) Verificación rápida

Verificación automática (salud + render de receta PDF):

```powershell
node scripts\repo-tool.mjs smoke
```

`start.bat` ya ejecuta este smoke al final del arranque y avisa si algo falla.

Manual:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get
```

Frontend:
- http://localhost:3000
- si está ocupado: http://localhost:3001

Login:
- Email: sara@consultamed.es
- Password: piloto2026

---

## 3.5) Copia de seguridad de la base de datos

Backup manual (pg_dump comprimido con rotación de los últimos 14):

```powershell
node scripts\repo-tool.mjs backup
```

Restaurar desde un backup (SOBRESCRIBE los datos actuales):

```powershell
node scripts\repo-tool.mjs restore "C:\ruta\al\consultamed-XXXX.sql.gz" --yes
```

Backup automático diario (registra una tarea programada a las 22:00):

```powershell
.\scripts\register-backup-task.bat
```

Destino de los backups: variable `CONSULTAMED_BACKUP_DIR`, o por defecto
`%USERPROFILE%\ConsultaMed-Backups`. Número de copias a conservar:
`CONSULTAMED_BACKUP_KEEP` (por defecto 14).

> **Protección de datos clínicos (LOPD/GDPR).** Los datos viven en un único PC.
> Apunta `CONSULTAMED_BACKUP_DIR` a un disco externo o USB **cifrado con BitLocker**
> y activa BitLocker en el disco del sistema para cifrado en reposo. El backup por sí
> solo no protege frente a robo del equipo si el disco no está cifrado.

---

## 4) Parar todo

- En backend/frontend: `Ctrl + C`
- DB:

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local"
docker compose down
```

---

## 5) Problemas comunes

### `uvicorn` no se reconoce

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### `npm` o `node` no se reconoce

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" run dev
```

### `greenlet` DLL load failed

```powershell
winget install --id abbodi1406.vcredist --exact --silent --accept-source-agreements --accept-package-agreements
cd "C:\Users\Asus 0001\Repos\EHR_Local\backend"
.\.venv\Scripts\python.exe -m pip install --force-reinstall --no-cache-dir greenlet==3.3.1 sqlalchemy==2.0.25
```

### Login 500 por `.env` antiguo

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local\backend"
Copy-Item .env.example .env -Force
```
