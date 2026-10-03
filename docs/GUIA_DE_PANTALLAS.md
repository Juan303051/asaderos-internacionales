# Guía de pantallas · Para qué sirve cada cosa

Esta guía describe **cada pantalla y cada botón**, al pie de la letra. Si buscas cómo se hace una tarea completa, mira el [Manual de usuario](MANUAL_DE_USUARIO.md).

**Quién ve qué:** el menú de la izquierda solo muestra las pantallas que tu rol puede usar.

| Pantalla | 👑 Admin | 🧭 Supervisor | 🛒 Cajero |
|---|:-:|:-:|:-:|
| 🏠 Inicio | ✔ | ✔ | ✔ |
| 🛒 Vender | ✔ | ✔ | ✔ |
| 🧾 Ventas | todas | todas | solo las suyas de hoy |
| 📦 Inventario | ver y modificar | solo ver | solo ver |
| 🏷️ Productos y precios | ✔ | — | — |
| 💵 Cierre de caja | ✔ | ✔ | — |
| 💸 Gastos | ✔ | — | — |
| 📊 Reportes | ✔ | ✔ | — |
| 👥 Equipo y roles | ✔ | — | — |
| 📜 Bitácora | ✔ | — | — |
| 💡 Ayuda | ✔ | ✔ | ✔ |
| 📍 Contacto | ✔ | ✔ | ✔ |

---

## Elementos que están en todas las pantallas

| Elemento | Para qué sirve |
|---|---|
| **Logo Pío Pío** (arriba a la izquierda) | Te lleva al Inicio. |
| **Menú lateral**, con grupos: Día a día · Almacén · Dinero · Administración · Soporte | Cambia de pantalla. Solo ves lo que tu rol permite. |
| **Punto rojo** junto a *Inventario* | Avisa que los pollos están en el stock mínimo o por debajo. |
| **Tu nombre y rol** (abajo a la izquierda) | Abre **Mi cuenta**: tu perfil, lo que tu rol puede hacer, cambiar contraseña, modo rápido y repetir el recorrido. |
| **🔎 Buscar** (o `Ctrl + K`) | Salta a cualquier pantalla escribiendo su nombre. |
| **Vista** | Cambia el menú entre lateral y superior. Se recuerda. |
| **Salir** | Cierra tu sesión. |
| **«¿Para qué sirve?»** (bajo cada título) | Explica en una frase la pantalla. |
| **Aviso verde/rojo abajo** | Confirma que algo se guardó, o explica por qué no se pudo. |
| **Barra amarilla delgada arriba** | Indica que el sistema está trabajando. |

---

## 🏠 Inicio
**Quién:** todos. **Para qué sirve:** resumen del día y siguiente paso recomendado.

| Elemento | Qué hace |
|---|---|
| **Saludo y rol** | Tu nombre y tu rol con su lema («El dueño del sistema», «Quien atiende al cliente»…). |
| **Franja de siguiente paso** | Te dice qué hacer ahora. Se pone **roja 🚨** si no hay pollos o quedan pocos. Tiene un botón directo a la pantalla indicada. |
| **Pollos disponibles** | Cuántos pollos enteros quedan. La barra verde pasa a roja con pocos pollos. El texto «alcanza para ~N días» se calcula con lo vendido en los últimos 7 días. |
| **Ventas de hoy** | Dinero vendido y pollos que salieron, con la comparación contra ayer (▲ sube, ▼ baja). **El cajero ve solo sus ventas** (se titula «Mis ventas de hoy»). |
| **Utilidad estimada de hoy** | Ventas − costo de los pollos vendidos − gastos del día. Solo administrador y supervisor. En rojo si es negativa. |
| **Stock mínimo** | El número que enciende la alerta. Solo lectura aquí; el administrador lo cambia en Inventario. |
| **¿Qué quieres hacer?** | Accesos directos a las pantallas de tu rol. |
| **Lo más vendido** | Las presentaciones más pedidas hoy. |
| **Últimos movimientos** | Las últimas 6 compras, ventas, devoluciones y ajustes. |

---

## 🛒 Vender
**Quién:** administrador, supervisor y cajero. **Para qué sirve:** atender al cliente y registrar la venta.

