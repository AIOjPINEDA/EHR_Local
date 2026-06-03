@echo off
setlocal
REM ConsultaMed - Registra una tarea programada diaria de backup de la BD.
REM Ejecuta `repo-tool backup` cada dia a las 22:00 (pg_dump comprimido + rotacion).

for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta disponible en PATH.
    pause
    exit /b 1
)

set "TASK_NAME=ConsultaMedBackup"
set "RUN_CMD=node \"%ROOT_DIR%\scripts\repo-tool.mjs\" backup"

echo Registrando tarea programada diaria '%TASK_NAME%' a las 22:00...
schtasks /create /tn "%TASK_NAME%" /tr "cmd /c %RUN_CMD%" /sc daily /st 22:00 /f
set "RC=%errorlevel%"

echo.
if %RC% neq 0 (
    echo No se pudo registrar la tarea. Ejecuta este .bat como administrador si es necesario.
) else (
    echo Tarea '%TASK_NAME%' registrada. Verifica con: schtasks /query /tn "%TASK_NAME%"
    echo Destino de backups: %%CONSULTAMED_BACKUP_DIR%% o %%USERPROFILE%%\ConsultaMed-Backups
    echo Recomendado: apunta CONSULTAMED_BACKUP_DIR a un disco/USB cifrado (BitLocker).
)
pause
endlocal
exit /b %RC%
