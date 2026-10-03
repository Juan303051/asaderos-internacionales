# Manual de usuario · Asadero Pío Pío

Este manual explica cómo trabajar con el sistema **paso a paso y con palabras sencillas**. No necesitas saber de computadores. Busca tu rol y sigue las instrucciones.

> ¿Buscas qué hace un botón en particular? Mira la [Guía de pantallas](GUIA_DE_PANTALLAS.md). Dentro del sistema también está la pantalla **Ayuda**.

---

## 1. Antes de empezar

### ¿Qué es el sistema?
Es la **libreta electrónica** del asadero. Anota cuántos pollos llegan, cuántos se venden y cuánto dinero entra y sale. Hace las cuentas solo, así nadie tiene que sumar ni restar a mano.

### ¿Qué es un rol?
Cada persona entra con **su propia cuenta**, y esa cuenta tiene un **rol** que decide qué puede hacer:

| Rol | Quién es | En una frase |
|---|---|---|
| 👑 **Administrador** | El dueño | Controla todo. Es el **único** que puede modificar el inventario, los precios y el equipo. |
| 🧭 **Supervisor** | El encargado del turno | Vende, revisa ventas y reportes, y hace el cierre de caja. **No** modifica el inventario. |
| 🛒 **Cajero** | Quien atiende al cliente | Registra ventas y consulta cuántos pollos quedan. **No** ve costos ni modifica nada. |

**¿Por qué un cajero no puede cambiar el inventario?** Para que las cuentas siempre sean confiables. Si cualquiera pudiera sumar o restar pollos, nunca se sabría si faltan por una venta, por una pérdida o por un error. Con esta regla, **cada cambio tiene un responsable** y queda anotado.

### Cómo entrar
1. Abre la dirección del sistema en el navegador (por ejemplo `http://localhost:5080`, o la que te dé el administrador para la tablet).
2. Escribe tu **correo** y tu **contraseña**.
3. Pulsa **Entrar**.

> 🔒 Si te equivocas **5 veces seguidas**, tu cuenta se bloquea **5 minutos** por seguridad. Si olvidaste la contraseña, pídele al administrador que la restablezca.

### Tu primera vez
- Si el administrador acaba de crear tu cuenta, el sistema te pedirá **crear tu contraseña personal** (la que te dieron es temporal). Debe tener **mínimo 8 caracteres, con letras y números**.
- Después verás un **recorrido de bienvenida** de 5 pasos, hecho para tu rol. Puedes saltarlo y repetirlo cuando quieras desde **Mi cuenta → Ver el recorrido**.

### Para moverte rápido
- Pulsa **Ctrl + K** (o el botón **🔎 Buscar**) y escribe el nombre de una pantalla: «caja», «ventas», «inventario»…
- En **Mi cuenta** (tu nombre, abajo a la izquierda) puedes activar el **modo rápido**, que quita la animación entre pantallas.

---

## 2. Si eres CAJERO 🛒

Tu trabajo es atender al cliente. El sistema hace el resto.

### Vender
1. Entra a **Vender**.
2. **Toca la tarjeta amarilla** de lo que pide el cliente (1/4, medio, 1 pollo, pollo y medio). Toca varias veces para agregar más. Si te equivocas, usa **−** en el pedido.
3. Elige **cómo paga**: 💵 Efectivo, 📲 Transferencia o 💳 Tarjeta.
4. Si paga en **efectivo**, escribe con cuánto paga (o toca el valor rápido, por ejemplo «$ 50.000»). El sistema te muestra **cuánto cambio devolver**.
5. Si quieres, escribe una **nota** («para llevar», «mesa 3»).
6. Pulsa **Registrar venta**.
7. Aparece el **recibo**, con el cambio en grande. Puedes **imprimirlo** o pulsar **Nueva venta**.

> En el celular, una **barra amarilla fija** abajo muestra el total; tócala para ir directo a cobrar.