| Elemento | Qué hace |
|---|---|
| **«Quedan N pollos»** | Pollos disponibles **descontando lo que ya tienes en el pedido**. Se pone roja si llegan a cero. |
| **Tarjetas amarillas** | Una por presentación (nombre, precio y cuántos pollos descuenta). **Un toque agrega una unidad.** Si no alcanzan los pollos, la tarjeta se apaga y no se puede agregar. |
| **Pedido actual** | Lista de lo que pidió el cliente. |
| **− / +** | Quitan o agregan una unidad de esa presentación. |
| **Total** | Suma del pedido. El **servidor recalcula** el total al guardar: nadie puede alterar precios desde el navegador. |
| **¿Cómo paga?** | 💵 Efectivo · 📲 Transferencia · 💳 Tarjeta. Sirve para que el cierre de caja separe el dinero. |
| **El cliente paga con** | Solo en efectivo, opcional. Escribe el billete que te dan. |
| **Botones rápidos** («Exacto», «$ 50.000», «$ 100.000») | Llenan el campo anterior de un toque. |
| **Cambio a devolver** | Se calcula solo. Si el dinero no alcanza, dice cuánto falta. |
| **Nota** | Texto opcional: «para llevar», «mesa 3», nombre del cliente… |
| **Vaciar** | Borra el pedido sin guardar nada. |
| **Registrar venta** | Guarda la venta, **descuenta los pollos**, lanza confeti y muestra el recibo. |
| **Barra amarilla fija** (solo celular/tablet) | Muestra N productos y el total; al tocarla baja hasta «Cobrar». |
| **Recibo → 🖨 Imprimir recibo** | Imprime el ticket (formato angosto). |
| **Recibo → Nueva venta** | Cierra el recibo para atender al siguiente. |

**Reglas que cumple el servidor:** no se puede vender más de lo que hay (ni aunque dos cajas vendan a la vez), el precio sale de la base de datos y cada venta guarda quién la hizo.

---

## 🧾 Ventas
**Quién:** todos (cada rol ve algo distinto). **Para qué sirve:** revisar las ventas de un día.

| Elemento | Qué hace |
|---|---|
| **Hoy / Ayer / calendario** | Elige el día. **Solo administrador y supervisor**; el cajero ve únicamente sus ventas de hoy. |
| **Vendido / Ventas / Pollos vendidos** | Totales del día (las anuladas no cuentan). |
| **Tabla** | Hora, vendedor (admin/supervisor), qué se vendió, forma de pago y total. |
| **Venta anulada** | Aparece tachada y con la etiqueta «Anulada». |
| **Anular venta** | **Solo administrador.** Pide un segundo toque («Confirmar»). Devuelve los pollos al inventario y queda en la bitácora. |

---

## 📦 Inventario
**Quién:** todos pueden **ver**; solo el **administrador** modifica. **Para qué sirve:** es la cuenta oficial de los pollos y la **única** pantalla donde se cambia el inventario.

Todos ven:

| Elemento | Qué hace |
|---|---|
| **Aviso 👑 / 🔒** | El administrador ve que es el único que modifica; los demás ven «Solo lectura». |
| **Pollos disponibles** | Compras − devoluciones − ventas ± ajustes. **Nunca se escribe a mano.** |
| **Stock mínimo** | Número que enciende la alerta roja. |
| **¿Cuánto durará?** | Días estimados según lo vendido en 7 días. |
| **Historial de movimientos** | Las últimas 40 entradas y salidas: fecha y hora, tipo (Compra, Venta, Devolución, Merma…), pollos (+ verde, − rojo), detalle y quién lo hizo. **El valor en dinero solo lo ven administrador y supervisor.** |

Solo el administrador ve y puede usar:

| Elemento | Qué hace |
|---|---|
| **Stock mínimo → Guardar** | Cambia el número de la alerta roja. Queda en la bitácora. |
| **📥 Registrar compra** | Cantidad (entera), costo por pollo, proveedor (sugiere los anteriores) y fecha. Muestra el total antes de guardar. **Suma** al inventario. |
| **↩️ Devolver al proveedor** | Compra de origen, cantidad y motivo. **Resta** del inventario. Rechaza devolver más de lo que quedaba de esa compra o pollos que ya se vendieron. |
| **⚖️ Ajustar inventario** | Tipo (merma, consumo del personal, donación, conteo físico faltan/sobran), cantidad en cuartos y **motivo obligatorio**. Rechaza retirar más de lo que hay. |
| **Compras recientes** | Las últimas 30 compras con comprados, devueltos y por devolver. |
| **Devolver** (en la tabla) | Prellena el formulario de devolución con esa compra. |
| **Anular compra** | Deshace una compra completa (con segundo toque). Se rechaza si ya se vendieron sus pollos. |
| **Anular venta** (en el historial) | Igual que en Ventas. |

