@echo off
setlocal

REM ConsultaMed - Inicio rapido para Windows
REM Arranca base de datos, backend y frontend, esperando a que cada servicio
REM responda de verdad antes de continuar con el siguiente.

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

REM ---------------------------------------------------------------------------
REM 1. Docker: CLI presente y daemon en marcha
REM ---------------------------------------------------------------------------
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker CLI no esta disponible en PATH.
    echo Instala Docker Desktop antes de usar este acceso directo.
    goto :error_exit
)

call :ensure_docker
if %errorlevel% neq 0 goto :error_exit

REM ---------------------------------------------------------------------------
REM 2. Preflight: venv, node_modules, .env, puerto de PostgreSQL, cache de Next
REM    Un unico paso que explica exactamente que falta si algo no esta listo.
REM ---------------------------------------------------------------------------
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta disponible en PATH. Instala Node 20+.
    goto :error_exit
)

node scripts\repo-tool.mjs preflight
if %errorlevel% neq 0 (
    echo.
    echo Corrige los problemas indicados arriba y vuelve a ejecutar start.bat.
    echo Si es la primera vez en este equipo, ejecuta scripts\bootstrap.bat.
    goto :error_exit
)

REM ---------------------------------------------------------------------------
REM 3. Base de datos
REM ---------------------------------------------------------------------------
node scripts\repo-tool.mjs setup-local-db
if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudo preparar la base de datos local.
    goto :error_exit
)

REM ---------------------------------------------------------------------------
REM 4. Backend: arrancar solo si no hay ya uno escuchando, y esperar a /health
REM ---------------------------------------------------------------------------
call :port_busy 8000
if %errorlevel% equ 0 (
    echo Backend ya en marcha en el puerto 8000. Se reutiliza.
) else (
    echo Arrancando backend...
    start "ConsultaMed Backend" cmd /k "cd /d ""%ROOT_DIR%"" && node scripts\repo-tool.mjs start-backend --reload"
)

node scripts\repo-tool.mjs wait-for --url http://127.0.0.1:8000/health --timeout 120 --label "backend (http://127.0.0.1:8000)"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: el backend no respondio a tiempo. Revisa la ventana "ConsultaMed Backend".
    goto :error_exit
)

REM ---------------------------------------------------------------------------
REM 5. Frontend: igual, y esperando a la primera compilacion de Next.js
REM ---------------------------------------------------------------------------
call :port_busy 3000
if %errorlevel% equ 0 (
    echo Frontend ya en marcha en el puerto 3000. Se reutiliza.
) else (
    echo Arrancando frontend...
    start "ConsultaMed Frontend" cmd /k "cd /d ""%ROOT_DIR%\frontend"" && npm.cmd run dev"
)

node scripts\repo-tool.mjs wait-for --url http://localhost:3000 --timeout 180 --label "frontend (http://localhost:3000)"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: el frontend no respondio a tiempo. Revisa la ventana "ConsultaMed Frontend".
    goto :error_exit
)

REM ---------------------------------------------------------------------------
REM 6. Verificacion post-arranque (salud + runtime GTK3 para recetas PDF)
REM ---------------------------------------------------------------------------
node scripts\repo-tool.mjs smoke
if %errorlevel% neq 0 (
    echo.
    echo AVISO: la verificacion post-arranque fallo. La aplicacion se abrira igualmente,
    echo pero revisa los mensajes de arriba ^(por ejemplo el runtime GTK3 de recetas PDF^).
)

start http://localhost:3000

echo.
echo ================================================
echo  ConsultaMed en marcha: http://localhost:3000
echo  Login: sara@consultamed.es / piloto2026
echo  Para detenerlo: scripts\windows\stop-consultamed.bat
echo ================================================
echo.
echo Puedes cerrar esta ventana. Las ventanas "ConsultaMed Backend" y
echo "ConsultaMed Frontend" deben permanecer abiertas.
pause
endlocal
exit /b 0

:error_exit
echo.
pause
endlocal
exit /b 1

REM ---------------------------------------------------------------------------
REM Devuelve 0 si el puerto %1 tiene un proceso escuchando, 1 si esta libre.
REM ---------------------------------------------------------------------------
:port_busy
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
exit /b %errorlevel%

:ensure_docker
docker info >nul 2>&1
if %errorlevel% equ 0 exit /b 0

set "DOCKER_DESKTOP_EXE="
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    set "DOCKER_DESKTOP_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
)
if not defined DOCKER_DESKTOP_EXE if exist "%LocalAppData%\Docker\Docker Desktop.exe" (
    set "DOCKER_DESKTOP_EXE=%LocalAppData%\Docker\Docker Desktop.exe"
)
if not defined DOCKER_DESKTOP_EXE if exist "%LocalAppData%\Programs\Docker\Docker\Docker Desktop.exe" (
    set "DOCKER_DESKTOP_EXE=%LocalAppData%\Programs\Docker\Docker\Docker Desktop.exe"
)

if not defined DOCKER_DESKTOP_EXE (
    echo ERROR: Docker daemon no esta disponible y no se encontro Docker Desktop instalado.
    exit /b 1
)

echo Docker no esta corriendo. Iniciando Docker Desktop...
start "" "%DOCKER_DESKTOP_EXE%"
set /a WAIT_SECONDS=0

:wait_for_docker
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if %errorlevel% equ 0 exit /b 0

set /a WAIT_SECONDS+=2
if %WAIT_SECONDS% geq 90 (
    echo ERROR: Docker Desktop no quedo listo tras 90 segundos.
    echo Abre Docker Desktop manualmente y vuelve a intentar.
    exit /b 1
)

echo Esperando a que Docker este listo...
goto :wait_for_docker