**Si no alcanzan los pollos**, la tarjeta se apaga y el sistema no te deja venderla. Avisa al administrador.

### Ver lo que vendiste
- **Ventas** muestra **tus ventas de hoy**, con hora, qué vendiste y cómo pagaron.
- **Inicio → Mis ventas de hoy** te da el total de tu turno.

### Ver cuántos pollos quedan
- **Inventario** muestra los pollos disponibles y el historial de movimientos. Verás un aviso **🔒 Solo lectura**: puedes mirar, no cambiar.

### Me equivoqué en una venta, ¿qué hago?
**No registres otra venta para «arreglarla».** Avisa al administrador: él **anula** la venta equivocada (los pollos vuelven al inventario) y tú registras la correcta.

### Lo que NO puedes hacer (y es normal)
Modificar el inventario, cambiar precios, ver costos o utilidad, hacer reportes o cierres de caja, anular ventas. Si intentas algo no permitido, el sistema te lo dice.

---

## 3. Si eres SUPERVISOR 🧭

Haces todo lo del cajero, y además:

### Ver las ventas de cualquier día
**Ventas** → elige **Hoy**, **Ayer** o un día del calendario. Ves quién vendió, qué, y cómo pagó cada cliente.

### Hacer el cierre de caja (al final del día)
1. Entra a **Cierre de caja**. Arriba ves lo vendido hoy por forma de pago.
2. Escribe la **base de caja** (el dinero con el que empezó el día para dar cambio).
3. **Cuenta el efectivo del cajón** y escribe el total en **Efectivo contado**.
4. El sistema calcula al instante: **Base + ventas en efectivo − gastos en efectivo = lo que debería haber**, y te dice si **cuadra**, si **sobra** o si **falta**.
5. Escribe una nota si quieres y pulsa **Guardar cierre**.

> El cierre **queda guardado y no se puede editar**. Si hay diferencia, la nota ayuda a explicarla.

### Ver reportes
**Reportes** muestra ventas, compras, gastos y **utilidad estimada** de los últimos **7, 15 o 30 días**, con gráfico, y por producto, forma de pago y vendedor. Puedes **descargar a Excel (CSV)** o **imprimir**.

### Lo que NO puedes hacer
Modificar el inventario, cambiar precios, anular ventas, registrar gastos, administrar el equipo. Si ves algo que no cuadra, avisa al administrador.

---

## 4. Si eres ADMINISTRADOR 👑

Haces todo lo anterior, y eres **la única persona** que puede lo siguiente. Cada cambio queda en la **Bitácora** con tu nombre.

### Primeros pasos recomendados (la primera vez)
1. **Cambia tu contraseña** (el sistema te lo pide al entrar).
2. **Revisa tus productos y precios** en **Productos y precios**.
3. **Registra tu primera compra** en **Inventario** (sin pollos registrados, nadie puede vender).
4. Define el **stock mínimo** (cuántos pollos encienden la alerta roja).
5. **Crea las cuentas de tu equipo** en **Equipo y roles**.

### Registrar una compra de pollos
**Inventario → 📥 Registrar compra:** cantidad, costo por pollo, proveedor y fecha. El sistema te muestra el total antes de guardar. Los pollos se **suman** al inventario.

### Devolver pollos al proveedor
**Inventario → ↩️ Devolver al proveedor:** elige la compra de origen, cuántos devuelves y el motivo. Se **restan** del inventario. El sistema no te deja devolver pollos que ya se vendieron.

### Registrar una merma, consumo o corrección
**Inventario → ⚖️ Ajustar inventario.** Úsalo cuando salen pollos **sin ser venta**:

| Opción | Cuándo usarla |
|---|---|
| Merma | Se dañaron o se perdieron |
| Consumo del personal | Comió el equipo |
| Donación | Se regalaron |
| Conteo físico: faltan | Contaste y hay menos que en el sistema |
| Conteo físico: sobran | Contaste y hay más que en el sistema |

