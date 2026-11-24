// Axo, el ajolote guía: da pistas, lee en voz alta y lleva el pasaporte de misiones.
import * as audio from './audio.js';

export const MISIONES = [
  { id: 'hidalgo', titulo: 'Encuentra Hidalgo', pista: 'Toca el estado de Hidalgo, ¡ahí estamos!' },
  { id: 'aviso60', titulo: 'Más de 60 s de aviso', pista: 'En Sismos, escucha desde Pachuca y pon un epicentro en la costa. ¿Logras más de 60 segundos de aviso?' },
  { id: 'prediccion', titulo: 'Predicción certera', pista: 'Antes de simular, predice el aviso. ¡Atínale con 10 segundos de diferencia o menos!' },
  { id: 'simulacro', titulo: 'Simulacro a tiempo', pista: 'Cuando suene la alerta, elige los 3 pasos para protegerte antes de que llegue la onda S.' },
  { id: 'sismoReal', titulo: 'Escucha un sismo real', pista: 'En Sismos, toca «Escuchar» en un registro real de la UNAM.' },
  { id: 'tuSismo', titulo: 'Haz tu propio sismo', pista: 'Activa el sismógrafo y salta junto a la tablet o aplaude cerca del micrófono.' },
  { id: 'erupcion', titulo: 'Despierta un volcán', pista: 'En Volcanes, toca un volcán activo (el que echa fumarola) y simula su erupción.' },
  { id: 'selva', titulo: 'Escucha la selva', pista: 'En Biodiversidad, toca Chiapas o Campeche y escucha.' },
  { id: 'frio', titulo: 'La capital más fría', pista: 'En Clima en vivo, busca la capital con la temperatura más baja y tócala.' },
  { id: 'relieve', titulo: 'Explora un volcán real', pista: 'En Volcanes, toca el Popocatépetl o el Pico de Orizaba y abre «Explorar su relieve real».' },
  { id: 'tula', titulo: 'Conoce a los Atlantes', pista: 'En Historia, toca Tula: la capital tolteca está en Hidalgo.' },
  { id: 'tenochtitlan', titulo: 'Viaja a 1325', pista: 'En Historia, mueve la línea del tiempo al año en que se fundó México-Tenochtitlan.' },
  { id: 'musica', titulo: 'Música de una región', pista: 'En Cultura, toca Chiapas, Veracruz, Hidalgo o San Luis Potosí y escucha su música.' },
  { id: 'lenguas', titulo: 'Lenguas vivas', pista: 'En Lenguas, toca un estado y descubre qué parte de su población habla una lengua indígena.' },
  { id: 'tsunami', titulo: 'Provoca un tsunami', pista: 'En Sismos, pon un epicentro en el mar, magnitud 7.5 o más y poca profundidad, y simula.' },
  { id: 'sabores', titulo: 'Rastrea el maíz', pista: 'En Sabores, toca una vasija del mapa para ver dónde se encontró evidencia antigua de un alimento.' },
  { id: 'nixtamal', titulo: 'Haz nixtamal', pista: 'En Sabores, completa los seis pasos del laboratorio de nixtamalización.' },
  { id: 'expedicion', titulo: 'Expedición: 3 maravillas', pista: 'En Maravillas, visita tres maravillas naturales y responde por qué existen.' },
  { id: 'geoparque', titulo: 'Nuestro geoparque', pista: 'En Maravillas, descubre por qué existe el Geoparque Comarca Minera, aquí en Hidalgo.' },
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

const PEG = (id) => `<img class="pi" src="assets/pegatinas/ui/${id}.png" alt="">`;
for (const m of MISIONES) m.icono = PEG('mision-' + m.id.toLowerCase());

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
  // Axo siempre justo debajo de la barra superior, mida lo que mida (dos
  // renglones, letra grande, celular): así nunca tapa las pestañas.
  const barra = document.querySelector('header');
  const fijarAltura = () => {
    if (!barra) return;
    const abajo = Math.round(barra.getBoundingClientRect().bottom + 8);
    document.documentElement.style.setProperty('--axo-top', `${abajo}px`);
  };
  if (barra && 'ResizeObserver' in window) new ResizeObserver(fijarAltura).observe(barra);
  addEventListener('resize', fijarAltura);
  setInterval(fijarAltura, 2000);
  fijarAltura();
  // En pantallas chicas el globo muestra 3 renglones: un toque lo abre completo
  // y otro toque lo cierra.
  const globo = el.querySelector('.axo-globo');
  globo.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const p = globo.querySelector('p');
    if (!globo.classList.contains('completo') && p.scrollHeight > p.clientHeight + 2) globo.classList.add('completo');
    else globo.hidden = true;
  });
  el.querySelector('.axo-cara').onclick = () => {
    const pend = MISIONES.find((m) => !hechas[m.id]);
    decir(pend ? `Misión: ${pend.titulo}. ${pend.pista}` : '¡Completaste todas las misiones! Eres un experto de México Vivo.', {
      acciones: [{ texto: '<img class="pi" src="assets/pegatinas/ui/pasaporte.png" alt="">Ver pasaporte', fn: () => abrirPasaporte() }],
    });
  };
  return el;
}

