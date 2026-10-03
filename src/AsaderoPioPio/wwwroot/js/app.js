// =====================================================================
//  Asadero Pío Pío · Control de pollos — Núcleo del frontend (versión 4.0)
//  Aquí vive lo común a todas las pantallas: conexión con el servidor, navegación
//  según el rol, ventanas emergentes, mi cuenta, recorrido de bienvenida y buscador.
//  Cada pantalla está en pantallas.js; el arranque, en arranque.js.
//
//  IMPORTANTE: ocultar un botón aquí es solo comodidad. La seguridad real está en el
//  servidor (Seguridad/Permisos.cs): aunque alguien manipule esta página, el servidor
//  rechaza lo que su rol no puede hacer.
// =====================================================================
'use strict';
const $ = id => document.getElementById(id);
const money = n => '$ ' + Math.round(+n || 0).toLocaleString('es-CO');
const num = n => (+(+n || 0).toFixed(2)).toLocaleString('es-CO');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const espera = ms => new Promise(r => setTimeout(r, ms));
const METODOS = { efectivo: '💵 Efectivo', transferencia: '📲 Transferencia', tarjeta: '💳 Tarjeta' };

// Estado compartido
let P = null;                       // perfil de quien entró: { nombre, rol, permisos, ... }
let actual = 'inicio', pendientes = 0, cambiando = false;
const S = { cart: {}, metodo: 'efectivo', recibido: 0, fechaVentas: null, diasReporte: 7, filtroBitacora: '' };
const SEC = {};                     // pantallas registradas (las define pantallas.js)
const ACC = {}, ENV = {}, CAM = {}; // acciones de clic, envíos de formularios y cambios de campos

const tiene = p => !!P && P.permisos.includes(p);
const esAdmin = () => P?.rol === 'admin';
const pref = k => { try { return localStorage.getItem('pp-' + k) === '1' } catch (e) { return false } };
const guardarPref = (k, v) => { try { localStorage.setItem('pp-' + k, v ? '1' : '0') } catch (e) { } };

// ---- Conexión con el servidor C#
async function api(url, metodo = 'GET', cuerpo) {
 pendientes++; $('carga').classList.add('on');
 try {
  const r = await fetch(url, { method: metodo, credentials: 'same-origin', headers: cuerpo ? { 'Content-Type': 'application/json' } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  let j = {}; try { j = await r.json() } catch (e) { }
  if (r.status == 401 && !url.startsWith('/api/auth/')) { volverAlLogin(); throw new Error('Tu sesión terminó. Ingresa de nuevo.') }
  if (r.status == 403 && j.codigo === 'cambiar_clave') { pedirCambioClave(true); throw new Error(j.error) }
  if (r.status == 403) throw new Error(j.error || 'Tu rol no tiene permiso para esta acción.');
  if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
  return j;
 } catch (e) { if (e instanceof TypeError) throw new Error('Sin conexión con el servidor del asadero'); throw e }
 finally { if (--pendientes <= 0) { pendientes = 0; $('carga').classList.remove('on') } }
}
function aviso(t, bad) { const x = $('toast'); x.textContent = t; x.className = ''; void x.offsetWidth; x.className = 'on' + (bad ? ' bad' : ''); clearTimeout(aviso.t); aviso.t = setTimeout(() => x.className = '', 3200) }

// ---- Cortina amarilla con la marca Pío Pío entre pantallas (se omite con el "modo rápido").
function cortina(texto) { const w = $('wipe'); $('wipeTxt').textContent = texto; w.className = ''; void w.offsetWidth; w.className = 'go'; clearTimeout(cortina.t); cortina.t = setTimeout(() => w.className = '', 1150); return espera(480) }

// ---- Navegación: solo aparecen las pantallas que el rol puede usar
const GRUPOS = [
 ['Día a día', ['inicio', 'vender', 'ventas']],
 ['Almacén', ['inventario', 'productos']],
 ['Dinero', ['caja', 'gastos', 'reportes']],
 ['Administración', ['equipo', 'bitacora']],
 ['Soporte', ['ayuda', 'contacto']],
];
const permitida = s => !!SEC[s] && (!SEC[s].perm || tiene(SEC[s].perm));

function construirNav() {
 $('nav').innerHTML = GRUPOS.map(([titulo, ids]) => {
  const ok = ids.filter(permitida);
  return ok.length ? `<h4 class="grupo">${titulo}</h4>` + ok.map(id => `<button data-s="${id}" ${id === actual ? 'class="on"' : ''}><span class="ico" aria-hidden="true">${SEC[id].icono}</span><span>${SEC[id].nombre}</span><i class="punto" hidden></i></button>`).join('') : '';
 }).join('');
 $('yoNombre').textContent = P.nombre;
 $('yoRol').innerHTML = `<span class="rol rol-${esc(P.rol)}">${esc(P.rolNombre)}</span>`;
}
const marcarAlerta = on => document.querySelectorAll('#nav [data-s="inventario"] .punto').forEach(p => p.hidden = !on);

async function ir(s) {
 if (cambiando || !permitida(s)) return;
 cambiando = true;
 try {
  const carga = SEC[s].cargar().then(d => ({ d }), e => ({ e }));   // los datos se piden mientras aparece la cortina
  if (!pref('rapido')) await cortina(SEC[s].nombre);
  const r = await carga;
  actual = s; $('barraPedido').hidden = true;
  document.querySelectorAll('.sec').forEach(e => e.classList.toggle('on', e.id == s));
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.s == s));
  document.title = SEC[s].nombre + ' · Pío Pío';
  if (r.e) $(s).innerHTML = `<div class="card vacio-grande"><h3>No se pudo cargar</h3><p>${esc(r.e.message)}</p><div class="acts" style="justify-content:center"><button class="btn" data-act="reintentar">Reintentar</button></div></div>`;
  else { SEC[s].datos = r.d; pintarSeccion(s) }
  scrollTo(0, 0);
 } finally { cambiando = false }
}
function pintarSeccion(s) { $(s).innerHTML = SEC[s].pintar(SEC[s].datos); SEC[s].listo?.() }
async function refrescar() { const s = actual; try { SEC[s].datos = await SEC[s].cargar(); pintarSeccion(s) } catch (e) { aviso(e.message, 1) } }
ACC.reintentar = () => ir(actual);