---

## 🏷️ Productos y precios
**Quién:** solo administrador. **Para qué sirve:** definir qué se vende y a cuánto.

| Elemento | Qué hace |
|---|---|
| **Nombre** | Cómo aparece la tarjeta en «Vender». |
| **Precio ($)** | Lo que paga el cliente. **No altera las ventas ya hechas** (cada venta guarda el precio de ese momento). |
| **Pollos que descuenta** | Cuánto inventario consume, en cuartos: 1/4 = 0,25 · medio = 0,5 · pollo = 1 · pollo y medio = 1,5. |
| **Visible en ventas** (interruptor) | Si lo apagas, desaparece de «Vender» pero **conserva todo su historial**. |
| **Guardar** | Guarda esa fila y anota qué cambió (nombre, precio, pollos, visibilidad) en la bitácora. |
| **➕ Agregar producto** | Crea una presentación nueva. No permite nombres repetidos. |

---

## 💵 Cierre de caja
**Quién:** administrador y supervisor. **Para qué sirve:** comprobar que el efectivo del cajón cuadra con lo vendido.

| Elemento | Qué hace |
|---|---|
| **Ventas en efectivo / Transferencias / Tarjeta** | Lo vendido hoy por cada forma de pago. Solo el efectivo debe estar en el cajón. |
| **Total vendido hoy** | Suma de todo y número de ventas. |
| **Base de caja** | Dinero con el que empezó el día (para dar cambio). Se sugiere la del último cierre. |
| **Efectivo contado** | Lo que realmente hay en el cajón. |
| **Cuadre en vivo** | Base + ventas en efectivo − gastos en efectivo = **lo que debería haber**. Compara con lo contado y muestra **Cuadra ✔ / Sobran $ / Faltan $**. |
| **Nota** | Para explicar una diferencia. |
| **🖨 Imprimir** | Imprime la pantalla. |
| **Guardar cierre** | Guarda una «foto» del día (el servidor **recalcula** todo; el navegador no decide lo esperado). **No se puede editar después.** |
| **Cierres anteriores** | Últimos 15 cierres: quién, base, esperado, contado y diferencia. |

---

## 💸 Gastos
**Quién:** solo administrador. **Para qué sirve:** anotar lo que gasta el negocio además de los pollos, para que la utilidad sea real.

| Elemento | Qué hace |
|---|---|
| **¿En qué se gastó?** | Descripción libre («Bulto de carbón»). |
| **Categoría** | Carbón/gas · Servicios · Empaques · Nómina · Mantenimiento · Otros. |
| **Valor ($)** | Cuánto costó. |
| **Se pagó en** | Efectivo (**sale del cajón y el cierre de caja lo descuenta**) o transferencia. |
| **Fecha** | Día del gasto (no puede ser futuro). |
| **Gastos de los últimos 30 días** | Lista con el total acumulado. |
| **Anular** | Si te equivocaste (con segundo toque). El gasto deja de contar y queda en la bitácora. |

---

## 📊 Reportes
**Quién:** administrador y supervisor. **Para qué sirve:** ver cómo le va al negocio.

| Elemento | Qué hace |
|---|---|
| **7 / 15 / 30 días** | Cambia el periodo. |
| **Ventas** | Dinero vendido, número de ventas, pollos y ticket promedio. |
| **Compras de pollos** | Lo comprado (menos devoluciones) y el costo promedio por pollo. |
| **Gastos** | Total de gastos y pérdidas por mermas/consumos (valoradas al costo promedio). |
| **Utilidad estimada** | Ventas − costo de lo vendido − gastos − pérdidas. |
| **Día por día** | Barras: ventas (amarillo) frente a salidas de dinero (blanco = compras + gastos). Pasa el cursor para ver los valores. |
| **Por producto** | Unidades y dinero de cada presentación. |
| **Por forma de pago** | Porcentaje de efectivo, transferencia y tarjeta. |
| **Por vendedor** | Cuánto vendió cada persona. |
| **⬇ Descargar CSV** | Archivo para abrir en Excel. |
| **🖨 Imprimir reporte** | Imprime sin menús ni botones. |

