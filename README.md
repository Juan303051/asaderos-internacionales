# 🍗 Asadero Pío Pío · Control de pollos (versión 4.0)

**El sistema que lleva la cuenta de tus pollos, tus ventas y tu dinero, y que decide quién puede tocar qué.**

Pío Pío es una aplicación web para asaderos: registra cada pollo que **entra** (compras) y cada pollo que **sale** (ventas, mermas, consumo), calcula solo cuánto queda, avisa cuando hay que comprar y muestra cuánto gana el negocio. Funciona desde el computador, la tablet o el celular del local.

> **Lo más importante de esta versión:** ahora el sistema tiene **roles**. Solo el **administrador** puede modificar el inventario, los precios y el equipo. Los cajeros y supervisores consultan y trabajan, pero **no pueden alterar las cuentas**, ni siquiera manipulando la página: el servidor lo impide.

---

## ¿Por qué elegir Pío Pío?

| Para el dueño | Para quien atiende | Para quien revisa |
|---|---|---|
| Nadie más que tú modifica el inventario ni los precios | Vender en 3 toques: tocar, elegir pago, registrar | Cierre de caja que dice si sobra o falta plata |
| Ve cuánto gana de verdad (utilidad estimada) | Calcula el cambio automáticamente y da recibo | Reportes de 7, 15 y 30 días, descargables a Excel |
| Bitácora: sabe quién hizo cada cambio y cuándo | El sistema no deja vender pollos que no hay | Ventas por día, por vendedor y por forma de pago |
| Alerta roja cuando hay que comprar | Explicaciones en cada pantalla, sin manuales | Todo queda registrado y no se puede borrar |

### Todo lo que incluye