export function decir(texto, { acciones = [], ms = 9000 } = {}) {
  if (!el) return;
  const g = el.querySelector('.axo-globo');
  g.hidden = false;
  g.classList.remove('completo');
  g.querySelector('p').textContent = texto;
  const ac = g.querySelector('.axo-acciones');
  ac.innerHTML = '';
  acciones.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'btn mini';
    b.innerHTML = a.texto;
    b.onclick = () => { a.fn(); g.hidden = true; };
    ac.appendChild(b);
  });
  el.classList.remove('salta'); void el.offsetWidth; el.classList.add('salta');
  clearTimeout(timer);
  // en celular el globo tapa parte del mapa: se queda menos tiempo (se vuelve a abrir tocando a Axo)
  const espera = innerWidth < 900 ? Math.min(ms, 5500) : ms;
  timer = setTimeout(() => { g.hidden = true; }, espera);
}

const PISTAS_CAPA = {
  tectonica: 'Toca el mapa para poner un epicentro. Primero predice cuántos segundos de aviso tendrá tu ciudad y luego simula.',
  volcanes: 'Los volcanes con fuego están activos. ¡Toca uno y hazlo hacer erupción!',
  biodiversidad: 'Toca un estado y cierra los ojos: escucha cómo suena su ecosistema.',
  clima: 'Estos datos son de hace unos minutos. ¿Cuál capital está más fría? ¿Por qué crees?',
  historia: 'Mueve la línea del tiempo y mira cómo aparecen las ciudades de cada época.',
  cultura: '¡Toca un estado para conocer su comida, su artesanía y su música!',
  lenguas: 'En 2020, más de 7 millones de personas hablaban una lengua indígena. Toca un estado para ver qué porcentaje de su población la habla.',
  maravillas: 'Cada símbolo es una maravilla natural reconocida por la UNESCO o estudiada por la ciencia. Tócalas y responde: ¿por qué existe este lugar?',
  sabores: 'Las vasijas marcan dónde se encontraron rastros antiguos de maíz, frijol, calabaza, chile y cacao. En el panel puedes hacer nixtamal paso a paso.',
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
export const estaHecha = (id) => Boolean(hechas[id]);
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
    acciones: [{ texto: '<img class="pi" src="assets/pegatinas/ui/pasaporte.png" alt="">Pasaporte', fn: () => abrirPasaporte() }],
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
        <small>${hechas[m.id] ? '<img class="pi" src="assets/pegatinas/ui/correcto.png" alt="">¡Hecho!' : m.pista}</small>
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
  // papel picado de la marca: sale de las dos orillas de abajo y cae por los costados (el centro queda libre)
  const cols = ['#b3261e', '#d9a43a', '#2f6b45', '#22346a', '#f3ecdd'];
  const ps = Array.from({ length: 70 }, (_, i) => {
    const izq = i % 2 === 0;
    return {
      x: izq ? 0 : innerWidth, y: innerHeight * 0.85, vx: (izq ? 1 : -1) * (3 + Math.random() * 6), vy: -Math.random() * 12 - 8,
      r: Math.random() * Math.PI, c: cols[Math.floor(Math.random() * cols.length)],
    };
  });
  let f = 0;
  const paso = () => {
    c.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.r += 0.2;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-4, -2, 8, 4); c.restore();
    }
    cv.style.opacity = f > 50 ? String(Math.max(0, 1 - (f - 50) / 25)) : '1';
    if (++f < 75) requestAnimationFrame(paso); else cv.remove();
  };
  paso();
}
