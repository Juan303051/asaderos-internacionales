#!/usr/bin/env bash
# =====================================================================
#  Prueba de permisos de Asadero Pío Pío (versión 4.0)
#  Cada rol intenta lo que SÍ y lo que NO debería poder hacer, y se comprueba que
#  el servidor responda 200 (permitido) o 403 (prohibido).
#
#  ⚠ Úsalo en una COPIA DE PRUEBA: crea dos usuarios de prueba
#    (prueba.cajero@piopio.test y prueba.supervisor@piopio.test) y deja
#    registros en la bitácora. Al terminar los DESACTIVA.
#
#  Uso:   URL=http://localhost:5090 scripts/prueba-permisos.sh
#  Opciones (variables de entorno):
#    URL (obligatoria)  ADMIN_CORREO=admin@piopio.com  ADMIN_CLAVE='PioPio2026*'
#    CONFIRMAR=SI  → no pregunta (para automatizar)
#  Espera 1 minuto entre ejecuciones (el ingreso admite 8 intentos por minuto).
#  Necesita: curl y python3.
# =====================================================================
[ -n "$URL" ] || { echo "Indica la dirección de la copia de PRUEBA, por ejemplo:  URL=http://localhost:5090 $0"; exit 2; }
B=$URL
if [ "$CONFIRMAR" != "SI" ]; then
  echo "Este script CREA usuarios de prueba y deja registros en la bitácora de: $B"
  read -r -p "¿Es una copia de PRUEBA y no el sistema real del asadero? Escribe SI para continuar: " r
  [ "$r" = "SI" ] || { echo "Cancelado. No se hizo ningún cambio."; exit 2; }
fi
ADMIN_CORREO=${ADMIN_CORREO:-admin@piopio.com}
ADMIN_CLAVE=${ADMIN_CLAVE:-PioPio2026*}
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
CAJ=prueba.cajero@piopio.test; SUP=prueba.supervisor@piopio.test
CLAVE_TEMP='Temporal2026x'; CLAVE_FINAL='Prueba2026x'
FALLOS=0

