// =====================================================================
//  Asadero Pío Pío · Pantallas de gestión (versión 4.0)
//  Cierre de caja · Gastos · Reportes · Equipo y roles · Bitácora · Ayuda · Contacto
//  Usa los ayudantes definidos en pantallas.js (encabezado, tabla, rolTag…).
// =====================================================================

const CATEGORIAS = { combustible: 'Carbón / gas', servicios: 'Servicios (agua, luz, internet)', empaques: 'Empaques y desechables', nomina: 'Nómina y pagos al personal', mantenimiento: 'Mantenimiento', otros: 'Otros' };
const colorDif = d => d === 0 ? 'ok' : d > 0 ? 'sobra' : 'falta';
const textoDif = d => d === 0 ? 'Cuadra exacto ✔' : d > 0 ? `Sobran ${money(d)}` : `Faltan ${money(-d)}`;

// =====================================================================
//  CIERRE DE CAJA (administrador y supervisor)
// =====================================================================
SEC.caja = {
 nombre: 'Cierre de caja', icono: '💵', perm: 'cerrar_caja', palabras: 'arqueo efectivo cuadre dinero',
 cargar: () => api('/api/caja'),
 pintar: d => {
  const r = d.resumen, base = d.cierres[0]?.base ?? 0;
  return `${encabezado('Cierre de caja', 'Al terminar el día cuentas el efectivo del cajón y el sistema te dice si cuadra con lo que se vendió. Cada cierre queda guardado y no se puede editar.')}
  <div class="grid kpis">
   <div class="card"><p>💵 Ventas en efectivo</p><div class="big med">${money(r.efectivo)}</div><p class="pie">Es lo único que debe estar en el cajón.</p></div>
   <div class="card"><p>📲 Transferencias</p><div class="big med" style="color:var(--white)">${money(r.transferencia)}</div></div>
   <div class="card"><p>💳 Tarjeta</p><div class="big med" style="color:var(--white)">${money(r.tarjeta)}</div></div>
   <div class="card"><p>Total vendido hoy</p><div class="big med" style="color:var(--white)">${money(r.total)}</div><p class="pie">${r.ventas} venta(s)</p></div>
  </div>
  <form class="card caja-form" data-form="cierre" style="margin-top:16px"><h3>Contar la caja de hoy</h3>
   <div class="fila-form"><div><label for="cj-b">Base de caja ($)</label><input id="cj-b" name="base" type="number" min="0" required value="${base}" data-input="calcCaja"><small class="ayuda-campo">Dinero con el que empezó el día.</small></div>
    <div><label for="cj-c">Efectivo contado ($)</label><input id="cj-c" name="contado" type="number" min="0" required data-input="calcCaja" placeholder="Lo que hay en el cajón"><small class="ayuda-campo">Cuéntalo billete por billete.</small></div></div>
   <div class="cuadre">
    <div><span>Base</span><b id="cu-b">${money(base)}</b></div><div><span>+ Ventas en efectivo</span><b>${money(r.efectivo)}</b></div>
    <div><span>− Gastos en efectivo</span><b>${money(r.gastosEfectivo)}</b></div><div class="sep"><span>= Debería haber</span><b id="cu-e">${money(base + r.efectivo - r.gastosEfectivo)}</b></div>
    <div class="dif" id="cu-d"><span>Diferencia</span><b>Escribe lo contado</b></div></div>
   <label for="cj-n">Nota <small>(opcional)</small></label><input id="cj-n" name="nota" maxlength="160" placeholder="Ej.: faltaron 2.000, se dieron de cambio">
   <div class="acts"><button type="button" class="btn o" onclick="window.print()">🖨 Imprimir</button><button class="btn">Guardar cierre</button></div></form>
  <div class="card" style="margin-top:16px"><h3>Cierres anteriores</h3>${tabla(['Fecha', 'Quién', 'Base', 'Esperado', 'Contado', 'Diferencia', 'Nota'], d.cierres.map(c => `<tr><td>${c.fecha.slice(5)} · ${esc(c.hora)}</td><td>${esc(c.usuario)}</td><td>${money(c.base)}</td><td>${money(c.esperado)}</td><td>${money(c.contado)}</td><td><span class="tag dif-${colorDif(c.diferencia)}">${textoDif(c.diferencia)}</span></td><td class="ancho">${esc(c.nota || '—')}</td></tr>`), 'Todavía no hay cierres guardados.')}</div>`;
 },
};
CAM.calcCaja = () => {
 const r = SEC.caja.datos.resumen, base = +$('cj-b').value || 0, contado = $('cj-c').value, esperado = base + r.efectivo - r.gastosEfectivo;
 $('cu-b').textContent = money(base); $('cu-e').textContent = money(esperado);
 const d = $('cu-d'); if (contado === '') { d.className = 'dif'; d.innerHTML = '<span>Diferencia</span><b>Escribe lo contado</b>'; return }
 const dif = (+contado || 0) - esperado; d.className = 'dif ' + colorDif(dif); d.innerHTML = `<span>Diferencia</span><b>${textoDif(dif)}</b>`;
};
ENV.cierre = async f => {
 const r = await api('/api/caja/cierres', 'POST', { base: +v(f, 'base'), contado: +v(f, 'contado'), nota: v(f, 'nota') });
 aviso('Cierre guardado. ' + textoDif(r.diferencia)); await refrescar();
};

