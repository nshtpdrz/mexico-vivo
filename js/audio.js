// Motor de sonido 100 % sintetizado con Web Audio API (sin archivos de audio).
// Cada sonido se genera con osciladores y ruido filtrado: así también se puede
// explicar la física del sonido (frecuencia, amplitud, filtros).

let ctx = null;
let master = null;
let activo = true;
let ruidoBlanco = null;
let ruidoMarron = null;
let ambiente = null; // { nodos, timers, tipo }

function crearRuido(tipo) {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (tipo === 'marron') {
      ultimo = (ultimo + 0.02 * w) / 1.02;
      d[i] = ultimo * 3.5;
    } else d[i] = w;
  }
  return buf;
}

export function iniciarAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = activo ? 0.8 : 0;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  ruidoBlanco = crearRuido('blanco');
  ruidoMarron = crearRuido('marron');
}

export const contexto = () => ctx;
export const salida = () => master;

// ---------------------------------------------------------------------
// Grabaciones reales (opcionales). assets/sonidos/sonidos.json dice qué
// archivo usar para cada clave y quién es su autor. Si una clave no tiene
// archivo, se usa el sonido sintetizado.
// ---------------------------------------------------------------------
let manifiesto = null;
const decodificados = new Map();
export async function cargarManifiesto() {
  if (manifiesto) return manifiesto;
  try {
    manifiesto = await (await fetch('assets/sonidos/sonidos.json')).json();
  } catch (_) { manifiesto = {}; }
  return manifiesto;
}
export function tieneGrabacion(clave) { return !!manifiesto?.[clave]?.archivo; }
export function creditos() {
  return Object.entries(manifiesto || {}).filter(([k, v]) => !k.startsWith('_') && v?.archivo).map(([k, v]) => ({ clave: k, ...v }));
}
async function decodificar(clave) {
  if (decodificados.has(clave)) return decodificados.get(clave);
  const info = manifiesto?.[clave];
  if (!info?.archivo) return null;
  const buf = await (await fetch(`assets/sonidos/${info.archivo}`)).arrayBuffer();
  const audio = await ctx.decodeAudioData(buf);
  decodificados.set(clave, audio);
  return audio;
}
let grabacionUnica = null;
// Reproduce una grabación corta (canto de una especie). Devuelve false si no hay archivo.
export async function reproducirGrabacion(clave, pan = 0) {
  if (!ctx) return false;
  await cargarManifiesto();
  if (!tieneGrabacion(clave)) return false;
  try {
    const audio = await decodificar(clave);
    try { grabacionUnica?.stop(); } catch (_) {}
    const s = ctx.createBufferSource();
    s.buffer = audio;
    const g = ctx.createGain();
    g.gain.value = manifiesto[clave].volumen ?? 0.9;
    s.connect(g).connect(paneo(pan)).connect(master);
    s.start();
    grabacionUnica = s;
    return true;
  } catch (e) {
    console.warn('No se pudo reproducir', clave, e);
    return false;
  }
}

export function setSonido(on) {
  activo = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05);
}
export const sonidoActivo = () => activo;

function fuenteRuido(buf) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.loopStart = Math.random() * 2;
  return s;
}

function paneo(x) {
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  if (p.pan) p.pan.value = Math.max(-1, Math.min(1, x));
  return p;
}

// Clic corto de interfaz
export function clic(tono = 880) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(tono, t);
  o.frequency.exponentialRampToValueAtTime(tono * 1.5, t + 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.15);
}

// Golpe seco: llegada de la onda P (compresión)
export function golpeP(intensidad = 0.5, pan = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * intensidad + 0.05, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g).connect(paneo(pan)).connect(master);
  o.start(t);
  o.stop(t + 0.6);
}