estado() { # jar metodo ruta [json] → código HTTP
  if [ -n "$4" ]; then curl -s -o /dev/null -w '%{http_code}' -b "$T/$1" -c "$T/$1" -X "$2" -H 'Content-Type: application/json' -d "$4" "$B$3"
  else curl -s -o /dev/null -w '%{http_code}' -b "$T/$1" -c "$T/$1" -X "$2" "$B$3"; fi
}
cuerpo() { curl -s -b "$T/$1" -c "$T/$1" -X "$2" -H 'Content-Type: application/json' ${4:+-d "$4"} "$B$3"; }
esperar() { if [ "$2" = "$3" ]; then echo "  ✔ $1 → $3"; else echo "  ✖ $1 → esperaba $2 y dio $3"; FALLOS=$((FALLOS+1)); fi; }
entrar() { # jar correo clave
  estado "$1" POST /api/auth/entrar "{\"correo\":\"$2\",\"clave\":\"$3\"}"
}
probar() { # rol jar esperado "METODO RUTA|json" ...
  local nombre=$1 jar=$2 esperado=$3; shift 3
  for r in "$@"; do
    local linea=${r%%|*} json=${r#*|}; [ "$json" = "$r" ] && json=""
    esperar "$linea" "$esperado" "$(estado "$jar" "${linea%% *}" "${linea#* }" "$json")"
  done
}
sesion_de_prueba() { # jar correo → inicia sesión; si aún tiene la clave temporal, la cambia
  local jar=$1 correo=$2
  if [ "$(entrar "$jar" "$correo" "$CLAVE_FINAL")" != 200 ]; then
    [ "$(entrar "$jar" "$correo" "$CLAVE_TEMP")" = 200 ] || { echo "No se pudo entrar como $correo"; exit 1; }
    estado "$jar" POST /api/auth/cambiar-clave "{\"actual\":\"$CLAVE_TEMP\",\"nueva\":\"$CLAVE_FINAL\"}" >/dev/null
  fi
}

echo "▶ Preparando usuarios de prueba en $B"
[ "$(entrar adm "$ADMIN_CORREO" "$ADMIN_CLAVE")" = 200 ] || { echo "No se pudo entrar como administrador (revisa ADMIN_CORREO y ADMIN_CLAVE)."; exit 1; }
for par in "Prueba Cajero|$CAJ|cajero" "Prueba Supervisor|$SUP|supervisor"; do
  IFS='|' read -r nombre correo rol <<<"$par"
  estado adm POST /api/usuarios "{\"nombre\":\"$nombre\",\"correo\":\"$correo\",\"clave\":\"$CLAVE_TEMP\",\"rol\":\"$rol\"}" >/dev/null
  id=$(cuerpo adm GET /api/usuarios | python3 -c "import sys,json;print(next(u['id'] for u in json.load(sys.stdin) if u['correo']=='$correo'))")
  estado adm PUT "/api/usuarios/$id" "{\"nombre\":\"$nombre\",\"rol\":\"$rol\",\"activo\":true}" >/dev/null   # por si quedó desactivado
  eval "ID_${rol}=$id"
done
sesion_de_prueba caj "$CAJ"; sesion_de_prueba sup "$SUP"

COMPRA='{"cantidad":5,"costoUnitario":1000,"fecha":"2026-01-01"}'
AJUSTE='{"tipo":"merma","cantidad":1,"motivo":"prueba de permisos"}'

echo; echo "CAJERO — solo vende y consulta existencias (lo prohibido debe dar 403)"
probar cajero caj 403 "POST /api/compras|$COMPRA" "POST /api/ajustes|$AJUSTE" 'PUT /api/configuracion/stock-minimo|{"valor":1}' \
  "POST /api/compras/1/anular" 'POST /api/compras/1/devoluciones|{"cantidad":1}' "POST /api/ventas/1/anular" "GET /api/compras" \
  "GET /api/presentaciones" 'POST /api/presentaciones|{"nombre":"x","precio":1,"equivalente":1}' "GET /api/usuarios" \
  'POST /api/usuarios|{"nombre":"Hack","correo":"h@h.co","clave":"Hack12345","rol":"admin"}' "GET /api/auditoria" "GET /api/reportes" \
  "GET /api/caja" 'POST /api/caja/cierres|{"base":0,"contado":0}' "GET /api/gastos" 'POST /api/gastos|{"concepto":"abc","categoria":"otros","valor":5}'
echo "  — y lo permitido debe dar 200"
probar cajero caj 200 "GET /api/resumen" "GET /api/movimientos" "GET /api/ventas" "GET /api/auth/yo"

echo; echo "SUPERVISOR — reportes y caja, sin tocar inventario ni equipo"
probar supervisor sup 403 "POST /api/compras|$COMPRA" "POST /api/ajustes|$AJUSTE" 'PUT /api/configuracion/stock-minimo|{"valor":1}' \
  "POST /api/ventas/1/anular" "GET /api/presentaciones" "GET /api/usuarios" "GET /api/auditoria" "GET /api/gastos" "GET /api/compras"
echo "  — y lo permitido debe dar 200"
probar supervisor sup 200 "GET /api/reportes" "GET /api/caja" "GET /api/ventas?fecha=2026-01-01" "GET /api/resumen" "GET /api/movimientos"

echo; echo "ADMINISTRADOR — todo"
probar administrador adm 200 "GET /api/compras" "GET /api/presentaciones" "GET /api/usuarios" "GET /api/auditoria" "GET /api/reportes" "GET /api/caja" "GET /api/gastos"

echo; echo "SIN SESIÓN — todo debe dar 401"
probar anonimo anon 401 "GET /api/resumen" 'POST /api/ventas|{"items":[]}' "GET /api/usuarios"

echo; echo "REGLAS DE LA GESTIÓN DE USUARIOS"
MI_ID=$(cuerpo adm GET /api/usuarios | python3 -c "import sys,json;print(next(u['id'] for u in json.load(sys.stdin) if u['esYo']))")
esperar "el administrador no puede quitarse su propio rol" 400 "$(estado adm PUT "/api/usuarios/$MI_ID" '{"nombre":"Admin","rol":"cajero","activo":true}')"
esperar "el administrador no puede desactivarse" 400 "$(estado adm PUT "/api/usuarios/$MI_ID" '{"nombre":"Admin","rol":"admin","activo":false}')"
esperar "contraseña débil rechazada al crear usuario" 400 "$(estado adm POST /api/usuarios '{"nombre":"Debil","correo":"debil@piopio.test","clave":"abc","rol":"cajero"}')"
esperar "rol inventado rechazado" 400 "$(estado adm POST /api/usuarios '{"nombre":"Raro","correo":"raro@piopio.test","clave":"Clave12345","rol":"superadmin"}')"

echo; echo "CAMBIO DE ROL AL INSTANTE (el cajero tiene la sesión abierta)"
esperar "antes: el cajero no puede ver reportes" 403 "$(estado caj GET /api/reportes)"
estado adm PUT "/api/usuarios/$ID_cajero" "{\"nombre\":\"Prueba Cajero\",\"rol\":\"supervisor\",\"activo\":true}" >/dev/null
esperar "después de subirlo a supervisor: ya puede ver reportes" 200 "$(estado caj GET /api/reportes)"
estado adm PUT "/api/usuarios/$ID_cajero" "{\"nombre\":\"Prueba Cajero\",\"rol\":\"cajero\",\"activo\":true}" >/dev/null
esperar "al devolverlo a cajero: vuelve a dar 403" 403 "$(estado caj GET /api/reportes)"
estado adm PUT "/api/usuarios/$ID_cajero" "{\"nombre\":\"Prueba Cajero\",\"rol\":\"cajero\",\"activo\":false}" >/dev/null
esperar "al desactivarlo, su sesión abierta deja de funcionar" 401 "$(estado caj GET /api/resumen)"

# Deja las cuentas de prueba desactivadas
estado adm PUT "/api/usuarios/$ID_supervisor" "{\"nombre\":\"Prueba Supervisor\",\"rol\":\"supervisor\",\"activo\":false}" >/dev/null

echo
if [ "$FALLOS" -eq 0 ]; then echo "✔ TODO BIEN: los permisos se cumplen en el servidor."; else echo "✖ FALLOS: $FALLOS"; exit 1; fi
