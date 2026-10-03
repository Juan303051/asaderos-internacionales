// =====================================================================
//  Asadero Pío Pío · Contenido del Centro de Ayuda y del recorrido de bienvenida.
//  Está separado del resto del código para poder cambiar los textos sin tocar la lógica.
//  La misma información está en docs/MANUAL_DE_USUARIO.md y docs/GUIA_DE_PANTALLAS.md.
// =====================================================================

// Recorrido que ve cada persona la primera vez que entra (se puede repetir desde "Mi cuenta").
const RECORRIDO = {
 comun: { icono: '👋', titulo: 'Bienvenido al sistema del asadero', texto: 'Aquí se lleva la cuenta de los pollos, las ventas y el dinero. Todo se guarda en una base de datos segura y funciona desde el computador, la tablet o el celular.' },
 roles: {
  admin: [
   { icono: '👑', titulo: 'Eres el administrador', texto: 'Tú controlas todo. Eres la única persona que puede modificar el inventario, cambiar precios y crear cuentas. Los cajeros y supervisores solo ven lo que les corresponde.' },
   { icono: '📦', titulo: 'Empieza por el inventario', texto: 'Ve a «Inventario» y registra tu primera compra de pollos. Mientras no haya pollos registrados, nadie podrá vender. También ahí defines el «stock mínimo»: el número de pollos que enciende la alerta roja.' },
   { icono: '👥', titulo: 'Crea a tu equipo', texto: 'En «Equipo y roles» crea una cuenta por persona (nunca compartan una sola). Cada cuenta recibe una contraseña temporal que la persona debe cambiar al entrar.' },
   { icono: '💡', titulo: 'Si dudas, abre «Ayuda»', texto: 'Ahí está explicada cada pantalla y cada botón con palabras sencillas. También puedes pulsar Ctrl + K para ir rápido a cualquier pantalla.' },
  ],
  supervisor: [
   { icono: '🧭', titulo: 'Eres supervisor', texto: 'Vigilas el negocio sin tocar el inventario: puedes vender, ver las ventas de todos, consultar los reportes y hacer el cierre de caja.' },
   { icono: '🧾', titulo: 'Revisa las ventas', texto: 'En «Ventas» ves lo que se ha vendido cada día, quién lo vendió y cómo pagó el cliente. Si hay una venta equivocada, avisa al administrador: solo él puede anularla.' },
   { icono: '💵', titulo: 'Cierra la caja al final del día', texto: 'En «Cierre de caja» cuentas el efectivo y el sistema te dice si coincide con lo vendido. La diferencia queda guardada.' },
   { icono: '💡', titulo: 'Si dudas, abre «Ayuda»', texto: 'Cada pantalla y botón está explicado ahí. Pulsa Ctrl + K para ir rápido a cualquier pantalla.' },
  ],
  cajero: [
   { icono: '🛒', titulo: 'Eres cajero', texto: 'Tu trabajo es atender al cliente: registrar las ventas. El sistema descuenta los pollos del inventario solo, así que no tienes que llevar cuentas aparte.' },
   { icono: '👆', titulo: 'Así se vende', texto: 'En «Vender» toca lo que pide el cliente, elige cómo paga (efectivo, transferencia o tarjeta) y pulsa «Registrar venta». Si paga en efectivo, escribe con cuánto paga y el sistema te dice el cambio.' },
   { icono: '🔒', titulo: 'Qué no puedes hacer (y por qué)', texto: 'No puedes modificar el inventario ni los precios: eso lo hace solo el administrador para que las cuentas siempre cuadren. Si algo no coincide, avísale.' },
   { icono: '💡', titulo: 'Si dudas, abre «Ayuda»', texto: 'Ahí está explicado cada botón. Si te equivocas en una venta, no la repitas: avisa al administrador para que la anule.' },
  ],
 },
};

