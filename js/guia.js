// Axo, el ajolote guía: da pistas, lee en voz alta y lleva el pasaporte de misiones.
import * as audio from './audio.js';

export const MISIONES = [
  { id: 'hidalgo', icono: '📍', titulo: 'Encuentra Hidalgo', pista: 'Toca el estado de Hidalgo, ¡ahí estamos!' },
  { id: 'aviso60', icono: '⏱️', titulo: 'Más de 60 s de aviso', pista: 'En Sismos, escucha desde Pachuca y pon un epicentro en la costa. ¿Logras más de 60 segundos de aviso?' },
  { id: 'prediccion', icono: '🎯', titulo: 'Predicción certera', pista: 'Antes de simular, predice el aviso. ¡Atínale con 10 segundos de diferencia o menos!' },
  { id: 'simulacro', icono: '🛡️', titulo: 'Simulacro a tiempo', pista: 'Cuando suene la alerta, elige los 3 pasos para protegerte antes de que llegue la onda S.' },
  { id: 'sismoReal', icono: '🎧', titulo: 'Escucha un sismo real', pista: 'En Sismos, toca «Escuchar» en un registro real de la UNAM.' },
  { id: 'tuSismo', icono: '🤸', titulo: 'Haz tu propio sismo', pista: 'Activa el sismógrafo y salta junto a la tablet o aplaude cerca del micrófono.' },
  { id: 'erupcion', icono: '🌋', titulo: 'Despierta un volcán', pista: 'En Volcanes, toca un volcán activo 🔥 y simula su erupción.' },
  { id: 'selva', icono: '🦜', titulo: 'Escucha la selva', pista: 'En Biodiversidad, toca Chiapas o Campeche y escucha.' },
  { id: 'frio', icono: '🥶', titulo: 'La capital más fría', pista: 'En Clima en vivo, busca la capital con la temperatura más baja y tócala.' },
];

const CLAVE = 'mv-pasaporte-v1';
let hechas = {};
try { hechas = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (_) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(hechas)); } catch (_) {} };