El **motivo es obligatorio**, y el ajuste queda a tu nombre.

### Anular una compra o una venta equivocada
En **Inventario** (compras recientes y movimientos) o en **Ventas**, pulsa **Anular**. El sistema te pide **confirmar con un segundo toque**. Nada se borra: el registro queda marcado como anulado y anotado en la bitácora.

> Una compra **no se puede anular** si ya se vendieron sus pollos.

### Cambiar precios o crear productos
**Productos y precios:** edita el nombre, el precio o cuántos pollos descuenta, y pulsa **Guardar**. Con el interruptor **Visible en ventas** ocultas un producto sin perder su historial. **Cambiar un precio no altera las ventas ya hechas.**

### Registrar gastos
**Gastos:** anota carbón, gas, servicios, empaques, nómina… con su valor y si se pagó en efectivo o por transferencia. Sin gastos, la utilidad sería engañosa. Si fue en **efectivo**, el cierre de caja lo descuenta del cajón.

### Administrar el equipo
**Equipo y roles:**
- **Crear una cuenta:** nombre, correo, **rol** y una contraseña temporal (hay un botón 🎲 que genera una). El sistema te muestra los datos **una sola vez** para que se los des a la persona. Ella deberá cambiarla al entrar.
- **Editar:** cambia nombre, rol o **desactiva** la cuenta. **Rige al instante**, aunque la persona tenga la sesión abierta.
- **Restablecer clave:** si alguien la olvidó o su cuenta se bloqueó.

**Protecciones:** no puedes cambiar tu propio rol ni desactivarte, y siempre debe quedar al menos un administrador.

> **Una cuenta por persona.** Nunca compartan una sola: así la bitácora sabe quién hizo cada cosa.

### Revisar la bitácora
**Bitácora** lista quién hizo qué y cuándo (compras, anulaciones, precios, usuarios, cierres…). Puedes filtrar por tipo de acción. **Nadie puede editarla ni borrarla.**

---

## 5. Rutina diaria sugerida

| Momento | Quién | Qué hacer |
|---|---|---|
| **Al abrir** | Administrador | Registrar la compra de pollos del día (si llegó). Revisar la alerta de stock. |
| **Al abrir** | Supervisor / cajero | Entrar y revisar en **Inicio** cuántos pollos hay. |
| **Durante el día** | Cajero / supervisor | Vender. Avisar al administrador si algo no cuadra. |
| **Al cerrar** | Supervisor o administrador | **Cierre de caja**. |
| **Al cerrar** | Administrador | Anotar gastos del día. Hacer el **respaldo** de la base de datos. |
| **Cada semana** | Administrador | Revisar **Reportes** (7 días) y la **Bitácora**. |

---

## 6. Preguntas frecuentes

**No me deja cambiar el inventario.** Es normal si eres cajero o supervisor: solo el administrador puede. Si algo no coincide, avísale.

**Aparece «cuenta bloqueada».** Fueron 5 intentos fallidos. Espera 5 minutos o pide al administrador que restablezca tu clave.

**Olvidé mi contraseña.** Pide al administrador **Restablecer clave**; te dará una temporal que cambiarás al entrar.

**¿Qué diferencia hay entre devolución, anulación y ajuste?**
- *Devolución*: se regresan pollos al proveedor.
- *Anulación*: se deshace un registro hecho por error (una compra o una venta).
- *Ajuste*: salen pollos sin ser venta (merma, consumo, donación) o se corrige tras contar.

**¿Por qué la utilidad dice «estimada»?** Porque usa el costo promedio de los pollos comprados y los gastos que se registraron. Si faltan compras o gastos por registrar, la utilidad real será distinta.

**¿Se puede usar desde el celular?** Sí, desde el mismo WiFi del local, con la dirección que muestra el programa al encender.

**La página se ve rara después de una actualización.** Recárgala con `Ctrl + F5`.
