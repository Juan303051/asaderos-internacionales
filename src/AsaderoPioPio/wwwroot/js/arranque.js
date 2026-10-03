// =====================================================================
//  Asadero Pío Pío · Arranque (versión 4.0)
//  Pantalla de carga con la marca mientras se revisa si ya hay una sesión abierta.
//  Se carga al final, cuando ya existen todas las pantallas.
// =====================================================================
$('formLogin').addEventListener('submit', entrar);
$('verClave').onclick = () => { const p = $('pw'); p.type = p.type === 'password' ? 'text' : 'password' };

async function arrancar() {
 const sp = $('splash'); sp.classList.remove('error'); $('spRe').hidden = true; $('spMsg').textContent = 'Encendiendo la brasa…';
 const minimo = espera(2200); let sesion = false;
 try { P = await api('/api/auth/yo'); sesion = true; $('spMsg').textContent = 'Contando los pollos…' }
 catch (e) { if (/conexión/.test(e.message)) { await minimo; sp.classList.add('error'); $('spMsg').textContent = 'No hay conexión con el servidor. ¿Está encendido el programa del asadero?'; $('spRe').hidden = false; return } }
 await minimo;
 if (sesion) await abrirSistema();
 sp.classList.add('fuera'); setTimeout(() => sp.classList.add('oculto'), 900);
}
$('spRe').onclick = arrancar;
arrancar();
