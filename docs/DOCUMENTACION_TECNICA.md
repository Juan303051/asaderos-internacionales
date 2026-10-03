# Documentación técnica · Asadero Pío Pío 4.0

## 1. Visión general

| Capa | Tecnología | Dónde |
|---|---|---|
| Página (frontend) | HTML + CSS + JavaScript sin frameworks | `src/AsaderoPioPio/wwwroot/` |
| Servidor (backend) | C# · ASP.NET Core 8 (minimal APIs) | `src/AsaderoPioPio/` |
| Base de datos | PostgreSQL 14+ | `database/` |
| Único paquete externo | `Npgsql` 8.0.5 (conector de PostgreSQL) | `AsaderoPioPio.csproj` |

El mismo servidor entrega la página y la API (`/api/...`). La base se crea y actualiza sola al arrancar.

```
Navegador ──(HTTP + cookie de sesión)──► Kestrel (ASP.NET Core)
                                          ├─ archivos estáticos (wwwroot)
                                          ├─ autenticación por cookie + revalidación del rol
                                          ├─ autorización por permiso (políticas)
                                          └─ endpoints ──► Db (Npgsql, consultas con parámetros) ──► PostgreSQL
```

## 2. Estructura de carpetas

```
src/AsaderoPioPio/
  Program.cs                          Servicios, cookie, políticas, middleware, arranque
  Seguridad/Permisos.cs               Catálogo de permisos, roles y extensiones (Puede, Rol, UsuarioId)
  Seguridad/Claves.cs                 PBKDF2-SHA256 y reglas de contraseña
  Data/Db.cs                          Db, Sesion (conexión/transacción) y Fila (lectura de columnas)
  Data/Auditoria.cs                   Registrar(...) en la bitácora
  Data/InicioBaseDatos.cs             Crea la base, ejecuta los scripts y crea el admin inicial
  Endpoints/Ayudas.cs                 Hoy(), Error(), Num(), Dinero(), Recortar(), candado de inventario
  Endpoints/AuthEndpoints.cs          /api/auth/*
  Endpoints/InventarioEndpoints.cs    /api/resumen, movimientos, compras, ajustes, stock mínimo
  Endpoints/VentasEndpoints.cs        /api/ventas
  Endpoints/NegocioEndpoints.cs       /api/presentaciones, gastos, caja
  Endpoints/AdministracionEndpoints.cs /api/reportes, usuarios, auditoria
  wwwroot/
    index.html                        Estructura: splash, login, secciones, modal, recibo
    css/styles.css                    Base: colores, tarjetas, tablas, login, splash, cortina
    css/componentes.css               Componentes 4.0: roles, menú, ventanas, caja, reportes, ayuda
    js/ayuda.js                       Textos del recorrido, guía de pantallas, FAQ y glosario
    js/app.js                         Núcleo: api(), navegación, modal, cuenta, recorrido, buscador
    js/pantallas.js                   Inicio, Vender, Ventas, Inventario, Productos
    js/pantallas-gestion.js           Caja, Gastos, Reportes, Equipo, Bitácora, Ayuda, Contacto
    js/arranque.js                    Splash y comprobación de sesión
database/01_esquema.sql               Tablas y vistas (idempotente)
database/02_datos_iniciales.sql       Presentaciones y stock mínimo
scripts/                              Iniciar, publicar, respaldar, probar permisos
```

## 3. Base de datos

`01_esquema.sql` y `02_datos_iniciales.sql` van **incrustados en el ejecutable** y se ejecutan en cada arranque. Son **idempotentes** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) y actualizan bases de versiones anteriores sin borrar datos. Las **vistas** se recrean en cada arranque.

### Tablas