// Cada pantalla: para qué sirve, quién la usa, cómo se usa y qué hace cada elemento.
const GUIA_PANTALLAS = [
 { id: 'inicio', icono: '🏠', nombre: 'Inicio', quien: 'Todos',
   que: 'Es el resumen del día. Te dice cuántos pollos quedan, cuánto se ha vendido y cuál es el siguiente paso recomendado.',
   elementos: [
    ['Saludo y rol', 'Muestra tu nombre y tu rol. El rol decide qué pantallas ves y qué puedes hacer.'],
    ['Franja roja de alerta', 'Aparece cuando los pollos disponibles son iguales o menores al stock mínimo. Es la señal de que hay que comprar.'],
    ['Pollos disponibles', 'Cuántos pollos enteros quedan. La barra se pone roja cuando quedan pocos. «Alcanza para…» calcula cuántos días duran según lo que se vendió en la última semana.'],
    ['Ventas de hoy', 'Dinero vendido hoy y cuántos pollos salieron. El cajero ve solo sus propias ventas («Mi turno»); el supervisor y el administrador ven las de todos.'],
    ['Utilidad estimada', 'Lo que va ganando el negocio hoy: ventas, menos lo que costaron los pollos vendidos, menos los gastos. Solo la ven el administrador y el supervisor.'],
    ['¿Qué quieres hacer?', 'Accesos directos a las pantallas que tu rol puede usar.'],
    ['Lo más vendido', 'Las presentaciones que más se han pedido hoy.'],
    ['Últimos movimientos', 'Las últimas compras, ventas, devoluciones y ajustes del inventario.'],
   ]},
 { id: 'vender', icono: '🛒', nombre: 'Vender', quien: 'Administrador, supervisor y cajero',
   que: 'Aquí se atiende al cliente y se registra la venta. El sistema descuenta los pollos del inventario automáticamente.',
   elementos: [
    ['Quedan N pollos', 'Los pollos disponibles en este momento. Se actualiza según lo que vas agregando al pedido.'],
    ['Tarjetas amarillas', 'Cada una es una presentación (pollo y medio, 1 pollo, medio, cuarto). Toca una para agregarla al pedido; toca varias veces para agregar más. Si no alcanzan los pollos, la tarjeta se apaga.'],
    ['Pedido actual', 'La lista de lo que pidió el cliente. Con − y + cambias las cantidades.'],
    ['Forma de pago', 'Efectivo, transferencia o tarjeta. Sirve para que el cierre de caja separe el dinero.'],
    ['El cliente paga con', 'Solo para efectivo. Escribe el billete que te dan (o toca un valor rápido) y el sistema calcula el cambio que debes devolver.'],
    ['Nota', 'Texto opcional: «para llevar», «mesa 3», nombre del cliente…'],
    ['Vaciar', 'Borra el pedido sin registrar nada.'],
    ['Registrar venta', 'Guarda la venta, descuenta los pollos y muestra el recibo con el cambio. Después de registrarla, solo el administrador puede anularla.'],
   ]},
 { id: 'ventas', icono: '🧾', nombre: 'Ventas', quien: 'Todos (cada rol ve algo distinto)',
   que: 'Lista de ventas de un día. Sirve para revisar qué se vendió, quién lo vendió y cómo pagó el cliente.',
   elementos: [
    ['Selector de día', 'Solo para administrador y supervisor: permite ver cualquier día. El cajero ve únicamente sus ventas de hoy.'],
    ['Totales', 'Suma de las ventas vigentes del día (las anuladas no cuentan).'],
    ['Tabla de ventas', 'Hora, quién vendió, qué se vendió, forma de pago y valor. Las ventas anuladas aparecen tachadas.'],
    ['Anular', 'Solo administrador. Deshace una venta equivocada: los pollos vuelven al inventario y queda anotado en la bitácora. Pide una segunda confirmación.'],
   ]},
 { id: 'inventario', icono: '📦', nombre: 'Inventario', quien: 'Todos pueden ver · solo el administrador modifica',
   que: 'Es la cuenta oficial de los pollos: cuántos hay, cuántos entraron y cuántos salieron. Es la única pantalla donde se puede cambiar el inventario, y solo el administrador puede hacerlo.',
   elementos: [
    ['Pollos disponibles', 'Compras − devoluciones − ventas ± ajustes. Nunca se escribe a mano: siempre sale de los movimientos.'],
    ['Stock mínimo', 'El número de pollos que enciende la alerta roja. Solo el administrador lo cambia.'],
    ['Registrar compra', 'Administrador. Cuando llegan pollos del proveedor: cantidad, costo por pollo, proveedor y fecha. Suma al inventario y alimenta el cálculo de utilidad.'],
    ['Registrar devolución', 'Administrador. Devuelve al proveedor pollos de una compra (por ejemplo, llegaron en mal estado). Resta del inventario y no deja devolver pollos que ya se vendieron.'],
    ['Ajustar inventario', 'Administrador. Para pollos que salen sin ser venta: merma (se dañaron), consumo del personal, donación; o para corregir tras un conteo físico. Siempre exige un motivo.'],
    ['Compras recientes', 'Administrador. Lista de compras con sus botones «Devolver» y «Anular compra».'],
    ['Historial de movimientos', 'Todos. Cada entrada y salida con fecha, hora, quién la hizo y su detalle. Los valores en dinero solo los ven administrador y supervisor.'],
    ['Aviso «Solo lectura»', 'Lo ven el supervisor y el cajero: recuerda que pueden consultar pero no modificar.'],
   ]},
 { id: 'productos', icono: '🏷️', nombre: 'Productos y precios', quien: 'Solo administrador',
   que: 'Aquí se define qué se vende, a qué precio y cuántos pollos descuenta cada presentación.',
   elementos: [
    ['Nombre', 'Cómo aparece la tarjeta en la pantalla de ventas.'],
    ['Precio', 'Lo que paga el cliente. Cambiarlo no altera las ventas ya hechas: cada venta guarda el precio del momento.'],
    ['Pollos que descuenta', 'Cuánto inventario consume (1 pollo = 1; medio = 0,5; cuarto = 0,25; pollo y medio = 1,5).'],
    ['Visible en ventas', 'Si lo apagas, el producto desaparece de «Vender» pero conserva todo su historial.'],
    ['Guardar', 'Guarda los cambios de esa fila y los anota en la bitácora.'],
    ['Agregar producto', 'Crea una presentación nueva.'],
   ]},
 { id: 'caja', icono: '💵', nombre: 'Cierre de caja', quien: 'Administrador y supervisor',
   que: 'Al terminar el día, cuentas el efectivo y el sistema te dice si cuadra con lo que se vendió.',
   elementos: [
    ['Ventas por forma de pago', 'Lo vendido hoy en efectivo, transferencia y tarjeta. Solo el efectivo debe estar en el cajón.'],
    ['Base de caja', 'El dinero con el que empezó el día (para dar cambio).'],
    ['Gastos en efectivo', 'Gastos pagados con dinero del cajón; se restan de lo esperado.'],
    ['Efectivo esperado', 'Base + ventas en efectivo − gastos en efectivo. Es lo que debería haber.'],
    ['Efectivo contado', 'Lo que cuentas realmente. El sistema muestra al instante si sobra o falta.'],
    ['Guardar cierre', 'Guarda una «foto» de los números del día y la diferencia. No se puede editar después.'],
   ]},
 { id: 'gastos', icono: '💸', nombre: 'Gastos', quien: 'Solo administrador',
   que: 'Anota lo que gasta el negocio además de los pollos (carbón, gas, servicios, empaques, nómina…). Sin esto, la utilidad sería engañosa.',
   elementos: [
    ['Registrar gasto', 'Concepto, categoría, valor, forma de pago y fecha.'],
    ['Forma de pago', 'Si fue en efectivo, el cierre de caja lo descuenta del cajón.'],
    ['Anular', 'Si te equivocaste. El gasto deja de contar y queda anotado en la bitácora.'],
   ]},
 { id: 'reportes', icono: '📊', nombre: 'Reportes', quien: 'Administrador y supervisor',
   que: 'Muestra cómo le va al negocio en los últimos 7, 15 o 30 días.',
   elementos: [
    ['7 / 15 / 30 días', 'Cambia el periodo del reporte.'],
    ['Ventas, Compras, Gastos', 'Totales del periodo.'],
    ['Utilidad estimada', 'Ventas − costo de los pollos vendidos − gastos − pérdidas (mermas y consumos valorados al costo).'],
    ['Gráfico de barras', 'Ventas (amarillo) frente a lo que salió de dinero (blanco: compras y gastos), día por día.'],
    ['Por producto, forma de pago y vendedor', 'Qué se vende más, cómo pagan y quién vende cuánto.'],
    ['Descargar CSV', 'Baja los datos para abrirlos en Excel.'],
    ['Imprimir', 'Imprime el reporte sin menús ni botones.'],
   ]},
 { id: 'equipo', icono: '👥', nombre: 'Equipo y roles', quien: 'Solo administrador',
   que: 'Aquí se crean las cuentas del personal y se decide qué puede hacer cada persona.',
   elementos: [
    ['Tarjetas de roles', 'Explican qué puede hacer cada rol. Los permisos se aplican en el servidor, no se pueden saltar desde el navegador.'],
    ['Crear usuario', 'Nombre, correo, rol y contraseña temporal. La persona debe cambiarla al entrar por primera vez.'],
    ['Editar', 'Cambia el nombre, el rol o desactiva la cuenta. El cambio rige al instante, incluso si la persona ya tiene la sesión abierta.'],
    ['Restablecer clave', 'Pone una contraseña temporal nueva (por ejemplo, si alguien la olvidó) y desbloquea la cuenta.'],
    ['Protecciones', 'No puedes cambiarte tu propio rol ni desactivarte, y siempre debe quedar al menos un administrador activo.'],
   ]},
 { id: 'bitacora', icono: '📜', nombre: 'Bitácora', quien: 'Solo administrador',
   que: 'Registro automático de quién hizo cada cambio importante y cuándo. Nadie puede editarlo ni borrarlo.',
   elementos: [
    ['Filtro', 'Muestra solo un tipo de acción (compras, anulaciones, precios, usuarios…).'],
    ['Cada línea', 'Fecha y hora, persona, rol, acción y el detalle (qué cambió y de qué valor a cuál).'],
   ]},
 { id: 'contacto', icono: '📍', nombre: 'Contacto', quien: 'Todos',
   que: 'Dirección del asadero y acceso rápido al mapa.', elementos: [] },
];