- 🔐 **3 roles con permisos reales:** Administrador, Supervisor y Cajero (ver [tabla](#roles-y-permisos)).
- 📦 **Inventario confiable:** compras, devoluciones al proveedor, **mermas y ajustes** con motivo obligatorio, y alerta de stock mínimo.
- 🛒 **Venta rápida:** tarjetas grandes, forma de pago (efectivo, transferencia, tarjeta), **cálculo del cambio** y **recibo imprimible**. Barra fija con el total en el celular.
- 🧾 **Historial de ventas** por día, con vendedor, forma de pago y anulación (solo admin).
- 🏷️ **Productos y precios** editables por el administrador, sin tocar código ni base de datos. Cambiar un precio no altera ventas pasadas.
- 💵 **Cierre de caja:** base + ventas en efectivo − gastos = lo que debería haber; compara con lo contado y guarda el cierre.
- 💸 **Gastos** (carbón, gas, servicios, empaques, nómina…) para que la utilidad sea real.
- 📊 **Reportes:** ventas, compras, gastos, pérdidas y **utilidad estimada**; por producto, forma de pago y vendedor; exportable a CSV (Excel) e imprimible.
- 👥 **Equipo y roles:** el administrador crea cuentas, cambia roles, desactiva personas y restablece contraseñas. El cambio rige **al instante**.
- 📜 **Bitácora de auditoría:** quién hizo qué y cuándo. Nadie puede editarla ni borrarla.
- 💡 **Centro de ayuda y recorrido de bienvenida** por rol; buscador rápido de pantallas (`Ctrl + K`).
- 🔒 **Seguridad:** contraseñas cifradas, bloqueo tras 5 intentos fallidos, cambio obligatorio de contraseña temporal, sesión protegida.
- 📱 **Adaptable:** computador, tablet y celular; se puede instalar en la pantalla de inicio.

---

## Roles y permisos

Cada persona entra con **su propia cuenta**. El rol define qué pantallas ve y qué puede hacer.

| Permiso | 👑 Administrador | 🧭 Supervisor | 🛒 Cajero |
|---|:-:|:-:|:-:|
| Ver las existencias (cuántos pollos hay) | ✔ | ✔ | ✔ |
| Registrar ventas | ✔ | ✔ | ✔ |
| Ver las ventas de todos | ✔ | ✔ | solo las suyas de hoy |
| Hacer el cierre de caja | ✔ | ✔ | — |
| Ver reportes | ✔ | ✔ | — |
| Ver costos y utilidad | ✔ | ✔ | — |
| **Modificar el inventario** (compras, devoluciones, ajustes, stock mínimo) | ✔ | — | — |
| Anular ventas y compras | ✔ | — | — |
| Cambiar productos y precios | ✔ | — | — |
| Registrar gastos | ✔ | — | — |
| Administrar el equipo (crear usuarios, roles, claves) | ✔ | — | — |
| Ver la bitácora | ✔ | — | — |

Más detalle y cómo cambiar un permiso: [docs/ROLES_Y_PERMISOS.md](docs/ROLES_Y_PERMISOS.md).

---

## Instalación rápida

**Necesitas:** PostgreSQL 14 o superior y .NET 8 (o Docker, que trae todo).

### Opción A · Docker (la más fácil)
```bash
docker compose up -d
```
Abre **http://localhost:5080**.

### Opción B · Windows / Mac / Linux
1. Instala [PostgreSQL 16](https://www.postgresql.org/download/) (anota la contraseña de `postgres`) y el [SDK de .NET 8](https://dotnet.microsoft.com/download/dotnet/8.0).
2. En `src/AsaderoPioPio/appsettings.json` pon la contraseña de PostgreSQL en `Password=...`.
3. Doble clic en `scripts/iniciar-windows.bat` (en Mac/Linux: `scripts/iniciar-mac-linux.sh`).
4. Se abre **http://localhost:5080**.

La primera vez, el sistema **crea solo** la base de datos, las tablas y los productos.

### Primer ingreso
| | |
|---|---|
| Correo | `admin@piopio.com` |
| Contraseña | `PioPio2026*` (o la de `AdminInicial:Clave` en `appsettings.json`) |

Al entrar, el sistema te pide **crear tu contraseña personal**. Después, en **Equipo y roles**, crea una cuenta por cada persona del equipo.

### Usarlo desde la tablet o el celular de la caja
Al arrancar, la ventana muestra una dirección como `http://192.168.1.20:5080`. Ábrela desde cualquier equipo conectado **al mismo WiFi**. Si Windows pregunta por el Firewall, permite el acceso en **redes privadas**.

### Instalar sin .NET en el computador del local
Ejecuta `scripts/publicar-windows.bat` (o `publicar-mac-linux.sh`) en tu equipo de desarrollo, copia la carpeta `publicado/` al computador del asadero y abre `AsaderoPioPio.exe`. Ahí solo hace falta PostgreSQL. Para que arranque con Windows, pon un acceso directo en `shell:startup`.

---

## Actualizar desde la versión 3.2

1. **Haz un respaldo** (`scripts/respaldo-base-datos.bat` o `.sh`). Con Docker: `docker exec <contenedor-db> pg_dump -U postgres asadero_pio_pio > respaldo.sql`.
2. Reemplaza los archivos del sistema (o `docker compose up -d --build`).
3. Arranca. La base se **actualiza sola** y **conserva todos tus datos**: usuarios, compras, ventas y devoluciones.
4. Tu usuario `admin` sigue funcionando. Las ventas anteriores quedan como «efectivo».

Detalle completo en [docs/CHANGELOG.md](docs/CHANGELOG.md).

---

## Documentación

| Documento | Para quién | Qué contiene |
|---|---|---|
| [docs/MANUAL_DE_USUARIO.md](docs/MANUAL_DE_USUARIO.md) | Todo el personal | El día de trabajo paso a paso, por rol, con palabras sencillas |
| [docs/GUIA_DE_PANTALLAS.md](docs/GUIA_DE_PANTALLAS.md) | Todo el personal | Para qué sirve **cada pantalla y cada botón**, al pie de la letra |
| [docs/ROLES_Y_PERMISOS.md](docs/ROLES_Y_PERMISOS.md) | Administrador | Qué puede hacer cada rol, por qué, y cómo cambiarlo |
| [docs/PRESENTACION_COMERCIAL.md](docs/PRESENTACION_COMERCIAL.md) | Dueño / comprador | Qué problema resuelve, ventajas y guion de demostración de 5 minutos |
| [docs/DOCUMENTACION_TECNICA.md](docs/DOCUMENTACION_TECNICA.md) | Desarrolladores | Arquitectura, base de datos, API, seguridad y cómo extender |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Todos | Qué cambió en cada versión |

Dentro del sistema también hay un **Centro de ayuda** (pantalla «Ayuda») con la misma información.

---

## Copias de seguridad
`scripts/respaldo-base-datos.bat` (o `.sh`) guarda un respaldo en la carpeta `respaldos/`. **Hazlo todos los días.** Los respaldos incluyen usuarios, inventario, ventas, gastos, cierres y bitácora.

## Problemas comunes
| Mensaje | Solución |
|---|---|
| «No hay conexión con PostgreSQL» | Enciende PostgreSQL y revisa la contraseña en `appsettings.json`. |
| «El puerto ya está ocupado» | El sistema ya está abierto: usa http://localhost:5080. |
| «Demasiados intentos» | Espera un minuto y vuelve a intentar. |
| «Cuenta bloqueada» | Fueron 5 intentos fallidos. Espera 5 minutos o pide al administrador **Restablecer clave**. |
| No puedo modificar el inventario | Es normal si tu rol es cajero o supervisor: solo el administrador puede. |
| Veo la página vieja después de actualizar | Recarga con `Ctrl + F5`. |

## Estructura del proyecto
```
AsaderoPioPio.sln
src/AsaderoPioPio/
  Program.cs                        Arranque, seguridad, políticas por permiso
  Seguridad/Permisos.cs             ⭐ Qué puede hacer cada rol (único lugar)
  Seguridad/Claves.cs               Cifrado y reglas de contraseñas
  Data/Db.cs                        Acceso a PostgreSQL (consultas con parámetros)
  Data/Auditoria.cs                 Bitácora: quién hizo qué
  Data/InicioBaseDatos.cs           Crea y actualiza la base al arrancar
  Endpoints/AuthEndpoints.cs        Ingreso, salida, cambio de clave, roles
  Endpoints/InventarioEndpoints.cs  Resumen, compras, devoluciones, ajustes, stock mínimo
  Endpoints/VentasEndpoints.cs      Registrar, consultar y anular ventas
  Endpoints/NegocioEndpoints.cs     Productos y precios, gastos, cierre de caja
  Endpoints/AdministracionEndpoints.cs  Reportes, equipo, bitácora
  wwwroot/                          Página: index.html, css/, js/, assets/
database/01_esquema.sql             Tablas y vistas (se actualiza sola)
database/02_datos_iniciales.sql     Productos y stock mínimo iniciales
scripts/                            Iniciar, publicar, respaldar y probar permisos
docs/                               Manuales y documentación
Dockerfile, docker-compose.yml      Opción Docker
```

---

© 2026 Juan Diego González Marín y Santiago Cardoso Padilla · Ingeniería de Software, FET. Todos los derechos reservados.