// Retumbo del sismo (onda S): ruido marrón filtrado + temblor de baja frecuencia
export function retumbo(intensidad = 0.6, duracion = 4, pan = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = fuenteRuido(ruidoMarron);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 140 + 220 * intensidad;
  const g = ctx.createGain();
  const amp = Math.min(1, 0.15 + intensidad);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.25);
  g.gain.setTargetAtTime(amp * 0.7, t + 0.6, duracion * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

  // trémolo: la amplitud oscila como el vaivén del suelo
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 2 + 4 * intensidad;
  lfoG.gain.value = amp * 0.35;
  lfo.connect(lfoG).connect(g.gain);

  const sub = ctx.createOscillator();
  const subG = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.value = 38;
  subG.gain.value = 0.25 * intensidad;

  // crujidos (objetos que vibran)
  const crujido = fuenteRuido(ruidoBlanco);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 3;
  const cG = ctx.createGain();
  cG.gain.value = 0.04 * intensidad;

  const pn = paneo(pan);
  src.connect(lp).connect(g);
  sub.connect(subG).connect(g);
  crujido.connect(bp).connect(cG).connect(g);
  g.connect(pn).connect(master);
  [src, lfo, sub, crujido].forEach((n) => { n.start(t); n.stop(t + duracion + 0.1); });
}

// Tono de alerta genérico (dos tonos alternados, NO es el audio oficial del SASMEX)
export function alerta(repeticiones = 6) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < repeticiones; i++) {
    const t = t0 + i * 0.5;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(i % 2 ? 660 : 880, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.setValueAtTime(0.12, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = 3000;
    o.connect(lp).connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.5);
  }
}

// Erupción: explosión + retumbo + lluvia de piroclastos
export function erupcion(pan = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const pn = paneo(pan);
  pn.connect(master);

  const boom = fuenteRuido(ruidoMarron);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(120, t + 3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
  boom.connect(lp).connect(g).connect(pn);
  boom.start(t);
  boom.stop(t + 5.1);

  const roca = fuenteRuido(ruidoBlanco);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.5;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.linearRampToValueAtTime(0.0001, t + 0.8);
  g2.gain.linearRampToValueAtTime(0.08, t + 1.5);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 6);
  // granulado: modulación rápida aleatoria
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 23;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.05;
  lfo.connect(lfoG).connect(g2.gain);
  roca.connect(bp).connect(g2).connect(pn);
  roca.start(t); lfo.start(t);
  roca.stop(t + 6.1); lfo.stop(t + 6.1);
}

// ---------------------------------------------------------------------
// Paisajes sonoros de los biomas
// ---------------------------------------------------------------------
export function detenerAmbiente() {
  if (!ambiente) return;
  const { nodos, timers, salida } = ambiente;
  timers.forEach(clearInterval);
  timers.forEach(clearTimeout);
  const t = ctx.currentTime;
  salida.gain.setTargetAtTime(0.0001, t, 0.3);
  setTimeout(() => nodos.forEach((n) => { try { n.stop(); } catch (_) {} }), 1500);
  ambiente = null;
}

function viento(salida, nodos, nivel = 0.25, centro = 500) {
  const src = fuenteRuido(ruidoBlanco);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = centro;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.value = nivel;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoG = ctx.createGain();
  lfoG.gain.value = centro * 0.6;
  lfo.connect(lfoG).connect(bp.frequency);
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.07;
  const lfo2G = ctx.createGain();
  lfo2G.gain.value = nivel * 0.6;
  lfo2.connect(lfo2G).connect(g.gain);
  src.connect(bp).connect(g).connect(salida);
  [src, lfo, lfo2].forEach((n) => { n.start(); nodos.push(n); });
}

function pajaro(salida, base = 2500) {
  const t = ctx.currentTime + Math.random() * 0.2;
  const notas = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < notas; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const ti = t + i * (0.09 + Math.random() * 0.06);
    const f = base * (0.8 + Math.random() * 0.6);
    o.frequency.setValueAtTime(f, ti);
    o.frequency.exponentialRampToValueAtTime(f * (Math.random() > 0.5 ? 1.4 : 0.7), ti + 0.08);
    g.gain.setValueAtTime(0.0001, ti);
    g.gain.exponentialRampToValueAtTime(0.06, ti + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ti + 0.1);
    o.connect(g).connect(salida);
    o.start(ti);
    o.stop(ti + 0.12);
  }
}

