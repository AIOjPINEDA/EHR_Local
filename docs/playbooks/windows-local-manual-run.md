# Windows Local Run - Guía mínima (estilo macOS)

Objetivo: usar los comandos más cortos posibles.

Empieza siempre en la raíz del repo:

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local"
```

---

## 1) Modo mínimo (recomendado)

### 1.1 Primera vez

```powershell
& "C:\Program Files\Git\bin\bash.exe" ./scripts/setup-local-db.sh

cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
cd ..

cd frontend
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" install
"NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" | Out-File -Encoding ascii .env.local
cd ..
```

### 1.2 Cada día

Terminal A (backend):

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local"
docker compose up -d db
cd backend
$env:Path = "C:\Program Files\GTK3-Runtime Win64\bin;" + $env:Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal B (frontend):

```powershell
cd "C:\Users\Asus 0001\Repos\EHR_Local\frontend"
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" run dev
```

---

## 2) Modo seguro (opcional)

Úsalo si quieres evitar errores por archivos ya existentes.

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
