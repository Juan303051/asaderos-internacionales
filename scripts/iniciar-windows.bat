@echo off
chcp 65001 >nul
title Asadero Pio Pio - Control de pollos
cd /d "%~dp0.."
echo.
echo   ASADERO PIO PIO - Control de pollos
echo   Iniciando el sistema... (la primera vez tarda un poco mas)
echo.
where dotnet >nul 2>nul
if errorlevel 1 (
  echo   [X] No se encontro .NET 8. Descarguelo de https://dotnet.microsoft.com/download/dotnet/8.0
  echo       ^(elija ".NET SDK 8" para Windows^) y vuelva a abrir este archivo.
  pause
  exit /b 1
)
dotnet run --project src\AsaderoPioPio -c Release
pause
