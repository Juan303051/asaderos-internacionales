#!/usr/bin/env bash
# Asadero Pío Pío · Control de pollos — inicia el sistema en Mac o Linux
cd "$(dirname "$0")/.." || exit 1
if ! command -v dotnet >/dev/null 2>&1; then
  echo "✖ No se encontró .NET 8. Descárguelo de https://dotnet.microsoft.com/download/dotnet/8.0"
  exit 1
fi
echo "🍗 Iniciando Asadero Pío Pío… (la primera vez tarda un poco más)"
dotnet run --project src/AsaderoPioPio -c Release
