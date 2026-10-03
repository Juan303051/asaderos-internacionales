#!/usr/bin/env bash
# Publica versiones listas para copiar al computador del local (no necesitan .NET instalado).
cd "$(dirname "$0")/.." || exit 1
dotnet publish src/AsaderoPioPio -c Release -r win-x64   --self-contained true -p:PublishSingleFile=true -o publicado/windows
dotnet publish src/AsaderoPioPio -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true -o publicado/mac
echo "✔ Listo: carpetas publicado/windows (AsaderoPioPio.exe) y publicado/mac"