| Tabla | Contenido |
|---|---|
| `usuarios` | Cuentas: nombre, correo (único), huella de clave, **rol** (`admin`·`supervisor`·`cajero`), activo, `debe_cambiar_clave`, `ultimo_ingreso`, `intentos_fallidos`, `bloqueado_hasta` |
| `presentaciones` | Productos: nombre (único), precio, `equivalente_pollos`, orden, activa |
| `configuracion` | Clave/valor (`stock_minimo`) |
| `compras` | Entradas: fecha, cantidad, costo unitario, **total generado**, proveedor, anulada (+ quién y cuándo) |
| `devoluciones_compra` | Devoluciones al proveedor, ligadas a una compra |
| `ajustes_inventario` | Mermas, consumo, donaciones y conteos. **Cantidad con signo.** Motivo obligatorio |
| `ventas` | Encabezado: fecha, total, pollos, usuario, **`metodo_pago`**, nota, anulada |
| `venta_detalle` | Presentaciones vendidas, **precio y equivalente del momento** |
| `gastos` | Gastos: concepto, categoría, valor, método (`efectivo`·`transferencia`), anulado |
| `cierres_caja` | «Foto» de cada cierre: base, ventas por método, gastos en efectivo, esperado, contado, diferencia |
| `auditoria` | Bitácora: usuario, rol, acción, detalle. Solo se inserta |

### Vistas

| Vista | Para qué |
|---|---|
| `v_stock` | **Inventario** = compras − devoluciones − ventas ± ajustes (todo lo vigente) |
| `v_movimientos` | Movimientos vigentes (`c` compra · `r` devolución · `v` venta · `a` ajuste) con usuario |
| `v_costo_promedio` | Costo promedio por pollo (compras netas de devoluciones / pollos netos) |

> **Decisión de diseño:** el stock **no se guarda**, se **calcula**. Así no puede desfasarse ni alterarse a mano.

### Reglas de integridad
- `CHECK` en cantidades, precios y roles; `FOREIGN KEY` hacia `usuarios`.
- Las anulaciones son **marcas** (`anulada`), no borrados: se conserva la historia.
- Las ventas guardan el **precio del momento**: cambiar un precio no reescribe el pasado.

## 4. Seguridad

### 4.1 Autenticación
- **Contraseñas:** PBKDF2-SHA256, 210.000 iteraciones, sal aleatoria de 16 bytes, comparación en tiempo constante. Nunca se guarda ni se registra la contraseña.
- **Sesión:** cookie `piopio.sesion` **HttpOnly**, **SameSite=Strict**, cifrada con *Data Protection* (llaves en `llaves-sesion/`), vigencia de 12 horas con renovación.
- **No revela si un correo existe:** siempre verifica una huella (real o falsa) y devuelve el mismo mensaje.
- **Límite por equipo:** 8 intentos de ingreso por minuto por IP (HTTP 429).
- **Bloqueo por cuenta:** 5 fallos seguidos → bloqueo de 5 minutos (HTTP 423). El bloqueo solo se informa a quien acierta la clave; los demás ven el mensaje genérico.
- **Política de contraseña:** 8–100 caracteres, con letras y números (`Claves.Validar`).
- **Clave temporal:** los usuarios nuevos y los restablecidos tienen `debe_cambiar_clave = true`; un middleware rechaza (403, `codigo: "cambiar_clave"`) toda ruta de `/api` salvo `/api/auth/*` y `/api/salud` hasta que la cambien.

### 4.2 Autorización
- `Permisos.cs` define el **catálogo de permisos** y qué rol tiene cuáles.
- En `Program.cs` se registra **una política por permiso** (`RequireRole(roles que lo tienen)`).
- Cada endpoint declara su permiso: `.RequireAuthorization(Permisos.GestionarInventario)`.
- **Revalidación en cada petición:** `CookieAuthenticationEvents.OnValidatePrincipal` consulta la base; si la cuenta se desactivó se rechaza la sesión, y si cambió el rol/nombre/bandera de clave se reemplaza la identidad. Por eso los cambios de rol **rigen al instante**.
- **Datos filtrados por rol en el servidor:** sin `ver_costos` los movimientos llegan con `valor = null`; sin `ver_ventas_todas`, `/api/ventas` devuelve solo las ventas propias de hoy y `/api/resumen` calcula «ventas de hoy» solo con las propias.
- El frontend oculta lo que no corresponde, pero **no es una barrera de seguridad**.

