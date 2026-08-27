@echo off
setlocal enabledelayedexpansion

REM ConsultaMed - Detener servicios
REM Solo detiene procesos y contenedor; los datos se preservan para el siguiente arranque.

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

call :stop_port 3000 frontend
call :stop_port 8000 backend

echo Deteniendo base de datos...
docker stop consultamed-db >nul 2>&1
if %errorlevel% equ 0 (
    echo   base de datos detenida.
) else (
    echo   AVISO: no se pudo detener el contenedor consultamed-db ^(quiza ya estaba parado^).
)

REM Verificar de verdad que los puertos han quedado libres antes de dar el OK.
set "STILL_UP="
call :port_busy 3000
if !errorlevel! equ 0 set "STILL_UP=!STILL_UP! 3000"
call :port_busy 8000
if !errorlevel! equ 0 set "STILL_UP=!STILL_UP! 8000"

echo.
if defined STILL_UP (
    echo ERROR: siguen ocupados los puertos:!STILL_UP!
    echo Procesos que continuan escuchando:
    for %%P in (!STILL_UP!) do (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do echo   puerto %%P -^> PID %%a
    )
    echo.
    echo Cierralos manualmente ^(Administrador de tareas^) y vuelve a ejecutar este script.
    pause
    endlocal
    exit /b 1
)

echo Servicios detenidos. El contenedor consultamed-db se conserva con sus datos.
echo Para destruirlo completamente: docker rm consultamed-db
pause
endlocal
exit /b 0

REM ---------------------------------------------------------------------------
REM Mata todo el arbol de procesos que escucha en el puerto %1.
REM /T es imprescindible: `uvicorn --reload` y `next dev` son arboles de procesos,
REM y matar solo el PID del socket deja hijos huerfanos escuchando.
REM ---------------------------------------------------------------------------
:stop_port
echo Deteniendo %~2 ^(puerto %~1^)...
set "FOUND="
set "SEEN= "
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
    if not "%%a"=="0" (
        echo !SEEN! | findstr /C:" %%a " >nul 2>&1
        if errorlevel 1 (
            set "SEEN=!SEEN!%%a "
            set "FOUND=1"
            taskkill /PID %%a /F /T >nul 2>&1
            if !errorlevel! equ 0 (
                echo   PID %%a terminado.
            ) else (
                echo   AVISO: no se pudo terminar el PID %%a.
            )
        )
    )
)
if not defined FOUND echo   no habia nada escuchando.
exit /b 0

REM Devuelve 0 si el puerto %1 tiene un proceso escuchando, 1 si esta libre.
:port_busy
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
exit /b %errorlevel%