---

## 👥 Equipo y roles
**Quién:** solo administrador. **Para qué sirve:** crear las cuentas del personal y decidir qué puede hacer cada uno.

| Elemento | Qué hace |
|---|---|
| **Tarjetas de roles** | Explican cada rol y listan, con ✔ y ✖, lo que puede y no puede hacer. Pasa el cursor sobre un permiso para ver su descripción. Muestra cuántas personas activas tiene cada rol. |
| **Personas con acceso** | Nombre, correo, rol, estado (Activo · Desactivado · Debe cambiar la clave) y último ingreso. |
| **Editar** | Cambia nombre, rol o desactiva la cuenta. **Rige al instante**, incluso con la sesión abierta. |
| **Restablecer clave** | Asigna una contraseña temporal, **desbloquea** la cuenta y obliga a cambiarla al entrar. |
| **➕ Crear una cuenta** | Nombre, correo, rol y contraseña temporal. El botón 🎲 genera una segura. |
| **Ventana «Cuenta creada»** | Muestra correo y clave temporal **una sola vez** para entregarlos. |

**Protecciones:** no puedes cambiar tu propio rol ni desactivarte; siempre queda al menos un administrador; no se repiten correos.

---

## 📜 Bitácora
**Quién:** solo administrador. **Para qué sirve:** saber quién hizo qué y cuándo. **Nadie puede editarla ni borrarla.**

| Elemento | Qué hace |
|---|---|
| **Filtro de acciones** | Muestra solo un tipo: ingresos, bloqueos, compras, anulaciones, devoluciones, ajustes, stock mínimo, productos, usuarios, claves, gastos o cierres de caja. |
| **Cada línea** | Fecha y hora · persona y su rol · acción · detalle (qué cambió y de qué valor a cuál). |

---

## 💡 Ayuda
**Quién:** todos. **Para qué sirve:** explicar el sistema.

| Elemento | Qué hace |
|---|---|
| **Buscador** | Filtra la ayuda por una palabra («devolución», «caja»…). |
| **Tu rol** | Qué eres y qué puedes hacer, con botón para repetir el recorrido. |
| **1 · Empieza aquí** | Los primeros pasos de tu rol. |
| **2 · ¿Quién puede hacer qué?** | Matriz de permisos por rol; tu columna está resaltada. |
| **3 · Para qué sirve cada pantalla** | Desplegables con cada pantalla y cada botón. Las que tu rol no puede usar aparecen con 🔒. |
| **4 · Preguntas frecuentes** | Respuestas a dudas comunes. |
| **5 · Palabras que usa el sistema** | Glosario: stock, merma, anular, cierre de caja, utilidad… |

---

## 📍 Contacto
**Quién:** todos. Dirección del asadero, enlace al sitio de la FET y botón **Ver en Google Maps**.

---

## Mensajes del sistema más comunes

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| «Tu rol no tiene permiso para esta acción.» | Tu rol no puede hacer eso. | Pídeselo al administrador. |
| «No alcanzan los pollos: quedan N» | Intentas vender más de lo que hay. | Revisa el inventario o avisa al administrador. |
| «Antes de continuar debes cambiar tu contraseña.» | Tienes una contraseña temporal. | Crea tu contraseña personal. |
| «Tu sesión terminó. Ingresa de nuevo.» | Se venció la sesión (12 horas) o el administrador desactivó tu cuenta. | Vuelve a entrar. |
| «Demasiados intentos…» | Muchos intentos de ingreso desde el mismo equipo. | Espera un minuto. |
| «Cuenta bloqueada» | 5 intentos fallidos con tu correo. | Espera 5 minutos o pide restablecer la clave. |
| «No se puede anular: ya se vendieron…» | Los pollos de esa compra ya salieron. | Usa un ajuste si corresponde, o consulta al administrador. |
| «Sin conexión con el servidor del asadero» | El programa del local está apagado o sin red. | Revisa que esté encendido y que estés en el mismo WiFi. |
