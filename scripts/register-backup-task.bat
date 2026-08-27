@echo off
setlocal
REM ConsultaMed - Registra una tarea programada diaria de backup de la BD.
REM Ejecuta `repo-tool backup` cada dia a las 22:00 (pg_dump comprimido + rotacion).
REM
REM Se registra via PowerShell (no schtasks) para poder activar StartWhenAvailable:
REM con schtasks, si el portatil esta apagado o suspendido a las 22:00 la ejecucion
REM se pierde sin recuperarse y sin dejar rastro, que es como una consulta puede
REM pasar meses creyendo que tiene backups sin tener ninguno.

for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta disponible en PATH.
    pause
    exit /b 1
)

set "TASK_NAME=ConsultaMedBackup"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-backup-task.ps1" -RepoRoot "%ROOT_DIR%" -TaskName "%TASK_NAME%"
set "RC=%errorlevel%"

echo.
if %RC% neq 0 (
    echo No se pudo registrar la tarea. Ejecuta este .bat como administrador si es necesario.
) else (
    echo Tarea '%TASK_NAME%' registrada.
    echo   Comprobar estado : schtasks /query /tn "%TASK_NAME%" /v /fo list
    echo   Ejecutar ahora   : schtasks /run /tn "%TASK_NAME%"
    echo   Log de backups   : %ROOT_DIR%\logs\backup.log
    echo.
    echo Destino de backups: %%CONSULTAMED_BACKUP_DIR%% o %%USERPROFILE%%\ConsultaMed-Backups
    echo Recomendado: apunta CONSULTAMED_BACKUP_DIR a un disco/USB cifrado ^(BitLocker^).
)
pause
endlocal
exit /b %RC%