### 4.3 Integridad de los datos
- **Consultas con parámetros** (`@nombre`) en todo el acceso a datos: sin inyección SQL.
- **El servidor calcula los totales y precios**; el navegador solo envía ids y cantidades.
- **Concurrencia:** las operaciones que cambian el inventario (venta, anulación de compra, devolución, ajuste) toman `pg_advisory_xact_lock(72017201)` dentro de una transacción; dos cajas no pueden vender el mismo último pollo.
- **Transacciones:** una venta y su detalle, o una operación y su registro de bitácora, se guardan juntos o no se guardan.
- **Cabeceras:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`; archivos estáticos con `Cache-Control: no-cache` (siempre revalidan).
- **Frontend:** todo texto dinámico pasa por `esc()` antes de insertarse en el HTML.

### 4.4 Lo que NO cubre (conviene saberlo)
- **HTTPS:** por defecto sirve HTTP en la red local. Para exponerlo a internet, ponerlo detrás de un proxy con HTTPS (la cookie ya usa `SecurePolicy = SameAsRequest`).
- **Respaldos:** manuales (script). No hay respaldo automático.
- **Contraseña inicial:** `AdminInicial:Clave` está en `appsettings.json`; se obliga a cambiarla al primer ingreso, pero conviene cambiarla también en el archivo.
- **Pruebas automáticas:** no hay una suite de pruebas unitarias; la verificación de permisos se hace con `scripts/prueba-permisos.sh`.

## 5. API

Todas las rutas (salvo las públicas) exigen sesión. «Permiso» indica lo que valida el servidor. Errores: `{ "error": "mensaje" }` con el código HTTP correspondiente (400, 401, 403, 404, 409, 423, 429).

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/api/auth/entrar` | público (8/min por IP) | Inicia sesión |
| POST | `/api/auth/salir` | público | Cierra sesión |
| GET | `/api/auth/yo` | sesión | Perfil, rol y permisos |
| POST | `/api/auth/cambiar-clave` | sesión | Cambia la propia contraseña |
| GET | `/api/auth/roles` | sesión | Catálogo de roles y permisos |
| GET | `/api/resumen` | sesión | Datos de Inicio y Vender (filtrado por rol) |
| GET | `/api/movimientos?limite=` | sesión | Historial de movimientos (valores solo con `ver_costos`) |
| GET | `/api/ventas?fecha=` | sesión | Ventas de un día (propias si no hay `ver_ventas_todas`) |
| POST | `/api/ventas` | `vender` | Registra una venta (`items`, `metodoPago`, `nota`) |
| POST | `/api/ventas/{id}/anular` | `anular_ventas` | Anula una venta |
| GET | `/api/compras` | `gestionar_inventario` | Compras recientes |
| POST | `/api/compras` | `gestionar_inventario` | Registra una compra |
| POST | `/api/compras/{id}/anular` | `gestionar_inventario` | Anula una compra |
| POST | `/api/compras/{id}/devoluciones` | `gestionar_inventario` | Devuelve pollos al proveedor |
| POST | `/api/ajustes` | `gestionar_inventario` | Merma, consumo, donación o conteo |
| PUT | `/api/configuracion/stock-minimo` | `gestionar_inventario` | Cambia el stock mínimo |
| GET | `/api/presentaciones` | `gestionar_precios` | Todos los productos (incluye ocultos) |
| POST | `/api/presentaciones` | `gestionar_precios` | Crea un producto |
| PUT | `/api/presentaciones/{id}` | `gestionar_precios` | Edita nombre, precio, equivalente o visibilidad |
| GET | `/api/gastos?dias=` | `gestionar_gastos` | Gastos del periodo |
| POST | `/api/gastos` | `gestionar_gastos` | Registra un gasto |
| POST | `/api/gastos/{id}/anular` | `gestionar_gastos` | Anula un gasto |
| GET | `/api/caja` | `cerrar_caja` | Resumen del día y cierres anteriores |
| POST | `/api/caja/cierres` | `cerrar_caja` | Guarda el cierre (el servidor recalcula) |
| GET | `/api/reportes?dias=7\|15\|30` | `ver_reportes` | Reporte del periodo |
| GET | `/api/usuarios` | `gestionar_usuarios` | Lista de usuarios |
| POST | `/api/usuarios` | `gestionar_usuarios` | Crea un usuario (con clave temporal) |
| PUT | `/api/usuarios/{id}` | `gestionar_usuarios` | Cambia nombre, rol o estado |
| POST | `/api/usuarios/{id}/clave` | `gestionar_usuarios` | Restablece la clave (temporal) |
| GET | `/api/auditoria?accion=&limite=` | `ver_auditoria` | Bitácora |
| GET | `/api/salud` | público | Estado del servicio y de la base |