const PREGUNTAS = [
 ['¿Por qué no me deja entrar a «Inventario» para cambiar cosas?', 'Porque solo el administrador puede modificar el inventario. Es una regla de seguridad para que la cuenta de pollos siempre sea confiable. Tú puedes consultar las existencias y el historial; si algo no coincide, avísale al administrador.'],
 ['Me equivoqué en una venta, ¿qué hago?', 'No registres otra venta para «corregir». Avisa al administrador: él anula la venta equivocada (los pollos vuelven al inventario) y tú registras la correcta.'],
 ['¿Qué significa la franja roja?', 'Que los pollos disponibles están en el stock mínimo o por debajo. Es el aviso de que hay que comprar más.'],
 ['No alcanzan los pollos para una venta', 'El sistema no deja vender más de lo que hay. Revisa el inventario; si en realidad hay pollos que no se registraron, el administrador debe registrar la compra o hacer un ajuste de conteo.'],
 ['Olvidé mi contraseña', 'Pídele al administrador que use «Restablecer clave» en «Equipo y roles». Te dará una temporal que cambiarás al entrar.'],
 ['Dice «cuenta bloqueada»', 'Fueron 5 intentos fallidos seguidos. Espera 5 minutos o pide al administrador que restablezca tu clave.'],
 ['¿Qué diferencia hay entre devolución, anulación y ajuste?', 'Devolución: se regresan pollos al proveedor. Anulación: se deshace un registro hecho por error (una compra o una venta). Ajuste: pollos que salen sin ser venta (merma, consumo, donación) o corrección tras contar.'],
 ['¿Por qué la utilidad es «estimada»?', 'Porque usa el costo promedio de los pollos comprados y los gastos que se hayan registrado. Si no se registran todas las compras y gastos, la utilidad real será distinta.'],
 ['¿Puedo usarlo desde el celular o la tablet?', 'Sí. Abre la dirección que aparece al encender el programa (por ejemplo http://192.168.1.20:5080) desde el mismo WiFi. Puedes «instalarlo» en la pantalla de inicio desde el menú del navegador.'],
 ['¿Dónde queda lo que se guarda?', 'En la base de datos PostgreSQL del computador del asadero. Haz el respaldo diario con el script de la carpeta scripts/.'],
];

const GLOSARIO = [
 ['Stock / existencias', 'Cantidad de pollos que hay disponibles ahora mismo.'],
 ['Stock mínimo', 'Cantidad que, al alcanzarse, enciende la alerta roja para que se compre.'],
 ['Presentación', 'Cada forma en que se vende el pollo: 1/4, medio, entero o pollo y medio.'],
 ['Merma', 'Pollo que se daña o se pierde y ya no se puede vender.'],
 ['Devolución', 'Pollos que se regresan al proveedor.'],
 ['Anular', 'Deshacer un registro hecho por error. El registro no se borra: queda marcado y anotado en la bitácora.'],
 ['Ajuste', 'Corrección manual del inventario, siempre con motivo y a nombre de quien lo hizo.'],
 ['Cierre de caja', 'Conteo del efectivo al final del día para comprobar que cuadra con las ventas.'],
 ['Base de caja', 'Dinero con el que empieza el cajón para poder dar cambio.'],
 ['Utilidad', 'Lo que realmente gana el negocio después de descontar costos, gastos y pérdidas.'],
 ['Rol', 'Conjunto de permisos de una persona: administrador, supervisor o cajero.'],
 ['Bitácora', 'Historial automático de quién hizo qué. No se puede modificar.'],
];
