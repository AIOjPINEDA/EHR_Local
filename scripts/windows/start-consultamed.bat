@echo off
setlocal

REM ConsultaMed - Inicio rapido para Windows
for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

REM Verificar Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta corriendo. Inicia Docker Desktop primero.
    pause
    exit /b 1
)

REM Verificar backend local
if not exist "%ROOT_DIR%\backend\.venv\Scripts\python.exe" (
    echo ERROR: No se encontro backend\.venv\Scripts\python.exe
    echo Bootstrap esperado: backend\.venv con dependencias instaladas.
    pause
    exit /b 1
)

REM Verificar Node/NPM
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm no esta disponible en PATH.
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%\frontend\node_modules" (
    echo ERROR: No se encontro frontend\node_modules
    echo Ejecuta la instalacion del frontend antes de usar este acceso directo.
    pause
    exit /b 1
)

REM Iniciar base de datos con tooling nativo
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\repo-tool.ps1" setup-local-db
if %errorlevel% neq 0 (
    echo ERROR: No se pudo preparar la base de datos local.
    pause
    exit /b 1
)

REM Iniciar backend y frontend en ventanas separadas
start "Backend" cmd /k "cd /d ""%ROOT_DIR%"" && backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /k "cd /d ""%ROOT_DIR%\frontend"" && npm.cmd run dev"

REM Abrir navegador
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Aplicacion iniciada: http://localhost:3000
echo Login: sara@consultamed.es / piloto2026
pause
endlocal
