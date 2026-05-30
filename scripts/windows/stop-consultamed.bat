@echo off
REM ConsultaMed - Detener servicios
REM Solo detiene procesos y contenedor; los datos se preservan para el siguiente arranque.

echo Deteniendo frontend (puerto 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo Deteniendo backend (puerto 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo Deteniendo base de datos...
docker stop consultamed-db >nul 2>&1

echo.
echo Servicios detenidos. El contenedor consultamed-db se conserva con sus datos.
echo Para destruirlo completamente: docker rm consultamed-db
pause