// =====================================================================
//  GASTOS (solo administrador)
// =====================================================================
SEC.gastos = {
 nombre: 'Gastos', icono: '💸', perm: 'gestionar_gastos', palabras: 'egresos carbon gas servicios nomina',
 cargar: async () => { const d = await api('/api/gastos?dias=30'); S.hoy = hoyLocal(); return d },
 pintar: d => `${encabezado('Gastos', 'Anota lo que gasta el negocio además de los pollos (carbón, gas, servicios, empaques, nómina…). Sin esto, la utilidad que muestra el sistema sería engañosa.')}
  <form class="card" data-form="gasto"><h3>➕ Registrar gasto</h3>
   <div class="fila-form"><div class="x2"><label for="g-c">¿En qué se gastó?</label><input id="g-c" name="concepto" required minlength="3" maxlength="120" placeholder="Ej.: Bulto de carbón"></div>
    <div><label for="g-k">Categoría</label><select id="g-k" name="categoria" required>${Object.entries(CATEGORIAS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
    <div><label for="g-v">Valor ($)</label><input id="g-v" name="valor" type="number" min="1" required></div>
    <div><label for="g-m">Se pagó en</label><select id="g-m" name="metodo"><option value="efectivo">💵 Efectivo (sale del cajón)</option><option value="transferencia">📲 Transferencia</option></select></div>
    <div><label for="g-f">Fecha</label><input id="g-f" name="fecha" type="date" required value="${hoyLocal()}" max="${hoyLocal()}"></div></div>
   <div class="acts"><button class="btn">Guardar gasto</button></div></form>
  <div class="card" style="margin-top:16px"><div class="enc-mini"><h3>Gastos de los últimos 30 días</h3><span class="chip" style="background:var(--y);color:#000">Total: ${money(d.total)}</span></div>
   ${tabla(['Fecha', 'Concepto', 'Categoría', 'Pago', 'Valor', 'Registró', ''], d.gastos.map(g => `<tr><td>${g.fecha.slice(5)}</td><td class="ancho">${esc(g.concepto)}</td><td>${esc(CATEGORIAS[g.categoria] || g.categoria)}</td><td>${g.metodo === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}</td><td>${money(g.valor)}</td><td>${esc(g.usuario)}</td><td><button class="mini" data-act="anularGasto" data-id="${g.id}" data-confirma="1">Anular</button></td></tr>`), 'No hay gastos registrados en este periodo.')}</div>`,
};
ENV.gasto = async f => { await api('/api/gastos', 'POST', { concepto: v(f, 'concepto'), categoria: v(f, 'categoria'), valor: +v(f, 'valor'), metodo: v(f, 'metodo'), fecha: v(f, 'fecha') }); aviso('Gasto guardado.'); await refrescar() };
ACC.anularGasto = async b => { await api('/api/gastos/' + b.dataset.id + '/anular', 'POST'); aviso('Gasto anulado.'); await refrescar() };