### Acciones registradas en la bitácora
`ingreso`, `bloqueo`, `compra`, `compra_anulada`, `devolucion`, `ajuste`, `venta_anulada`, `stock_minimo`, `producto_creado`, `producto_editado`, `usuario_creado`, `usuario_editado`, `clave_restablecida`, `clave_cambiada`, `gasto`, `gasto_anulado`, `cierre_caja`.
(Las ventas **no** se registran en la bitácora: ya quedan completas en la tabla `ventas`, con su vendedor.)

## 6. Cómo se calcula cada número

| Dato | Fórmula |
|---|---|
| Pollos disponibles | compras − devoluciones − ventas ± ajustes |
| Costo promedio por pollo | (compras − devoluciones en $) / (compras − devoluciones en pollos) |
| Costo de lo vendido | pollos vendidos × costo promedio |
| Pérdidas | pollos retirados por ajustes × costo promedio |
| Utilidad estimada | ventas − costo de lo vendido − gastos − pérdidas |
| Días que alcanza el stock | stock / (pollos vendidos en 7 días / 7) |
| Efectivo esperado en caja | base + ventas en efectivo − gastos en efectivo |
| Diferencia de caja | contado − esperado |

La utilidad es **estimada** porque usa un costo promedio global y depende de que se registren todas las compras y gastos.

## 7. Cómo extender

### Agregar un permiso
1. En `Permisos.cs`: constante, entrada en `Catalogo` y asignación en `PorRol`.
2. En el endpoint: `.RequireAuthorization(Permisos.TuPermiso)`.
3. En el frontend: `SEC.tuPantalla = { perm: 'tu_permiso', ... }` o `tiene('tu_permiso')`.

### Agregar una pantalla
1. En `index.html`: `<section class="sec" id="mipantalla"></section>`.
2. En `pantallas*.js`: `SEC.mipantalla = { nombre, icono, perm, cargar: () => api('/api/...'), pintar: datos => '<html>' }`.
3. En `app.js`: agrégala a `GRUPOS` para que salga en el menú.
4. Si tiene botones: `data-act="miAccion"` + `ACC.miAccion = async b => {...}`; formularios: `data-form="miForm"` + `ENV.miForm = async f => {...}`.
5. Documéntala en `ayuda.js` (`GUIA_PANTALLAS`) y en `docs/GUIA_DE_PANTALLAS.md`.

### Agregar un endpoint
Crea el método en el archivo de `Endpoints/` que corresponda y regístralo en `Program.cs` si es un archivo nuevo. Usa siempre parámetros (`@x`), `Auditoria.Registrar(...)` para cambios sensibles y `EnTransaccionAsync` si toca varias tablas.

### Modificar la base
Edita `01_esquema.sql` con sentencias **idempotentes** (`ADD COLUMN IF NOT EXISTS`, `CREATE ... IF NOT EXISTS`). Evita bloques `DO $$` (el conector separa por `;`).

## 8. Operación

| Tarea | Cómo |
|---|---|
| Arrancar | `scripts/iniciar-windows.bat` · `scripts/iniciar-mac-linux.sh` · `docker compose up -d` |
| Publicar sin .NET | `scripts/publicar-windows.bat` · `scripts/publicar-mac-linux.sh` |
| Respaldar | `scripts/respaldo-base-datos.bat` · `.sh` |
| Crear/actualizar usuario por consola | `dotnet run --project src/AsaderoPioPio -- usuario --correo X --clave "Y" --nombre "Z" --rol admin\|supervisor\|cajero` |
| Probar permisos | `scripts/prueba-permisos.sh` (en una copia de prueba) |
| Revisar salud | `GET /api/salud` |
| Zona horaria | En Docker se fija con `TZ=America/Bogota` (las «ventas de hoy» usan la hora del servidor) |

### Configuración (`appsettings.json`)

| Clave | Para qué |
|---|---|
| `ConnectionStrings:Postgres` | Conexión a PostgreSQL |
| `AdminInicial:Nombre/Correo/Clave` | Administrador que se crea la primera vez (debe cambiar la clave al entrar) |
| `Urls` | Dirección y puerto (por defecto `http://0.0.0.0:5080`) |
| `AbrirNavegador` | Abre el navegador al arrancar (`false` en Docker) |