let vozActiva = false;
let vozEs = null;
function elegirVoz() {
  if (!('speechSynthesis' in window)) return null;
  const voces = speechSynthesis.getVoices();
  return voces.find((v) => v.lang === 'es-MX') || voces.find((v) => v.lang === 'es-US') || voces.find((v) => v.lang.startsWith('es')) || null;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { vozEs = elegirVoz(); };

export const vozDisponible = () => 'speechSynthesis' in window;
export const vozEncendida = () => vozActiva;
export function setVoz(on) { vozActiva = on; if (!on) callar(); }

export function hablar(texto, forzar = false) {
  if (!('speechSynthesis' in window) || (!vozActiva && !forzar)) return;
  speechSynthesis.cancel();
  const limpio = String(texto).replace(/<[^>]+>/g, ' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();
  const u = new SpeechSynthesisUtterance(limpio);
  vozEs = vozEs || elegirVoz();
  if (vozEs) u.voice = vozEs;
  u.lang = vozEs?.lang || 'es-MX';
  u.rate = 0.98;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}
export function callar() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

// ---------------------------------------------------------------------
// Burbuja de Axo
// ---------------------------------------------------------------------
const AXO_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="#ff9ec4">
<path d="M10 22c-6-4-8-10-6-12 3 2 6 6 9 9zM12 30c-7-1-11-5-11-8 4 0 8 3 11 5zM54 22c6-4 8-10 6-12-3 2-6 6-9 9zM52 30c7-1 11-5 11-8-4 0-8 3-11 5z" fill="#ff6fa8"/>
<ellipse cx="32" cy="30" rx="22" ry="18"/><ellipse cx="32" cy="52" rx="14" ry="9"/></g>
<circle cx="23" cy="27" r="4" fill="#1b1030"/><circle cx="41" cy="27" r="4" fill="#1b1030"/>
<circle cx="24.3" cy="25.6" r="1.3" fill="#fff"/><circle cx="42.3" cy="25.6" r="1.3" fill="#fff"/>
<path d="M25 36q7 6 14 0" stroke="#1b1030" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<circle cx="17" cy="34" r="3" fill="#ff6fa8" opacity=".6"/><circle cx="47" cy="34" r="3" fill="#ff6fa8" opacity=".6"/></svg>`;

let el, timer;
export function montarGuia() {
  el = document.createElement('div');
  el.className = 'axo';
  el.innerHTML = `<button class="axo-cara" aria-label="Axo, tu guía">${AXO_SVG}</button><div class="axo-globo" role="status" hidden><p></p><div class="axo-acciones"></div></div>`;
  document.body.appendChild(el);
  el.querySelector('.axo-cara').onclick = () => {
    const pend = MISIONES.find((m) => !hechas[m.id]);
    decir(pend ? `Misión: ${pend.titulo}. ${pend.pista}` : '¡Completaste todas las misiones! Eres un experto de México Vivo.', {
      acciones: [{ texto: '🎒 Ver pasaporte', fn: () => abrirPasaporte() }],
    });
  };
  return el;
}

export function decir(texto, { acciones = [], ms = 9000 } = {}) {
  if (!el) return;
  const g = el.querySelector('.axo-globo');
  g.hidden = false;
  g.querySelector('p').textContent = texto;
  const ac = g.querySelector('.axo-acciones');
  ac.innerHTML = '';
  acciones.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'btn mini';
    b.textContent = a.texto;
    b.onclick = () => { a.fn(); g.hidden = true; };
    ac.appendChild(b);
  });
  el.classList.remove('salta'); void el.offsetWidth; el.classList.add('salta');
  clearTimeout(timer);
  timer = setTimeout(() => { g.hidden = true; }, ms);
}

const PISTAS_CAPA = {
  tectonica: 'Toca el mapa para poner un epicentro. Primero predice cuántos segundos de aviso tendrá tu ciudad y luego simula.',
  volcanes: 'Los volcanes con fuego están activos. ¡Toca uno y hazlo hacer erupción!',
  biodiversidad: 'Toca un estado y cierra los ojos: escucha cómo suena su ecosistema.',
  clima: 'Estos datos son de hace unos minutos. ¿Cuál capital está más fría? ¿Por qué crees?',
};
const yaDicho = new Set();
export function alEntrarCapa(capa) {
  if (yaDicho.has(capa) || !PISTAS_CAPA[capa]) return;
  yaDicho.add(capa);
  setTimeout(() => decir(PISTAS_CAPA[capa]), 600);
}

// ---------------------------------------------------------------------
// Misiones
// ---------------------------------------------------------------------
export const progreso = () => MISIONES.filter((m) => hechas[m.id]).length;
let alCambiar = () => {};
export function onProgreso(fn) { alCambiar = fn; fn(progreso(), MISIONES.length); }

export function completar(id) {
  if (hechas[id]) return;
  const m = MISIONES.find((x) => x.id === id);
  if (!m) return;
  hechas[id] = new Date().toISOString();
  guardar();
  alCambiar(progreso(), MISIONES.length);
  audio.clic(1200);
  setTimeout(() => audio.clic(1600), 120);
  confeti();
  const faltan = MISIONES.length - progreso();
  decir(`¡Misión cumplida: ${m.titulo}! ${faltan ? `Te faltan ${faltan}.` : '¡Completaste el pasaporte!'}`, {
    acciones: [{ texto: '🎒 Pasaporte', fn: () => abrirPasaporte() }],
  });
}

export function reiniciar() {
  hechas = {};
  guardar();
  yaDicho.clear();
  alCambiar(0, MISIONES.length);
}

export function abrirPasaporte() {
  let d = document.getElementById('pasaporte');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'pasaporte';
    d.className = 'reto';
    document.body.appendChild(d);
  }
  const n = progreso();
  d.innerHTML = `<button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sub">Pasaporte de México Vivo</p>
    <h2>${n} de ${MISIONES.length} misiones</h2>
    <div class="sellos">${MISIONES.map((m) => `
      <div class="sello ${hechas[m.id] ? 'hecho' : ''}">
        <span class="sello-ico">${m.icono}</span><b>${m.titulo}</b>
        <small>${hechas[m.id] ? '✔ ¡Hecho!' : m.pista}</small>
      </div>`).join('')}</div>
    <div class="acciones-ficha"><button class="btn sec" id="pas-reiniciar">Nuevo visitante (reiniciar)</button></div>`;
  d.querySelector('.cerrar').onclick = () => d.close();
  d.querySelector('#pas-reiniciar').onclick = () => { reiniciar(); abrirPasaporte(); };
  if (!d.open) d.showModal();
}

function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confeti';
  cv.width = innerWidth; cv.height = innerHeight;
  document.body.appendChild(cv);
  const c = cv.getContext('2d');
  const cols = ['#ffc21a', '#ff4545', '#3ddc97', '#4fc3ff', '#ff9ec4'];
  const ps = Array.from({ length: 120 }, () => ({
    x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI, c: cols[Math.floor(Math.random() * cols.length)],
  }));
  let f = 0;
  const paso = () => {
    c.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.r += 0.2;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-4, -2, 8, 4); c.restore();
    }
    if (++f < 110) requestAnimationFrame(paso); else cv.remove();
  };
  paso();
}
