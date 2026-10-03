@echo off
chcp 65001 >nul
REM Crea una carpeta "publicado\windows" con AsaderoPioPio.exe que funciona
REM en el computador del local SIN instalar .NET (solo necesita PostgreSQL).
cd /d "%~dp0.."
dotnet publish src\AsaderoPioPio -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publicado\windows
if errorlevel 1 ( echo [X] Error al publicar & pause & exit /b 1 )
echo.
echo   Listo: copie la carpeta publicado\windows al computador del asadero
echo   y abra AsaderoPioPio.exe (revise antes appsettings.json).
pause