// =====================================================================
//  REPORTES (administrador y supervisor)
// =====================================================================
SEC.reportes = {
 nombre: 'Reportes', icono: '📊', perm: 'ver_reportes', palabras: 'utilidad ganancias ventas estadisticas',
 cargar: () => api('/api/reportes?dias=' + S.diasReporte),
 pintar: d => {
  const t = d.totales, egresos = d.serie.map(x => x.compras + x.gastos), mx = Math.max(1, ...d.serie.map(x => x.ventas), ...egresos);
  const maxP = Math.max(1, ...d.porPresentacion.map(x => x.valor)), totM = d.porMetodo.reduce((a, x) => a + x.valor, 0) || 1;
  return `${encabezado('Reportes', 'Muestra cómo le va al negocio en los últimos 7, 15 o 30 días: cuánto se vendió, cuánto se gastó y cuánto se ganó.',
   `<div class="filtros">${[7, 15, 30].map(n => `<button class="chipb ${d.dias === n ? 'on' : ''}" data-act="periodo" data-d="${n}">${n} días</button>`).join('')}</div>`)}
  <p class="rango">Del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)}</p>
  <div class="grid kpis">
   <div class="card"><p>Ventas</p><div class="big med">${money(t.ventas)}</div><p class="pie">${t.numVentas} venta(s) · ${num(t.pollosVendidos)} pollos · ticket promedio ${money(t.ticketPromedio)}</p></div>
   <div class="card"><p>Compras de pollos</p><div class="big med" style="color:var(--white)">${money(t.compras)}</div><p class="pie">Costo promedio por pollo: ${money(t.costoPorPollo)}</p></div>
   <div class="card"><p>Gastos</p><div class="big med" style="color:var(--white)">${money(t.gastos)}</div><p class="pie">Pérdidas por mermas y consumos: ${money(t.perdidas)}</p></div>
   <div class="card destacada"><p>Utilidad estimada</p><div class="big med ${t.utilidad < 0 ? 'neg' : ''}">${money(t.utilidad)}</div><p class="pie">Ventas − costo de lo vendido (${money(t.costoVendido)}) − gastos − pérdidas.</p></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Día por día</h3><p class="pie"><i class="lg v"></i> Ventas &nbsp; <i class="lg c"></i> Salidas de dinero (compras + gastos)</p>
   <div class="bars" role="img" aria-label="Gráfico de ventas y salidas de dinero por día">${d.serie.map((x, i) => `<div class="dia"><div class="par"><i title="Ventas ${money(x.ventas)}" style="height:${x.ventas / mx * 100}%"></i><i class="c" title="Compras ${money(x.compras)} + gastos ${money(x.gastos)}" style="height:${egresos[i] / mx * 100}%"></i></div><span>${d.dias > 7 ? x.fecha.slice(8) : fechaCorta(x.fecha).split(' ').slice(0, 2).join(' ')}</span></div>`).join('')}</div></div>
  <div class="tres-col" style="margin-top:16px">
   <div class="card"><h3>Por producto</h3>${d.porPresentacion.length ? d.porPresentacion.map(x => `<div class="barra-h"><span>${esc(x.nombre)}</span><div><i style="width:${x.valor / maxP * 100}%"></i></div><b>${x.cantidad}</b></div><small class="sub-barra">${money(x.valor)}</small>`).join('') : '<p class="vacio">Sin ventas en el periodo.</p>'}</div>
   <div class="card"><h3>Por forma de pago</h3>${d.porMetodo.length ? d.porMetodo.map(x => `<div class="barra-h"><span>${esc(METODOS[x.metodo] || x.metodo)}</span><div><i style="width:${x.valor / totM * 100}%"></i></div><b>${Math.round(x.valor / totM * 100)}%</b></div><small class="sub-barra">${money(x.valor)} · ${x.cantidad} venta(s)</small>`).join('') : '<p class="vacio">Sin ventas en el periodo.</p>'}</div>
   <div class="card"><h3>Por vendedor</h3>${d.porVendedor.length ? tabla(['Quién', 'Ventas', 'Total'], d.porVendedor.map(x => `<tr><td>${esc(x.nombre)}</td><td>${x.cantidad}</td><td>${money(x.valor)}</td></tr>`), '') : '<p class="vacio">Sin ventas en el periodo.</p>'}</div>
  </div>
  <div class="acts"><button class="btn o" data-act="csv">⬇ Descargar CSV (Excel)</button><button class="btn" onclick="window.print()">🖨 Imprimir reporte</button></div>`;
 },
};
ACC.periodo = b => { S.diasReporte = +b.dataset.d; return ir('reportes') };
ACC.csv = () => {
 const d = SEC.reportes.datos, t = d.totales, f = x => String(x).replace(/\./g, ',');
 const filas = [['Reporte Asadero Pío Pío', d.desde + ' a ' + d.hasta], [], ['Fecha', 'Ventas', 'Compras', 'Gastos'], ...d.serie.map(x => [x.fecha, f(x.ventas), f(x.compras), f(x.gastos)]), [],
  ['Resumen'], ['Ventas', f(t.ventas)], ['Compras', f(t.compras)], ['Gastos', f(t.gastos)], ['Costo de lo vendido', f(t.costoVendido)], ['Pérdidas (mermas y consumos)', f(t.perdidas)], ['Utilidad estimada', f(t.utilidad)], [],
  ['Producto', 'Unidades', 'Valor'], ...d.porPresentacion.map(x => [x.nombre, x.cantidad, f(x.valor)])];
 const csv = '﻿' + filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
 const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `reporte-piopio-${d.desde}_${d.hasta}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

// =====================================================================
//  EQUIPO Y ROLES (solo administrador)
// =====================================================================
const claveTemporal = () => { const a = new Uint32Array(10); crypto.getRandomValues(a); const L = 'abcdefghjkmnpqrstuvwxyz', N = '23456789'; let s = ''; a.forEach((x, i) => s += (i % 3 === 2 ? N : L)[x % (i % 3 === 2 ? N.length : L.length)]); return s[0].toUpperCase() + s.slice(1) };
SEC.equipo = {
 nombre: 'Equipo y roles', icono: '👥', perm: 'gestionar_usuarios', palabras: 'usuarios cuentas empleados permisos cajeros',
 cargar: async () => { const [u, r] = await Promise.all([api('/api/usuarios'), api('/api/auth/roles')]); window.CATALOGO = r.permisos; window.ROLES = r.roles; return { u, r } },
 pintar: ({ u, r }) => `${encabezado('Equipo y roles', 'Aquí se crean las cuentas del personal y se decide qué puede hacer cada persona. Cada cuenta tiene un rol, y el rol define qué pantallas ve y qué puede modificar.')}
  <div class="tres-col">${r.roles.map(x => `<div class="card rol-card rol-borde-${x.clave}"><div class="rc-top">${rolTag(x.clave, x.nombre)}<small>${u.filter(y => y.rol === x.clave && y.activo).length} activo(s)</small></div><h3>${esc(x.lema)}</h3><p>${esc(x.descripcion)}</p>
   <ul class="permisos-lista">${r.permisos.map(p => `<li class="${x.permisos.includes(p.clave) ? 'si' : 'no'}" title="${esc(p.descripcion)}">${x.permisos.includes(p.clave) ? '✔' : '✖'} ${esc(p.nombre)}</li>`).join('')}</ul></div>`).join('')}</div>
  <div class="card" style="margin-top:16px"><h3>Personas con acceso</h3>${tabla(['Nombre', 'Correo', 'Rol', 'Estado', 'Último ingreso', ''], u.map(x => `<tr class="${x.activo ? '' : 'apagado'}"><td><b>${esc(x.nombre)}</b>${x.esYo ? ' <small>(tú)</small>' : ''}</td><td>${esc(x.correo)}</td><td>${rolTag(x.rol, ROLES_NOMBRE(x.rol))}</td><td>${!x.activo ? '<span class="tag out">Desactivado</span>' : x.pendienteCambioClave ? '<span class="tag aviso">Debe cambiar la clave</span>' : '<span class="tag in">Activo</span>'}</td><td>${esc(x.ultimoIngreso || 'Nunca')}</td><td class="acciones"><button class="mini" data-act="editarUsuario" data-id="${x.id}">Editar</button>${x.esYo ? '' : `<button class="mini" data-act="claveUsuario" data-id="${x.id}">Restablecer clave</button>`}</td></tr>`), 'No hay usuarios.')}</div>
  <form class="card" data-form="usuarioNuevo" style="margin-top:16px"><h3>➕ Crear una cuenta</h3><p class="pie">Una cuenta por persona: nunca compartan una sola, así la bitácora sabe quién hizo cada cosa.</p>
   <div class="fila-form"><div><label for="u-n">Nombre</label><input id="u-n" name="nombre" required maxlength="80" placeholder="Ej.: María Pérez"></div>
    <div><label for="u-c">Correo</label><input id="u-c" name="correo" type="email" required maxlength="120" placeholder="maria@ejemplo.com"></div>
    <div><label for="u-r">Rol</label><select id="u-r" name="rol" required>${r.roles.map(x => `<option value="${x.clave}" ${x.clave === 'cajero' ? 'selected' : ''}>${esc(x.nombre)} — ${esc(x.lema)}</option>`).join('')}</select></div>
    <div><label for="u-p">Contraseña temporal</label><div class="campo-clave"><input id="u-p" name="clave" required minlength="8" value="${claveTemporal()}" autocomplete="off"><button type="button" class="ojo" data-act="generarClave" title="Generar otra">🎲</button></div><small class="ayuda-campo">La persona deberá cambiarla al entrar.</small></div></div>
   <div class="acts"><button class="btn">Crear cuenta</button></div></form>`,
};
const ROLES_NOMBRE = rol => (window.ROLES || []).find(r => r.clave === rol)?.nombre || rol;
ACC.generarClave = () => { $('u-p').value = claveTemporal() };
ENV.usuarioNuevo = async f => {
 const datos = { nombre: v(f, 'nombre'), correo: v(f, 'correo'), rol: v(f, 'rol'), clave: v(f, 'clave') };
 await api('/api/usuarios', 'POST', datos);
 await refrescar();
 modal(`<div class="m-form recibo-ok"><div class="ok-ico">✅</div><h3>Cuenta creada</h3><p>Entrégale estos datos a <b>${esc(datos.nombre)}</b>. Al entrar por primera vez, el sistema le pedirá crear su contraseña personal.</p>
  <div class="credencial"><span>Correo</span><b>${esc(datos.correo.toLowerCase())}</b><span>Contraseña temporal</span><b>${esc(datos.clave)}</b><span>Rol</span><b>${esc(ROLES_NOMBRE(datos.rol))}</b></div>
  <p class="pie">Por seguridad, esta contraseña no se vuelve a mostrar.</p><div class="acts"><button class="btn" data-act="cerrar">Entendido</button></div></div>`);
};
ACC.editarUsuario = b => {
 const x = SEC.equipo.datos.u.find(y => y.id == b.dataset.id), roles = SEC.equipo.datos.r.roles;
 modal(`<form class="m-form" data-form="usuarioEditar" data-id="${x.id}"><h3>✏️ Editar a ${esc(x.nombre)}</h3>
  <label for="e-n">Nombre</label><input id="e-n" name="nombre" required maxlength="80" value="${esc(x.nombre)}">
  <label for="e-r">Rol</label><select id="e-r" name="rol" ${x.esYo ? 'disabled' : ''}>${roles.map(r => `<option value="${r.clave}" ${r.clave === x.rol ? 'selected' : ''}>${esc(r.nombre)} — ${esc(r.lema)}</option>`).join('')}</select>
  <label class="check"><input type="checkbox" name="activo" ${x.activo ? 'checked' : ''} ${x.esYo ? 'disabled' : ''}> Cuenta activa (si la apagas, esta persona ya no puede entrar)</label>
  ${x.esYo ? '<p class="pie">No puedes cambiar tu propio rol ni desactivarte: pídeselo a otro administrador.</p>' : '<p class="pie">El cambio rige al instante, incluso si la persona tiene la sesión abierta.</p>'}
  <div class="acts"><button type="button" class="btn o" data-act="cerrar">Cancelar</button><button class="btn">Guardar cambios</button></div></form>`);
};
ENV.usuarioEditar = async f => {
 const x = SEC.equipo.datos.u.find(y => y.id == f.dataset.id);
 await api('/api/usuarios/' + f.dataset.id, 'PUT', { nombre: v(f, 'nombre'), rol: x.esYo ? x.rol : v(f, 'rol'), activo: x.esYo ? true : f.elements.activo.checked });
 cerrarModal(); aviso('Cambios guardados.'); await refrescar();
};
ACC.claveUsuario = b => {
 const x = SEC.equipo.datos.u.find(y => y.id == b.dataset.id);
 modal(`<form class="m-form" data-form="usuarioClave" data-id="${x.id}"><h3>🔑 Restablecer la clave de ${esc(x.nombre)}</h3><p>Se le asigna una contraseña temporal y se desbloquea la cuenta. La persona deberá cambiarla al entrar.</p>
  <label for="k-p">Contraseña temporal</label><div class="campo-clave"><input id="k-p" name="clave" required minlength="8" value="${claveTemporal()}" autocomplete="off"><button type="button" class="ojo" data-act="otraTemporal" title="Generar otra">🎲</button></div><small class="ayuda-campo">Mínimo 8 caracteres, con letras y números. Anótala para dársela.</small>
  <div class="acts"><button type="button" class="btn o" data-act="cerrar">Cancelar</button><button class="btn">Restablecer</button></div></form>`);
};
ACC.otraTemporal = () => { $('k-p').value = claveTemporal() };
ENV.usuarioClave = async f => {
 const clave = v(f, 'clave'); await api('/api/usuarios/' + f.dataset.id + '/clave', 'POST', { clave });
 const x = SEC.equipo.datos.u.find(y => y.id == f.dataset.id);
 modal(`<div class="m-form recibo-ok"><div class="ok-ico">🔑</div><h3>Clave restablecida</h3><p>Entrégale esta contraseña temporal a <b>${esc(x.nombre)}</b>:</p><div class="credencial"><span>Contraseña temporal</span><b>${esc(clave)}</b></div><p class="pie">Por seguridad, no se vuelve a mostrar.</p><div class="acts"><button class="btn" data-act="cerrar">Entendido</button></div></div>`);
 await refrescar();
};

// =====================================================================
//  BITÁCORA (solo administrador)
// =====================================================================
const ACCIONES = { ingreso: ['🔓', 'Ingreso'], bloqueo: ['⛔', 'Cuenta bloqueada'], compra: ['📥', 'Compra'], compra_anulada: ['🚫', 'Compra anulada'], devolucion: ['↩️', 'Devolución'], ajuste: ['⚖️', 'Ajuste de inventario'], venta_anulada: ['🚫', 'Venta anulada'], stock_minimo: ['🔔', 'Stock mínimo'], producto_creado: ['🏷️', 'Producto creado'], producto_editado: ['🏷️', 'Producto editado'], usuario_creado: ['👤', 'Usuario creado'], usuario_editado: ['✏️', 'Usuario editado'], clave_restablecida: ['🔑', 'Clave restablecida'], clave_cambiada: ['🔐', 'Clave cambiada'], gasto: ['💸', 'Gasto'], gasto_anulado: ['🚫', 'Gasto anulado'], cierre_caja: ['💵', 'Cierre de caja'] };
SEC.bitacora = {
 nombre: 'Bitácora', icono: '📜', perm: 'ver_auditoria', palabras: 'auditoria historial registro quien hizo',
 cargar: () => api('/api/auditoria?limite=150&accion=' + encodeURIComponent(S.filtroBitacora)),
 pintar: d => `${encabezado('Bitácora', 'Es el registro automático de quién hizo cada cambio importante y cuándo. Nadie puede editarlo ni borrarlo: sirve para aclarar cualquier diferencia.',
  `<div class="filtros"><select data-change="filtroBitacora" aria-label="Filtrar por tipo de acción"><option value="">Todas las acciones</option>${d.acciones.map(a => `<option value="${esc(a)}" ${a === S.filtroBitacora ? 'selected' : ''}>${esc((ACCIONES[a] || ['', a])[1])}</option>`).join('')}</select></div>`)}
  <div class="card">${tabla(['Cuándo', 'Quién', 'Acción', 'Detalle'], d.filas.map(x => { const a = ACCIONES[x.accion] || ['•', x.accion]; return `<tr><td>${esc(x.cuando)}</td><td>${esc(x.usuario)} ${x.rol ? rolTag(x.rol, ROLES_NOMBRE(x.rol)) : ''}</td><td>${a[0]} ${esc(a[1])}</td><td class="ancho">${esc(x.detalle)}</td></tr>` }), 'No hay registros con ese filtro.')}</div>`,
};
CAM.filtroBitacora = el => { S.filtroBitacora = el.value; return refrescar() };

// =====================================================================
//  AYUDA: cada pantalla y cada botón, explicado con palabras sencillas
// =====================================================================
SEC.ayuda = {
 nombre: 'Ayuda', icono: '💡', palabras: 'como funciona manual preguntas glosario soporte',
 cargar: async () => { if (!window.ROLES) await cargarRoles(); return {} },
 pintar: () => {
  const roles = window.ROLES || [], cat = window.CATALOGO || [], pasos = RECORRIDO.roles[P.rol] || [];
  const pantalla = g => { const ok = permitida(g.id); return `<details class="ayuda-item ${ok ? '' : 'bloq'}" data-t="${esc((g.nombre + ' ' + g.que + ' ' + g.elementos.map(e => e.join(' ')).join(' ')).toLowerCase())}"><summary><span class="ico">${g.icono}</span><b>${esc(g.nombre)}</b><small>${ok ? esc(g.quien) : '🔒 No disponible para tu rol · ' + esc(g.quien)}</small></summary>
   <p class="que">${esc(g.que)}</p>${g.elementos.length ? `<dl>${g.elementos.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>` : ''}${ok ? `<button class="mini" data-go="${g.id}">Ir a ${esc(g.nombre)}</button>` : ''}</details>` };
  return `${encabezado('Centro de ayuda', 'Aquí está explicado, con palabras sencillas, para qué sirve cada pantalla y cada botón. Si algo no te queda claro, búscalo aquí.')}
  <input class="buscar-ayuda" data-input="buscarAyuda" placeholder="🔎 Busca una palabra: devolución, caja, precio, contraseña…" aria-label="Buscar en la ayuda">
  <div class="card tu-rol"><div class="rc-top">${rolTag(P.rol, P.rolNombre)}<small>Tu rol</small></div><h3>${esc(P.rolLema)}</h3><p>${esc(P.rolDescripcion)}</p>
   <div class="acts" style="justify-content:flex-start"><button class="btn o" data-act="verRecorrido">▶ Ver el recorrido de bienvenida</button></div></div>

  <h3 class="sub">1 · Empieza aquí</h3><ol class="pasos">${pasos.map(p => `<li><span>${p.icono}</span><div><b>${esc(p.titulo)}</b><p>${esc(p.texto)}</p></div></li>`).join('')}</ol>

  <h3 class="sub">2 · ¿Quién puede hacer qué?</h3><p class="pie">Los permisos los controla el servidor: no se pueden saltar manipulando la página. Tu columna está resaltada.</p>
  <div class="card">${tabla(['Permiso', ...roles.map(r => esc(r.nombre))], cat.map(p => `<tr><td><b>${esc(p.nombre)}</b><br><small>${esc(p.descripcion)}</small></td>${roles.map(r => `<td class="matriz ${r.clave === P.rol ? 'mi' : ''}">${r.permisos.includes(p.clave) ? '<span class="si">✔</span>' : '<span class="no">—</span>'}</td>`).join('')}</tr>`), '')}</div>

  <h3 class="sub">3 · Para qué sirve cada pantalla</h3><div class="ayuda-lista">${GUIA_PANTALLAS.map(pantalla).join('')}</div>

  <h3 class="sub">4 · Preguntas frecuentes</h3><div class="ayuda-lista">${PREGUNTAS.map(([q, a]) => `<details class="ayuda-item" data-t="${esc((q + ' ' + a).toLowerCase())}"><summary><b>${esc(q)}</b></summary><p class="que">${esc(a)}</p></details>`).join('')}</div>

  <h3 class="sub">5 · Palabras que usa el sistema</h3><div class="card"><dl class="glosario">${GLOSARIO.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></div>
  <p class="nota-chica" id="sinAyuda" hidden>No encontramos nada con esa palabra. Prueba con otra.</p>`;
 },
};
CAM.buscarAyuda = el => {
 const q = el.value.trim().toLowerCase(); let n = 0;
 document.querySelectorAll('#ayuda details[data-t]').forEach(d => { const ok = !q || d.dataset.t.includes(q); d.hidden = !ok; if (ok) n++; if (q && ok) d.open = true });
 $('sinAyuda').hidden = n > 0;
};

// =====================================================================
//  CONTACTO
// =====================================================================
SEC.contacto = {
 nombre: 'Contacto', icono: '📍', palabras: 'direccion ubicacion mapa telefono',
 cargar: async () => ({}),
 pintar: () => `${encabezado('Contacto y ubicación', 'Dónde queda el asadero y cómo llegar.')}
  <div class="card" style="max-width:560px;margin-top:14px"><h3>Asadero Pío Pío</h3><p style="margin:8px 0">Calle 2 # 18 - 74, barrio Ventilador, Neiva, Huila.</p><p>Teléfono: por agregar</p>
   <div class="acts" style="justify-content:center"><a class="btn o" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.fet.edu.co">Sitio de la FET</a><a class="btn" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Calle+2+%2318-74+Ventilador+Neiva">Ver en Google Maps</a></div></div>`,
};
