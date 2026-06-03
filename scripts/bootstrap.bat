@echo off
setlocal
REM ConsultaMed - Bootstrap de entorno (primera vez)
REM Crea backend\.venv, instala dependencias backend/frontend, prepara .env
REM y verifica prerequisitos (Docker, GTK3 para recetas PDF).

for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta disponible en PATH. Instala Node 20+ primero.
    pause
    exit /b 1
)

node scripts\repo-tool.mjs bootstrap
set "RC=%errorlevel%"

echo.
if %RC% neq 0 (
    echo Bootstrap fallo. Revisa los mensajes anteriores.
) else (
    echo Bootstrap finalizado. Revisa los avisos anteriores si los hubiera.
)
pause
endlocal
exit /b %RC%
