@echo off
REM ConsultaMed - Inicio rapido para Windows
cd /d "%~dp0..\.."

REM Verificar Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta corriendo. Inicia Docker Desktop primero.
    pause
    exit /b 1
)

REM Iniciar base de datos
call scripts\setup-local-db.sh

REM Iniciar backend y frontend en ventanas separadas
start "Backend" cmd /k "cd /d "%~dp0..\..\" && cd backend && .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /k "cd /d "%~dp0..\..\" && cd frontend && npm run dev"

REM Abrir navegador
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Aplicacion iniciada: http://localhost:3000
echo Login: sara@consultamed.es / piloto2026
pause