function insectos(salida, nodos, frec = 4200, nivel = 0.035) {
  const o = ctx.createOscillator();
  o.frequency.value = frec;
  const am = ctx.createGain();
  am.gain.value = 0;
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 18 + Math.random() * 10;
  const lfoG = ctx.createGain();
  lfoG.gain.value = nivel;
  lfo.connect(lfoG).connect(am.gain);
  o.connect(am).connect(salida);
  o.start(); lfo.start();
  nodos.push(o, lfo);
}

function rana(salida) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  const f = 180 + Math.random() * 160;
  o.frequency.setValueAtTime(f, t);
  o.frequency.linearRampToValueAtTime(f * 1.3, t + 0.12);
  const lp = ctx.createBiquadFilter();
  lp.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(lp).connect(g).connect(salida);
  o.start(t);
  o.stop(t + 0.2);
}

function olas(salida, nodos) {
  const src = fuenteRuido(ruidoBlanco);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.value = 0.12;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.1;
  lfo.connect(lfoG).connect(g.gain);
  src.connect(lp).connect(g).connect(salida);
  src.start(); lfo.start();
  nodos.push(src, lfo);
}

export async function ambienteBioma(tipo, pan = 0) {
  if (!ctx) return;
  if (ambiente && ambiente.tipo === tipo) return;
  detenerAmbiente();
  const salida = ctx.createGain();
  salida.gain.value = 0.0001;
  salida.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
  salida.connect(paneo(pan)).connect(master);
  const nodos = [];
  const timers = [];
  // ¿Hay grabación real del paisaje? (clave "bioma-<tipo>")
  await cargarManifiesto();
  if (tieneGrabacion('bioma-' + tipo)) {
    try {
      const audio = await decodificar('bioma-' + tipo);
      const s = ctx.createBufferSource();
      s.buffer = audio;
      s.loop = true;
      s.connect(salida);
      s.start();
      nodos.push(s);
      ambiente = { nodos, timers, salida, tipo };
      return;
    } catch (_) { /* si falla, seguimos con el sintetizado */ }
  }
  const cada = (fn, ms) => timers.push(setInterval(() => Math.random() < 0.7 && fn(), ms));

  switch (tipo) {
    case 'desierto':
      viento(salida, nodos, 0.3, 400);
      cada(() => pajaro(salida, 3200), 4200);
      break;
    case 'bosque':
      viento(salida, nodos, 0.12, 800);
      cada(() => pajaro(salida, 2200), 1300);
      cada(() => pajaro(salida, 3400), 2300);
      break;
    case 'selvaSeca':
      viento(salida, nodos, 0.08, 600);
      insectos(salida, nodos, 5200, 0.02);
      cada(() => pajaro(salida, 2800), 1100);
      break;
    case 'selva':
      insectos(salida, nodos, 4400, 0.03);
      insectos(salida, nodos, 6100, 0.02);
      cada(() => pajaro(salida, 1800), 700);
      cada(() => pajaro(salida, 3000), 900);
      cada(() => rana(salida), 1600);
      break;
    case 'humedal':
      olas(salida, nodos);
      cada(() => rana(salida), 500);
      cada(() => pajaro(salida, 1500), 2500);
      break;
    case 'viento':
      viento(salida, nodos, 0.35, 350);
      break;
    case 'lluvia': {
      const src = fuenteRuido(ruidoBlanco);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.value = 0.12;
      src.connect(hp).connect(g).connect(salida);
      src.start();
      nodos.push(src);
      break;
    }
  }
  ambiente = { nodos, timers, salida, tipo };
}

// Para el clima: viento proporcional a la velocidad real (km/h)
export function ambienteClima(vientoKmh, llueve, pan = 0) {
  if (!ctx) return;
  detenerAmbiente();
  const salida = ctx.createGain();
  salida.gain.value = 0.0001;
  salida.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
  salida.connect(paneo(pan)).connect(master);
  const nodos = [];
  const nivel = Math.min(0.5, 0.04 + vientoKmh / 80);
  viento(salida, nodos, nivel, 250 + vientoKmh * 12);
  if (llueve) {
    const src = fuenteRuido(ruidoBlanco);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.value = 0.1;
    src.connect(hp).connect(g).connect(salida);
    src.start();
    nodos.push(src);
  }
  ambiente = { nodos, timers: [], salida, tipo: 'clima' };
}
