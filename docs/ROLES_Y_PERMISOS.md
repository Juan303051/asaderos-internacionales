# Roles y permisos

## La idea en una línea
> **Solo el administrador modifica el inventario.** Los demás roles consultan y trabajan, pero no pueden alterar las cuentas.

## Los tres roles

### 👑 Administrador — «El dueño del sistema»
Controla todo. Es el único que puede modificar el inventario, los precios y el equipo. También ve costos, utilidad y la bitácora.

### 🧭 Supervisor — «El encargado del turno»
Vigila el negocio **sin tocar el inventario**: vende, consulta las ventas de todos y los reportes, y hace el cierre de caja.

### 🛒 Cajero — «Quien atiende al cliente»
Atiende el mostrador: registra ventas y consulta cuántos pollos quedan. No ve costos ni puede modificar nada.

## Matriz completa de permisos

| Clave interna | Permiso | 👑 Admin | 🧭 Supervisor | 🛒 Cajero |
|---|---|:-:|:-:|:-:|
| `ver_inventario` | Ver las existencias y el historial (sin costos) | ✔ | ✔ | ✔ |
| `vender` | Registrar ventas | ✔ | ✔ | ✔ |
| `ver_ventas_todas` | Ver las ventas de cualquier día y vendedor | ✔ | ✔ | — *(ve solo las suyas de hoy)* |
| `anular_ventas` | Anular ventas | ✔ | — | — |
| `gestionar_inventario` | **Modificar el inventario:** registrar/anular compras, devoluciones, ajustes y stock mínimo | ✔ | — | — |
| `ver_costos` | Ver costos, valores de compra y utilidad | ✔ | ✔ | — |
| `ver_reportes` | Ver reportes | ✔ | ✔ | — |
| `cerrar_caja` | Hacer el cierre de caja | ✔ | ✔ | — |
| `gestionar_precios` | Crear productos y cambiar precios | ✔ | — | — |
| `gestionar_gastos` | Registrar y anular gastos | ✔ | — | — |
| `gestionar_usuarios` | Crear usuarios, cambiar roles, desactivar, restablecer claves | ✔ | — | — |
| `ver_auditoria` | Ver la bitácora | ✔ | — | — |

## ¿Por qué estas decisiones?

- **El inventario solo lo modifica el administrador** porque es la base de todas las cuentas. Si cualquiera pudiera sumar o restar pollos, nunca se sabría si una diferencia se debe a una venta, a una pérdida o a un error. Con esta regla, cada cambio tiene un responsable.
- **El supervisor no anula ventas** porque anular una venta *devuelve pollos al inventario*, y eso es modificar el inventario.
- **El cajero no ve costos** para que el precio de compra y la utilidad sean información del dueño y del encargado.
- **El cajero solo ve sus ventas** para que cada quien responda por su propio turno.
- **El supervisor hace el cierre de caja** porque quien cuenta el efectivo no debería ser quien lo maneja todo el día; el cierre también puede hacerlo el administrador.

## Cómo se hace cumplir (no es solo ocultar botones)

1. **El servidor decide.** Cada ruta de la API declara el permiso que exige (por ejemplo, `POST /api/compras` exige `gestionar_inventario`). Si el rol no lo tiene, responde **403** sin ejecutar nada.
2. **El navegador solo es comodidad.** La página oculta lo que tu rol no puede usar para que sea más simple, pero aunque alguien modifique la página o llame a la API a mano, el servidor lo rechaza.
3. **El rol se revalida en cada petición.** Si el administrador desactiva a alguien o le cambia el rol, **rige al instante**, aunque esa persona tenga la sesión abierta.
4. **Todo queda anotado.** Cada cambio sensible (compras, anulaciones, precios, usuarios, cierres…) se guarda en la bitácora con quién, cuándo y qué.

## Protecciones de la gestión de usuarios

- No puedes **cambiar tu propio rol** ni **desactivarte**.
- Siempre debe quedar **al menos un administrador activo**.
- Los usuarios nuevos y los restablecidos reciben una **contraseña temporal** que **deben cambiar** antes de hacer cualquier otra cosa (el servidor rechaza el resto hasta que lo hagan).
- Tras **5 contraseñas incorrectas**, la cuenta se bloquea **5 minutos**.
- Una contraseña válida tiene **mínimo 8 caracteres, con letras y números**.

## Cómo comprobarlo
El script `scripts/prueba-permisos.sh` prueba más de 50 combinaciones: cada rol intenta lo que **sí** y lo que **no** puede hacer, y comprueba que el servidor responda correctamente (200 o 403). **Úsalo en una copia de prueba**, porque crea dos usuarios de prueba.

## Cómo cambiar lo que puede hacer un rol (desarrolladores)
Todo está en un solo archivo: `src/AsaderoPioPio/Seguridad/Permisos.cs`.

```csharp
private static readonly Dictionary<string, HashSet<string>> PorRol = new()
{
    ["admin"]      = [.. Catalogo.Select(p => p.Clave)],                 // todo
    ["supervisor"] = [VerInventario, Vender, VerVentasTodas, VerCostos, VerReportes, CerrarCaja],
    ["cajero"]     = [VerInventario, Vender],
};
```

- **Dar un permiso a un rol:** agrega su constante al conjunto del rol.
- **Quitarlo:** bórrala del conjunto.
- **Crear un permiso nuevo:** agrega la constante, una entrada en `Catalogo` (nombre y descripción) y úsala con `.RequireAuthorization(Permisos.TuPermiso)` en el endpoint.
- **Crear un rol nuevo:** agrégalo en `Roles` y en `PorRol`, y amplía la restricción `usuarios_rol_check` en `database/01_esquema.sql`.

La pantalla **Equipo y roles**, la matriz de **Ayuda** y los permisos que recibe la página salen de esa misma fuente, así que se actualizan solos.