// ---- Eventos globales (un solo oyente para todos los botones y formularios)
document.addEventListener('click', async e => {
 const nav = e.target.closest('#nav button'); if (nav) return ir(nav.dataset.s);
 const go = e.target.closest('[data-go]'); if (go) { e.preventDefault(); cerrarModal(); return ir(go.dataset.go) }
 const b = e.target.closest('[data-act]'); if (!b) return;
 // Acciones delicadas: primer toque = pide confirmar, segundo toque = ejecuta
 if (b.dataset.confirma && !b.classList.contains('seguro')) {
  const txt = b.textContent; b.classList.add('seguro'); b.textContent = 'Confirmar'; clearTimeout(b._t);
  b._t = setTimeout(() => { if (b.isConnected) { b.classList.remove('seguro'); b.textContent = txt } }, 3500); return;
 }
 const f = ACC[b.dataset.act]; if (!f) return;
 try { await f(b, e) } catch (er) { aviso(er.message, 1) }
});
document.addEventListener('submit', async e => {
 const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
 const fn = ENV[f.dataset.form]; if (!fn) return;
 const btn = f.querySelector('button:not([type=button]):not(.o)'); if (btn) btn.disabled = true;
 try { await fn(f) } catch (er) { aviso(er.message, 1) } finally { if (btn) btn.disabled = false }
});
document.addEventListener('change', e => { const c = e.target.closest('[data-change]'); if (c && CAM[c.dataset.change]) CAM[c.dataset.change](c, e) });
document.addEventListener('input', e => { const c = e.target.closest('[data-input]'); if (c && CAM[c.dataset.input]) CAM[c.dataset.input](c, e) });
// Efecto de ola al presionar un botón
document.addEventListener('click', e => { const b = e.target.closest('.btn,.tile'); if (!b) return; const r = b.getBoundingClientRect(), o = document.createElement('s'); o.className = 'rp'; o.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px`; b.appendChild(o); setTimeout(() => o.remove(), 600) });
// Atajo de teclado: Ctrl/⌘ + K abre el buscador de pantallas
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && P && !P.debeCambiarClave) { e.preventDefault(); abrirBuscador() } });

// ---- Ventana emergente reutilizable
function modal(html, cerrable = true) {
 const m = $('modal'); $('modalCuerpo').innerHTML = html; m.dataset.cerrable = cerrable ? '1' : '0';
 if (!m.open) m.showModal();
}
function cerrarModal() { const m = $('modal'); if (m.open) m.close() }
$('modal').addEventListener('cancel', e => { if ($('modal').dataset.cerrable === '0') e.preventDefault() });
$('modal').addEventListener('click', e => { if (e.target === $('modal') && $('modal').dataset.cerrable !== '0') cerrarModal() });
ACC.cerrar = () => cerrarModal();

// ---- Ingreso y salida (la verificación real la hace el servidor)
async function entrar(e) {
 e.preventDefault(); const b = $('btnEntrar'); b.disabled = true;
 try {
  P = await api('/api/auth/entrar', 'POST', { correo: $('em').value, clave: $('pw').value });
  await cortina('¡Bienvenido, ' + P.nombre.split(' ')[0] + '!'); $('pw').value = '';
  await abrirSistema();
 } catch (er) { aviso(er.message, 1); const c = document.querySelector('#login .card'); c.classList.remove('tiembla'); void c.offsetWidth; c.classList.add('tiembla') }
 finally { b.disabled = false }
}
async function cargarRoles() { try { const r = await api('/api/auth/roles'); window.CATALOGO = r.permisos; window.ROLES = r.roles } catch (e) { } }
async function abrirSistema() {
 await cargarRoles();
 actual = 'inicio'; construirNav();
 $('login').classList.add('off'); $('app').classList.add('on');
 document.querySelectorAll('.sec').forEach(e => e.classList.toggle('on', e.id == 'inicio'));
 if (P.debeCambiarClave) { $('inicio').innerHTML = ''; return pedirCambioClave(true) }
 try { SEC.inicio.datos = await SEC.inicio.cargar(); pintarSeccion('inicio') } catch (er) { aviso(er.message, 1) }
 recorridoSiCorresponde();
}
async function salir() { try { await api('/api/auth/salir', 'POST') } catch (e) { } await cortina('¡Hasta pronto!'); volverAlLogin() }
function volverAlLogin() {
 cerrarModal(); $('app').classList.remove('on'); $('login').classList.remove('off');
 S.cart = {}; S.metodo = 'efectivo'; S.recibido = 0; S.fechaVentas = null; P = null; $('barraPedido').hidden = true;
}

// ---- Mi cuenta y cambio de contraseña
function pedirCambioClave(forzado) {
 modal(`<form data-form="clave" data-forzado="${forzado ? 1 : 0}" class="m-form">
  <h3>${forzado ? '🔐 Crea tu contraseña personal' : '🔐 Cambiar mi contraseña'}</h3>
  <p>${forzado ? 'Tu contraseña actual es temporal. Por seguridad, debes cambiarla antes de empezar a trabajar.' : 'Elige una contraseña que solo tú conozcas.'}</p>
  <label for="cl-a">Contraseña actual</label><input id="cl-a" name="actual" type="password" required autocomplete="current-password">
  <label for="cl-n">Contraseña nueva</label><input id="cl-n" name="nueva" type="password" required minlength="8" autocomplete="new-password">
  <small class="ayuda-campo">Mínimo 8 caracteres, con letras y números.</small>
  <label for="cl-r">Repite la contraseña nueva</label><input id="cl-r" name="repetir" type="password" required minlength="8" autocomplete="new-password">
  <div class="acts">${forzado ? '<button type="button" class="btn o" data-act="salir">Salir</button>' : '<button type="button" class="btn o" data-act="cerrar">Cancelar</button>'}<button class="btn">Guardar contraseña</button></div></form>`, !forzado);
}
ACC.salir = () => salir();
ENV.clave = async f => {
 if (f.nueva.value !== f.repetir.value) return aviso('Las contraseñas nuevas no coinciden.', 1);
 await api('/api/auth/cambiar-clave', 'POST', { actual: f.actual.value, nueva: f.nueva.value });
 const eraForzado = f.dataset.forzado === '1';
 P = await api('/api/auth/yo'); cerrarModal(); aviso('Contraseña actualizada. ¡Listo!');
 if (eraForzado) await abrirSistema();
};
$('miCuenta').onclick = () => {
 modal(`<div class="m-form"><h3>👤 Mi cuenta</h3>
  <div class="perfil"><b>${esc(P.nombre)}</b><span>${esc(P.correo)}</span><span class="rol rol-${esc(P.rol)}">${esc(P.rolNombre)}</span></div>
  <p class="rol-desc">${esc(P.rolDescripcion)}</p>
  <h4>Lo que tu rol puede hacer</h4>
  <ul class="permisos-lista">${(window.CATALOGO || []).map(c => `<li class="${P.permisos.includes(c.clave) ? 'si' : 'no'}">${P.permisos.includes(c.clave) ? '✔' : '✖'} ${esc(c.nombre)}</li>`).join('') || '<li>Abre «Ayuda» para ver todos los permisos.</li>'}</ul>
  <label class="check"><input type="checkbox" data-change="rapido" ${pref('rapido') ? 'checked' : ''}> Modo rápido: sin la cortina de transición entre pantallas</label>
  <div class="acts"><button class="btn o" data-act="verRecorrido">Ver el recorrido de bienvenida</button><button class="btn o" data-act="cambiarClave">Cambiar contraseña</button><button class="btn" data-act="cerrar">Cerrar</button></div></div>`);
};
CAM.rapido = el => guardarPref('rapido', el.checked);
ACC.cambiarClave = () => pedirCambioClave(false);

// ---- Recorrido de bienvenida (primera vez de cada persona; se puede repetir)
const claveRecorrido = () => 'pp-tour-' + P.id;
function recorridoSiCorresponde() { try { if (localStorage.getItem(claveRecorrido())) return } catch (e) { return } pasoRecorrido(0) }
function pasoRecorrido(i) {
 const pasos = [RECORRIDO.comun, ...(RECORRIDO.roles[P.rol] || [])], p = pasos[i], ultimo = i === pasos.length - 1;
 modal(`<div class="tour"><div class="tour-ico">${p.icono}</div><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p>
  <div class="puntos">${pasos.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
  <div class="acts"><button class="btn o" data-act="tourSalta">${ultimo ? 'Cerrar' : 'Saltar'}</button>${i > 0 ? `<button class="btn o" data-act="tourPaso" data-i="${i - 1}">Atrás</button>` : ''}<button class="btn" data-act="${ultimo ? 'tourFin' : 'tourPaso'}" data-i="${i + 1}">${ultimo ? '¡Empezar!' : 'Siguiente'}</button></div></div>`);
}
const terminarRecorrido = () => { try { localStorage.setItem(claveRecorrido(), '1') } catch (e) { } cerrarModal() };
ACC.tourPaso = b => pasoRecorrido(+b.dataset.i);
ACC.tourSalta = terminarRecorrido;
ACC.tourFin = terminarRecorrido;
ACC.verRecorrido = () => pasoRecorrido(0);

// ---- Buscador rápido de pantallas (Ctrl + K)
function abrirBuscador() {
 modal(`<div class="buscador"><input id="bq" placeholder="¿A dónde quieres ir? Escribe: ventas, inventario, caja…" autocomplete="off" aria-label="Buscar pantalla"><div id="bl"></div><small>Enter para ir · Esc para cerrar</small></div>`);
 const pintar = () => {
  const q = $('bq').value.trim().toLowerCase();
  const ok = GRUPOS.flatMap(g => g[1]).filter(permitida).filter(id => !q || (SEC[id].nombre + ' ' + (SEC[id].palabras || '')).toLowerCase().includes(q));
  $('bl').innerHTML = ok.map((id, i) => `<button data-go="${id}" class="${i ? '' : 'sel'}"><span>${SEC[id].icono}</span>${esc(SEC[id].nombre)}</button>`).join('') || '<p>No hay pantallas con ese nombre.</p>';
 };
 $('bq').oninput = pintar; $('bq').onkeydown = e => { if (e.key === 'Enter') { const s = $('bl').querySelector('button'); if (s) s.click() } };
 pintar(); $('bq').focus();
}
$('buscar').onclick = abrirBuscador;
$('salir').onclick = salir;
$('vista').onclick = () => { document.body.classList.toggle('B'); guardarPref('vistaB', document.body.classList.contains('B')) };
if (pref('vistaB')) document.body.classList.add('B');
