@echo off
chcp 65001 >nul
REM Copia de seguridad de la base de datos (recomendado: una vez al día).
REM Requiere que la carpeta bin de PostgreSQL esté en el PATH
REM (ej.: C:\Program Files\PostgreSQL\16\bin).
cd /d "%~dp0.."
if not exist respaldos mkdir respaldos
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set FECHA=%%i
set PGPASSWORD=postgres
pg_dump -h localhost -U postgres -F c -f "respaldos\piopio_%FECHA%.backup" asadero_pio_pio
if errorlevel 1 ( echo [X] No se pudo hacer el respaldo & pause & exit /b 1 )
echo   Respaldo guardado en respaldos\piopio_%FECHA%.backup
echo   Para restaurarlo: pg_restore -h localhost -U postgres -d asadero_pio_pio --clean "respaldos\piopio_%FECHA%.backup"
pause
