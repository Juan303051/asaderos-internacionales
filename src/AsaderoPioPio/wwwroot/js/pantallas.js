// =====================================================================
//  Asadero Pío Pío · Pantallas del día a día (versión 4.0)
//  Inicio · Vender · Ventas · Inventario · Productos y precios
//  Las pantallas de gestión (caja, gastos, reportes, equipo, bitácora, ayuda)
//  están en pantallas-gestion.js.
//  Cada pantalla se registra en SEC con: nombre, icono, permiso necesario (perm),
//  cargar() → pide los datos al servidor, pintar(datos) → devuelve el HTML.
// =====================================================================

// ---- Ayudas de presentación
const v = (f, n) => f.elements[n].value;
const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches' };
const hoyLocal = () => S.hoy || new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const sumarDias = (f, n) => { const [y, m, d] = f.split('-'); const t = new Date(+y, +m - 1, +d + n); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') };
const fechaCorta = f => { const [y, m, d] = f.split('-'); return new Date(+y, +m - 1, +d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) };
const rolTag = (rol, nombre) => `<span class="rol rol-${esc(rol)}">${esc(nombre)}</span>`;
const encabezado = (titulo, paraQue, extra = '') => `<header class="enc"><div><h2>${titulo}</h2><p class="para-que"><b>¿Para qué sirve?</b> ${paraQue}</p></div>${extra}</header>`;
const tabla = (cabeza, filas, vacio) => `<div class="tw"><table><thead><tr>${cabeza.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas.length ? filas.join('') : `<tr><td colspan="${cabeza.length}" class="empty-cell">${vacio}</td></tr>`}</tbody></table></div>`;
const aviso_sololectura = `<div class="banner lectura"><b>🔒 Solo lectura.</b> Solo el administrador puede modificar el inventario. Puedes consultarlo; si algo no coincide, avísale.</div>`;
const AJUSTES = { merma: 'Merma', consumo: 'Consumo del personal', donacion: 'Donación', conteo_mas: 'Conteo: sobraban', conteo_menos: 'Conteo: faltaban' };

// Cuenta animada de un número (de su valor anterior al nuevo)
function cuenta(el, to, fmt) { if (!el) return; const from = el._v || 0; el._v = to; const t0 = performance.now(); (function paso(t) { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(paso) })(t0) }
// Lluvia de confeti amarillo/blanco al registrar una venta
function fiesta() { for (let i = 0; i < 36; i++) { const c = document.createElement('u'); c.className = 'cf'; c.style.cssText = `left:${40 + Math.random() * 20}vw;--dx:${(Math.random() - .5) * 70}vw;--dy:${20 + Math.random() * 50}vh;background:${i % 3 ? '#FFC400' : '#fff'};animation-delay:${Math.random() * .15}s`; document.body.appendChild(c); setTimeout(() => c.remove(), 1400) } }

// Descripción de cada movimiento del inventario (c compra · r devolución · v venta · a ajuste)
function movInfo(m) {
 if (m.tipo === 'c') return { t: 'Compra', cls: 'in', sig: '+', p: m.pollos, nota: m.nota || 'Sin proveedor' };
 if (m.tipo === 'r') return { t: 'Devolución', cls: 'out', sig: '−', p: Math.abs(m.pollos), nota: m.nota };
 if (m.tipo === 'v') return { t: 'Venta', cls: 'out', sig: '−', p: m.pollos, nota: m.nota };
 const i = m.nota.indexOf(': '), k = i > 0 ? m.nota.slice(0, i) : '', motivo = i > 0 ? m.nota.slice(i + 2) : m.nota;
 return { t: AJUSTES[k] || 'Ajuste', cls: m.pollos >= 0 ? 'in' : 'out', sig: m.pollos >= 0 ? '+' : '−', p: Math.abs(m.pollos), nota: motivo };
}
function tablaMovimientos(movs, conAcciones) {
 const costos = tiene('ver_costos');
 return tabla(['Fecha', 'Tipo', 'Pollos', 'Detalle', 'Quién', ...(costos ? ['Valor'] : []), ...(conAcciones ? ['Acciones'] : [])],
  movs.map(m => {
   const i = movInfo(m);
   const acc = m.tipo === 'v' ? `<button class="mini" data-act="anularVenta" data-id="${m.id}" data-confirma="1">Anular venta</button>` : m.tipo === 'c' ? `<button class="mini" data-act="anularCompra" data-id="${m.id}" data-confirma="1">Anular compra</button>` : '';
   return `<tr><td>${esc(m.fecha.slice(5))} · ${esc(m.hora)}</td><td><span class="tag ${i.cls}">${i.t}</span></td><td class="mov-${i.cls}">${i.sig}${num(i.p)}</td><td class="ancho">${esc(i.nota)}</td><td>${esc(m.usuario)}</td>${costos ? `<td>${m.valor ? money(Math.abs(m.valor)) : '—'}</td>` : ''}${conAcciones ? `<td>${acc}</td>` : ''}</tr>`;
  }), 'Aún no hay movimientos.');
}

// ---- Acciones compartidas (anular una venta o una compra; solo las ofrece el administrador)
ACC.anularVenta = async b => { await api('/api/ventas/' + b.dataset.id + '/anular', 'POST'); aviso('Venta anulada. Los pollos volvieron al inventario.'); await refrescar() };
ACC.anularCompra = async b => { await api('/api/compras/' + b.dataset.id + '/anular', 'POST'); aviso('Compra anulada. Se actualizó el inventario.'); await refrescar() };

// =====================================================================
//  INICIO
// =====================================================================
SEC.inicio = {
 nombre: 'Inicio', icono: '🏠', palabras: 'resumen panel hoy',
 cargar: async () => { const d = await api('/api/resumen'); S.hoy = d.hoy; marcarAlerta(d.stock <= d.stockMinimo); return d },
 pintar: d => {
  const bajo = d.stock <= d.stockMinimo, propias = d.alcance === 'propias';
  const delta = d.ventasAyer.valor > 0 ? Math.round((d.ventasHoy.valor - d.ventasAyer.valor) / d.ventasAyer.valor * 100) : null;
  const pct = Math.min(100, d.stock / Math.max(d.stockMinimo * 3, 1) * 100);
  const paso = siguientePaso(d);
  const atajos = [
   ['vender', '🛒', 'Vender', 'Atender al cliente y registrar la venta', tiene('vender')],
   ['ventas', '🧾', propias ? 'Mis ventas de hoy' : 'Ventas del día', propias ? 'Revisa lo que has vendido en tu turno' : 'Quién vendió qué y cómo pagó', true],
   ['inventario', '📦', esAdmin() ? 'Inventario' : 'Ver existencias', esAdmin() ? 'Registrar compras, devoluciones y ajustes' : 'Cuántos pollos hay y qué movimientos ha habido', true],
   ['caja', '💵', 'Cierre de caja', 'Contar el efectivo y ver si cuadra', tiene('cerrar_caja')],
   ['reportes', '📊', 'Reportes', 'Ventas, gastos y utilidad', tiene('ver_reportes')],
   ['equipo', '👥', 'Equipo y roles', 'Crear cuentas y asignar permisos', tiene('gestionar_usuarios')],
   ['ayuda', '💡', '¿Cómo funciona?', 'Cada pantalla y botón, explicado', true],
  ].filter(a => a[4]);
  return `
  <header class="enc hero"><div><p class="saludo">${saludo()}, <b>${esc(P.nombre.split(' ')[0])}</b> 👋</p><h2>Así está el asadero hoy</h2>
   <p class="para-que"><b>¿Para qué sirve?</b> Es tu resumen del día: cuántos pollos quedan, cuánto se ha vendido y qué conviene hacer ahora.</p></div>
   <div class="hero-rol">${rolTag(P.rol, P.rolNombre)}<small>${esc(P.rolLema)}</small></div></header>


  <div class="paso ${paso.cls || ''}"><div><b>${paso.cls === 'rojo' ? '🚨 ' : ''}${esc(paso.t)}</b><span>${esc(paso.d)}</span></div>${paso.go ? `<button class="btn" data-go="${paso.go}">${esc(paso.b)}</button>` : ''}</div>

  <div class="grid kpis">
   <div class="card"><p>Pollos disponibles</p><div class="big" id="st">0</div><div class="meter"><i style="width:${pct}%;background:${bajo ? 'var(--red)' : 'var(--green)'}"></i></div>
    <span class="chip" style="background:${bajo ? 'var(--red)' : 'var(--green)'};color:${bajo ? '#fff' : '#000'}">${d.stock <= 0 ? 'Agotado' : bajo ? 'Próximo a agotarse' : 'Disponible'}</span>
    <p class="pie">${d.diasRestantes != null ? `Al ritmo de la última semana, alcanza para ~${num(d.diasRestantes)} día(s).` : 'Aún no hay ventas para estimar cuánto dura.'}</p></div>
   <div class="card"><p>${propias ? 'Mis ventas de hoy' : 'Ventas de hoy'}</p><div class="big med" id="vh">$ 0</div>
    <p class="pie">${num(d.ventasHoy.pollos)} pollos · ${d.ventasHoy.cantidad} venta(s)${delta != null ? ` · <b class="${delta >= 0 ? 'sube' : 'baja'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</b> vs ayer` : ''}</p></div>
   ${d.utilidadHoy != null ? `<div class="card"><p>Utilidad estimada de hoy</p><div class="big med ${d.utilidadHoy < 0 ? 'neg' : ''}" id="ut">$ 0</div><p class="pie">Ventas − costo de los pollos − gastos del día.</p></div>` : ''}
   <div class="card"><p>Stock mínimo (alerta roja)</p><div class="big med" style="color:var(--white)">${num(d.stockMinimo)}</div><p class="pie">${esAdmin() ? 'Puedes cambiarlo en <a href="#" data-go="inventario">Inventario</a>.' : 'Solo el administrador lo cambia.'}</p></div>
  </div>

  <h3 class="sub">¿Qué quieres hacer?</h3>
  <div class="atajos">${atajos.map(a => `<button class="atajo" data-go="${a[0]}"><span class="ico">${a[1]}</span><b>${a[2]}</b><small>${a[3]}</small></button>`).join('')}</div>

  <div class="dos-col">
   <div class="card"><h3>Lo más vendido ${propias ? 'en tu turno' : 'hoy'}</h3>${d.masVendidos.length ? d.masVendidos.map(m => `<div class="barra-h"><span>${esc(m.nombre)}</span><div><i style="width:${m.cantidad / d.masVendidos[0].cantidad * 100}%"></i></div><b>${m.cantidad}</b></div>`).join('') : '<p class="vacio">Todavía no hay ventas hoy.</p>'}</div>
   <div class="card"><h3>Últimos movimientos</h3>${tablaMovimientos(d.ultimos, false)}</div>
  </div>`;
 },
 listo() { const d = SEC.inicio.datos; cuenta($('st'), d.stock, num); cuenta($('vh'), d.ventasHoy.valor, money); if ($('ut')) cuenta($('ut'), d.utilidadHoy, money) },
};
function siguientePaso(d) {
 if (d.stock <= 0) return esAdmin() ? { cls: 'rojo', t: 'No hay pollos en el inventario', d: 'Registra una compra para poder vender.', go: 'inventario', b: 'Registrar compra' } : { cls: 'rojo', t: 'No hay pollos disponibles', d: 'Avisa al administrador para que registre una compra.' };
 if (d.stock <= d.stockMinimo) return esAdmin() ? { cls: 'rojo', t: 'Quedan pocos pollos', d: 'Conviene comprar antes de que se agoten.', go: 'inventario', b: 'Registrar compra' } : { cls: 'rojo', t: 'Quedan pocos pollos', d: 'Avisa al administrador antes de que se agoten.' };
 if (tiene('vender') && d.ventasHoy.cantidad === 0) return { t: 'Todo listo para vender', d: 'Aún no hay ventas ' + (d.alcance === 'propias' ? 'en tu turno.' : 'hoy.'), go: 'vender', b: 'Ir a vender' };
 if (tiene('cerrar_caja') && new Date().getHours() >= 18) return { t: 'Se acerca el cierre del día', d: 'Cuando termines, cuenta el efectivo para ver si cuadra.', go: 'caja', b: 'Cierre de caja' };
 return { t: 'Todo en orden', d: 'Los pollos están en un nivel saludable.' };
}

// =====================================================================
//  VENDER
// =====================================================================
let PRE = [], STOCK = 0;
SEC.vender = {
 nombre: 'Vender', icono: '🛒', perm: 'vender', palabras: 'cobrar pedido venta caja mostrador',
 cargar: async () => { const d = await api('/api/resumen'); S.hoy = d.hoy; PRE = d.presentaciones; STOCK = d.stock; marcarAlerta(d.stock <= d.stockMinimo); return d },
 pintar: d => {
  for (const id of Object.keys(S.cart)) if (!PRE.some(p => p.id == id)) delete S.cart[id];
  return `${encabezado('Vender', 'Aquí se atiende al cliente. Toca lo que pide, elige cómo paga y registra la venta: el sistema descuenta los pollos solo.')}
  <div class="vender-grid">
   <div><div class="stockvivo" id="stockVivo"></div>
    <div class="tiles" id="tl">${PRE.length ? PRE.map(p => `<button class="tile" data-act="add" data-id="${p.id}"><b>${esc(p.nombre)}</b><span>${money(p.precio)}</span><small>descuenta ${num(p.equivalente)} pollo(s)</small></button>`).join('') : '<p class="vacio">No hay productos activos. El administrador debe crearlos en «Productos y precios».</p>'}</div>
    <p class="nota-chica">Todas las presentaciones incluyen papa, arroz y ají (no se contabilizan en el inventario).</p></div>
   <aside class="card pedido"><h3>Pedido actual</h3><div id="ct"></div>
    <label>¿Cómo paga?</label>
    <div class="seg" role="radiogroup" aria-label="Forma de pago">${Object.entries(METODOS).map(([k, t]) => `<button type="button" role="radio" aria-checked="${S.metodo === k}" class="${S.metodo === k ? 'on' : ''}" data-act="metodo" data-m="${k}">${t}</button>`).join('')}</div>
    <div id="efec" ${S.metodo !== 'efectivo' ? 'hidden' : ''}><label for="rec">El cliente paga con ($) <small>(opcional)</small></label>
     <input id="rec" type="number" min="0" step="500" inputmode="numeric" data-input="recibido" value="${S.recibido || ''}" placeholder="Ej.: 50000"><div class="rapidos" id="rapidos"></div><div class="cambio" id="cambio"></div></div>
    <label for="notaV">Nota <small>(opcional)</small></label><input id="notaV" maxlength="120" placeholder="Para llevar, mesa 3, nombre del cliente…">
    <div class="acts"><button class="btn o" data-act="vaciar">Vaciar</button><button class="btn" id="vok" data-act="registrarVenta">Registrar venta</button></div></aside>
  </div>`;
 },
 listo() { pintarPedido() },
};
const totalPedido = () => Object.entries(S.cart).reduce((a, [id, q]) => a + (PRE.find(p => p.id == id)?.precio || 0) * q, 0);
const pollosPedido = () => Object.entries(S.cart).reduce((a, [id, q]) => a + (PRE.find(p => p.id == id)?.equivalente || 0) * q, 0);
function pintarPedido() {
 const ids = Object.keys(S.cart).filter(id => PRE.some(p => p.id == id)), disp = STOCK - pollosPedido(), total = totalPedido();
 $('ct').innerHTML = ids.length ? ids.map(id => { const p = PRE.find(x => x.id == id); return `<div class="row"><span>${esc(p.nombre)} <small>· ${money(p.precio)}</small></span><span class="qty"><button data-act="quitar" data-id="${id}" aria-label="Quitar uno">−</button><b>${S.cart[id]}</b><button data-act="add" data-id="${id}" aria-label="Agregar uno">+</button></span></div>` }).join('') + `<div class="row total"><b>Total</b><b>${money(total)}</b></div>` : '<p class="vacio">Aún no hay productos. Toca una presentación para agregarla.</p>';
 $('stockVivo').innerHTML = `🍗 Quedan <b>${num(disp)}</b> pollo(s) ${Object.keys(S.cart).length ? '<small>(descontando este pedido)</small>' : ''}`;
 $('stockVivo').classList.toggle('bajo', disp <= 0);
 const barra = $('barraPedido'); barra.hidden = !ids.length; barra.innerHTML = `<span>🛒 ${ids.reduce((a, id) => a + S.cart[id], 0)} producto(s) · <b>${money(total)}</b></span><span class="ir">Cobrar ↓</span>`;
 document.querySelectorAll('#tl .tile').forEach(t => { const p = PRE.find(x => x.id == t.dataset.id); const sin = p && p.equivalente > disp; t.disabled = !!sin; t.classList.toggle('agotada', !!sin) });
 pintarCambio();
}
function pintarCambio() {
 const total = totalPedido(), ef = $('efec'); if (!ef) return;
 const montos = [...new Set([total, 20000, 50000, 100000].filter(m => m >= total && m > 0))].slice(0, 4);
 $('rapidos').innerHTML = total > 0 ? montos.map(m => `<button type="button" class="mini" data-act="recibir" data-v="${m}">${m === total ? 'Exacto' : money(m)}</button>`).join('') : '';
 const c = $('cambio');
 if (!S.recibido || total <= 0) { c.innerHTML = ''; return }
 c.innerHTML = S.recibido >= total ? `Cambio a devolver: <b>${money(S.recibido - total)}</b>` : `<span class="falta">Faltan ${money(total - S.recibido)}</span>`;
}
ACC.add = b => {
 const id = b.dataset.id, p = PRE.find(x => x.id == id); if (!p) return;
 if (p.equivalente > STOCK - pollosPedido()) return aviso('No alcanzan los pollos para agregar más.', 1);
 const t = document.querySelector(`#tl .tile[data-id="${id}"]`); if (t && b === t) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop') }
 S.cart[id] = (S.cart[id] || 0) + 1; pintarPedido();
};
ACC.quitar = b => { const id = b.dataset.id; S.cart[id] = (S.cart[id] || 1) - 1; if (S.cart[id] <= 0) delete S.cart[id]; pintarPedido() };
ACC.irPedido = () => document.querySelector('.pedido').scrollIntoView({ behavior: 'smooth', block: 'start' });
ACC.vaciar = () => { S.cart = {}; S.recibido = 0; if ($('rec')) $('rec').value = ''; pintarPedido() };
ACC.metodo = b => { S.metodo = b.dataset.m; document.querySelectorAll('.seg [data-m]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b) }); $('efec').hidden = S.metodo !== 'efectivo'; pintarCambio() };
ACC.recibir = b => { S.recibido = +b.dataset.v; $('rec').value = S.recibido; pintarCambio() };
CAM.recibido = el => { S.recibido = +el.value || 0; pintarCambio() };
ACC.registrarVenta = async b => {
 const ids = Object.keys(S.cart); if (!ids.length) return aviso('Agrega al menos una presentación.', 1);
 const total = totalPedido(), metodo = S.metodo, recibido = metodo === 'efectivo' ? S.recibido : 0;
 if (recibido > 0 && recibido < total) return aviso('El efectivo recibido no alcanza para pagar el total.', 1);
 const lineas = ids.map(id => { const p = PRE.find(x => x.id == id); return { nombre: p.nombre, q: S.cart[id], precio: p.precio } }), nota = $('notaV').value;
 b.disabled = true;
 try {
  const r = await api('/api/ventas', 'POST', { items: ids.map(id => ({ presentacionId: +id, cantidad: S.cart[id] })), metodoPago: metodo, nota });
  S.cart = {}; S.recibido = 0; fiesta(); mostrarRecibo({ id: r.id, total: r.total, metodo, recibido, lineas, nota });
  await refrescar();
 } finally { b.disabled = false }
};
function mostrarRecibo(r) {
 const cambio = r.recibido > r.total ? r.recibido - r.total : 0;
 const cuerpo = `<p class="rec-t">ASADERO PÍO PÍO</p><p class="rec-s">Venta #${r.id} · ${new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>
  ${r.lineas.map(l => `<div class="rec-l"><span>${l.q} × ${esc(l.nombre)}</span><span>${money(l.precio * l.q)}</span></div>`).join('')}
  <div class="rec-l tot"><span>TOTAL</span><span>${money(r.total)}</span></div>
  <div class="rec-l"><span>Pago</span><span>${esc(METODOS[r.metodo].replace(/^\S+\s/, ''))}</span></div>
  ${r.recibido ? `<div class="rec-l"><span>Recibido</span><span>${money(r.recibido)}</span></div><div class="rec-l"><span>Cambio</span><span>${money(cambio)}</span></div>` : ''}
  ${r.nota ? `<p class="rec-s">${esc(r.nota)}</p>` : ''}<p class="rec-s">Atendió: ${esc(P.nombre)} · ¡Gracias por su compra!</p>`;
 $('recibo').innerHTML = cuerpo;
 modal(`<div class="m-form recibo-ok"><div class="ok-ico">✅</div><h3>Venta registrada</h3><div class="ok-total">${money(r.total)}</div>
  ${cambio ? `<div class="ok-cambio">Devuelve de cambio<b>${money(cambio)}</b></div>` : ''}
  <div class="recibo-vista">${cuerpo}</div>
  <div class="acts"><button class="btn o" data-act="imprimirRecibo">🖨 Imprimir recibo</button><button class="btn" data-act="cerrar">Nueva venta</button></div></div>`);
}
ACC.imprimirRecibo = () => { document.body.classList.add('imp-recibo'); window.print(); setTimeout(() => document.body.classList.remove('imp-recibo'), 600) };

// =====================================================================
//  VENTAS (lista de un día)
// =====================================================================
SEC.ventas = {
 nombre: 'Ventas', icono: '🧾', palabras: 'historial lista tickets',
 cargar: async () => { const d = await api('/api/ventas' + (S.fechaVentas && tiene('ver_ventas_todas') ? '?fecha=' + S.fechaVentas : '')); S.hoy = hoyLocal(); return d },
 pintar: d => {
  const todas = d.alcance === 'todas', hoy = hoyLocal(), esHoy = d.fecha === hoy, ayer = sumarDias(hoy, -1);
  const controles = todas ? `<div class="filtros"><button class="chipb ${esHoy ? 'on' : ''}" data-act="diaVentas" data-d="${hoy}">Hoy</button><button class="chipb ${d.fecha === ayer ? 'on' : ''}" data-act="diaVentas" data-d="${ayer}">Ayer</button><input type="date" value="${d.fecha}" max="${hoy}" data-change="fechaVentas" aria-label="Elegir otro día"></div>` : '';
  return `${encabezado(todas ? 'Ventas' : 'Mis ventas de hoy', todas ? 'Lista de las ventas de un día: qué se vendió, quién lo vendió y cómo pagó el cliente. Si hay una venta equivocada, el administrador puede anularla.' : 'Las ventas que has registrado hoy en tu turno. Si te equivocaste en una, avisa al administrador para que la anule.', controles)}
  <div class="grid kpis"><div class="card"><p>${esHoy ? 'Vendido hoy' : 'Vendido el ' + fechaCorta(d.fecha)}</p><div class="big med">${money(d.totales.valor)}</div></div>
   <div class="card"><p>Ventas</p><div class="big med" style="color:var(--white)">${d.totales.cantidad}</div></div>
   <div class="card"><p>Pollos vendidos</p><div class="big med" style="color:var(--white)">${num(d.totales.pollos)}</div></div></div>
  <div class="card" style="margin-top:16px">${tabla(['Hora', ...(todas ? ['Vendedor'] : []), 'Qué se vendió', 'Pago', 'Total', ...(tiene('anular_ventas') ? ['Acciones'] : [])],
   d.ventas.map(x => `<tr class="${x.anulada ? 'anulada' : ''}"><td>${esc(x.hora)}</td>${todas ? `<td>${esc(x.vendedor)}</td>` : ''}<td class="ancho">${esc(x.detalle)}${x.nota ? ` <small>· ${esc(x.nota)}</small>` : ''}</td><td>${esc(METODOS[x.metodo] || x.metodo)}</td><td>${money(x.total)}${x.anulada ? ' <span class="tag out">Anulada</span>' : ''}</td>${tiene('anular_ventas') ? `<td>${x.anulada ? '' : `<button class="mini" data-act="anularVenta" data-id="${x.id}" data-confirma="1">Anular venta</button>`}</td>` : ''}</tr>`),
   'No hay ventas en este día.')}</div>`;
 },
};
ACC.diaVentas = b => { S.fechaVentas = b.dataset.d; return refrescar() };
CAM.fechaVentas = el => { S.fechaVentas = el.value || null; return refrescar() };

// =====================================================================
//  INVENTARIO (todos ven · solo el administrador modifica)
// =====================================================================
SEC.inventario = {
 nombre: 'Inventario', icono: '📦', palabras: 'pollos stock existencias compras devolucion ajuste merma kardex',
 cargar: async () => {
  const adm = tiene('gestionar_inventario');
  const [d, mov, compras] = await Promise.all([api('/api/resumen'), api('/api/movimientos?limite=40'), adm ? api('/api/compras') : Promise.resolve([])]);
  S.hoy = d.hoy; marcarAlerta(d.stock <= d.stockMinimo); return { d, mov, compras };
 },
 pintar: ({ d, mov, compras }) => {
  const adm = tiene('gestionar_inventario'), bajo = d.stock <= d.stockMinimo, pct = Math.min(100, d.stock / Math.max(d.stockMinimo * 3, 1) * 100);
  const proveedores = [...new Set(compras.map(c => c.proveedor).filter(Boolean))];
  const kpis = `<div class="grid kpis">
   <div class="card"><p>Pollos disponibles</p><div class="big">${num(d.stock)}</div><div class="meter"><i style="width:${pct}%;background:${bajo ? 'var(--red)' : 'var(--green)'}"></i></div>
    <span class="chip" style="background:${bajo ? 'var(--red)' : 'var(--green)'};color:${bajo ? '#fff' : '#000'}">${d.stock <= 0 ? 'Agotado' : bajo ? 'Próximo a agotarse' : 'Disponible'}</span></div>
   <div class="card"><p>Stock mínimo (alerta roja)</p>${adm ? `<form data-form="minimo" class="inline-form"><input name="valor" type="number" min="0" step="0.5" value="${d.stockMinimo}" required aria-label="Stock mínimo"><button class="btn">Guardar</button></form><p class="pie">Cuando los pollos lleguen a este número, se enciende la alerta roja.</p>` : `<div class="big med" style="color:var(--white)">${num(d.stockMinimo)}</div><p class="pie">Solo el administrador lo cambia.</p>`}</div>
   <div class="card"><p>¿Cuánto durará?</p><div class="big med" style="color:var(--white)">${d.diasRestantes != null ? '~' + num(d.diasRestantes) + ' d' : '—'}</div><p class="pie">Según lo vendido en los últimos 7 días.</p></div></div>`;

  const formularios = !adm ? '' : `<h3 class="sub">Modificar el inventario <small>(solo administrador)</small></h3>
  <div class="tres-col">
   <form class="card" data-form="compra"><h3>📥 Registrar compra</h3><p class="pie">Llegaron pollos del proveedor. Se suman al inventario.</p>
    <label for="cq">Cantidad de pollos</label><input id="cq" name="cantidad" type="number" min="1" step="1" required data-input="totalCompra">
    <label for="cc">Costo por pollo ($)</label><input id="cc" name="costo" type="number" min="1" required data-input="totalCompra">
    <p class="total-vivo" id="totalCompra"></p>
    <label for="cp">Proveedor</label><input id="cp" name="proveedor" list="provs" maxlength="120" placeholder="Nombre del proveedor"><datalist id="provs">${proveedores.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <label for="cd">Fecha de compra</label><input id="cd" name="fecha" type="date" required value="${d.hoy}" max="${d.hoy}">
    <div class="acts"><button class="btn">Guardar compra</button></div></form>
   <form class="card" id="devolverForm" data-form="devolucion"><h3>↩️ Devolver al proveedor</h3><p class="pie">Pollos que se regresan (mal estado, error del pedido). Se restan del inventario.</p>
    <label for="dv-c">Compra de origen</label><select id="dv-c" name="compra" required><option value="">Selecciona una compra</option>${compras.filter(c => c.disponiblesDevolucion > 0).map(c => `<option value="${c.id}">Compra #${c.id} · ${c.fecha} · ${num(c.disponiblesDevolucion)} por devolver</option>`).join('')}</select>
    <label for="dv-q">Pollos que devuelves</label><input id="dv-q" name="cantidad" type="number" min="1" step="1" required>
    <label for="dv-m">Motivo</label><input id="dv-m" name="motivo" maxlength="160" placeholder="Ej.: llegaron en mal estado">
    <div class="acts"><button class="btn">Guardar devolución</button></div></form>
   <form class="card" data-form="ajuste"><h3>⚖️ Ajustar inventario</h3><p class="pie">Pollos que salen sin ser venta, o corrección después de contar.</p>
    <label for="aj-t">¿Qué pasó?</label><select id="aj-t" name="tipo" required><option value="">Elige una opción</option>
     <optgroup label="Retirar pollos"><option value="merma">Merma: se dañaron o se perdieron</option><option value="consumo">Consumo del personal</option><option value="donacion">Donación</option><option value="conteo_menos">Conteo físico: faltan pollos</option></optgroup>
     <optgroup label="Sumar pollos"><option value="conteo_mas">Conteo físico: sobran pollos</option></optgroup></select>
    <label for="aj-q">Cantidad de pollos</label><input id="aj-q" name="cantidad" type="number" min="0.25" step="0.25" required placeholder="Ej.: 1 o 0,5">
    <label for="aj-m">Motivo (obligatorio)</label><input id="aj-m" name="motivo" required minlength="3" maxlength="160" placeholder="Ej.: se cayó al piso">
    <div class="acts"><button class="btn">Guardar ajuste</button></div></form>
  </div>
  <div class="card" style="margin-top:16px"><h3>Compras recientes</h3><p class="pie">Anula una compra registrada por error o inicia una devolución parcial.</p>
   ${tabla(['Fecha', 'Proveedor', 'Comprados', 'Devueltos', 'Por devolver', 'Total', 'Acciones'], compras.map(c => `<tr><td>${c.fecha}</td><td>${esc(c.proveedor || '—')}</td><td>${num(c.cantidad)}</td><td>${num(c.devueltos)}</td><td>${num(c.disponiblesDevolucion)}</td><td>${money(c.total)}</td><td class="acciones">${c.disponiblesDevolucion > 0 ? `<button class="mini" data-act="elegirDevolucion" data-id="${c.id}">Devolver</button>` : ''}<button class="mini" data-act="anularCompra" data-id="${c.id}" data-confirma="1">Anular compra</button></td></tr>`), 'Todavía no hay compras registradas.')}</div>`;

  return `${encabezado('Inventario', 'Es la cuenta oficial de los pollos: cuántos hay, cuántos entraron y cuántos salieron. Es la única pantalla donde se puede cambiar el inventario, y solo el administrador puede hacerlo.')}
  ${adm ? '<div class="banner admin"><b>👑 Eres administrador.</b> Tú eres la única persona que puede modificar el inventario. Cada cambio queda anotado en la bitácora con tu nombre.</div>' : aviso_sololectura}
  ${kpis}${formularios}
  <div class="card" style="margin-top:16px"><h3>Historial de movimientos</h3><p class="pie">Todo lo que ha entrado y salido, del más reciente al más antiguo.</p>${tablaMovimientos(mov, adm)}</div>`;
 },
};
ENV.minimo = async f => { const r = await api('/api/configuracion/stock-minimo', 'PUT', { valor: +v(f, 'valor') }); aviso('Stock mínimo guardado: ' + num(r.stockMinimo)); await refrescar() };
ENV.compra = async f => { const r = await api('/api/compras', 'POST', { cantidad: +v(f, 'cantidad'), costoUnitario: +v(f, 'costo'), proveedor: v(f, 'proveedor'), fecha: v(f, 'fecha') }); aviso('Compra guardada: ' + num(r.pollos) + ' pollos (' + money(r.total) + ')'); await refrescar() };
ENV.devolucion = async f => { const r = await api('/api/compras/' + v(f, 'compra') + '/devoluciones', 'POST', { cantidad: +v(f, 'cantidad'), motivo: v(f, 'motivo') }); aviso('Devolución registrada: ' + num(r.pollos) + ' pollos'); await refrescar() };
ENV.ajuste = async f => { const r = await api('/api/ajustes', 'POST', { tipo: v(f, 'tipo'), cantidad: +v(f, 'cantidad'), motivo: v(f, 'motivo') }); aviso('Ajuste guardado: ' + (r.pollos > 0 ? '+' : '−') + num(Math.abs(r.pollos)) + ' pollos'); await refrescar() };
CAM.totalCompra = () => { const q = +$('cq').value, c = +$('cc').value; $('totalCompra').innerHTML = q > 0 && c > 0 ? `Total de la compra: <b>${money(q * c)}</b>` : '' };
ACC.elegirDevolucion = b => { const f = $('devolverForm'); f.elements.compra.value = b.dataset.id; f.elements.cantidad.value = 1; f.elements.cantidad.focus(); f.scrollIntoView({ behavior: 'smooth', block: 'center' }) };

// =====================================================================
//  PRODUCTOS Y PRECIOS (solo administrador)
// =====================================================================
SEC.productos = {
 nombre: 'Productos y precios', icono: '🏷️', perm: 'gestionar_precios', palabras: 'precios presentaciones menu carta',
 cargar: () => api('/api/presentaciones'),
 pintar: lista => `${encabezado('Productos y precios', 'Aquí defines qué se vende, a qué precio y cuántos pollos descuenta cada presentación. Cambiar un precio no altera las ventas que ya se hicieron.')}
  <div class="banner admin"><b>👑 Solo administrador.</b> Los productos apagados desaparecen de «Vender», pero conservan su historial.</div>
  <div class="card">${tabla(['Nombre', 'Precio ($)', 'Pollos que descuenta', 'Visible en ventas', ''], lista.map(p => `<tr class="${p.activa ? '' : 'apagado'}"><td><input name="nombre" value="${esc(p.nombre)}" maxlength="60" aria-label="Nombre"></td><td><input name="precio" type="number" min="1" value="${p.precio}" aria-label="Precio"></td><td><input name="eq" type="number" min="0.25" step="0.25" value="${p.equivalente}" aria-label="Pollos que descuenta"></td><td><label class="switch"><input name="activa" type="checkbox" ${p.activa ? 'checked' : ''} aria-label="Visible en ventas"><i></i></label></td><td><button class="mini" data-act="guardarProducto" data-id="${p.id}">Guardar</button></td></tr>`), 'No hay productos.')}</div>
  <form class="card" data-form="producto" style="margin-top:16px"><h3>➕ Agregar producto</h3>
   <div class="fila-form"><div><label for="np-n">Nombre</label><input id="np-n" name="nombre" required maxlength="60" placeholder="Ej.: 2 pollos"></div>
    <div><label for="np-p">Precio ($)</label><input id="np-p" name="precio" type="number" min="1" required></div>
    <div><label for="np-e">Pollos que descuenta</label><input id="np-e" name="eq" type="number" min="0.25" step="0.25" required placeholder="1 · 0,5 · 0,25"></div></div>
   <div class="acts"><button class="btn">Agregar producto</button></div></form>`,
};
ACC.guardarProducto = async b => {
 const tr = b.closest('tr'), g = n => tr.querySelector(`[name=${n}]`);
 await api('/api/presentaciones/' + b.dataset.id, 'PUT', { nombre: g('nombre').value, precio: +g('precio').value, equivalente: +g('eq').value, activa: g('activa').checked });
 aviso('Producto guardado.'); await refrescar();
};
ENV.producto = async f => { await api('/api/presentaciones', 'POST', { nombre: v(f, 'nombre'), precio: +v(f, 'precio'), equivalente: +v(f, 'eq') }); aviso('Producto agregado.'); await refrescar() };
