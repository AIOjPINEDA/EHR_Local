@echo off
REM ConsultaMed - Detener servicios

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
docker stop consultamed-db >nul 2>&1
docker rm consultamed-db >nul 2>&1

echo Servicios detenidos.
pause
