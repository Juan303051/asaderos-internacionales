#!/usr/bin/env bash
# Copia de seguridad de la base de datos (recomendado: una vez al día).
cd "$(dirname "$0")/.." || exit 1
mkdir -p respaldos
F="respaldos/piopio_$(date +%Y-%m-%d_%H%M).backup"
PGPASSWORD="${PGPASSWORD:-postgres}" pg_dump -h localhost -U postgres -F c -f "$F" asadero_pio_pio && echo "✔ Respaldo: $F"
echo "Para restaurar: pg_restore -h localhost -U postgres -d asadero_pio_pio --clean \"$F\""
