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

// Subtítulos: cada sonido avisa qué se está oyendo (para quien no oye o si la sala es ruidosa)
export const avisos = new EventTarget();
const subtitulo = (texto) => avisos.dispatchEvent(new CustomEvent('subtitulo', { detail: texto }));
const creditoDe = (clave) => { const i = manifiesto?.[clave] || {}; return i.subtitulo ?? i.titulo ?? 'Sonido'; };
const NOMBRE_BIOMA = { desierto: 'desierto', matorral: 'matorral', bosque: 'bosque templado', selva: 'selva húmeda', selvaSeca: 'selva seca', humedal: 'humedal y costa', mar: 'mar' };

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
    // solo cuentan los archivos que de verdad están en la carpeta
    await Promise.all(Object.entries(manifiesto).map(async ([k, v]) => {
      if (k.startsWith('_') || !v?.archivo) return;
      try {
        const r = await fetch(`assets/sonidos/${v.archivo}`, { method: 'HEAD' });
        if (!r.ok) v.archivo = null;
      } catch (_) { v.archivo = null; }
    }));
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
// Detiene la grabación en curso (música o canto) con un desvanecimiento corto
export function detenerGrabacion() {
  const s = grabacionUnica;
  grabacionUnica = null;
  if (!s) return;
  try {
    const g = s._ganancia;
    if (g) { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15); setTimeout(() => { try { s.stop(); } catch (_) {} }, 600); }
    else s.stop();
  } catch (_) {}
}
// Reproduce una grabación corta (canto de una especie). Devuelve false si no hay archivo.
export async function reproducirGrabacion(clave, pan = 0) {
  if (!ctx) return false;
  await cargarManifiesto();
  if (!tieneGrabacion(clave)) return false;
  try {
    const audio = await decodificar(clave);
    detenerGrabacion();
    const s = ctx.createBufferSource();
    s.buffer = audio;
    const g = ctx.createGain();
    g.gain.value = manifiesto[clave].volumen ?? 0.9;
    s._ganancia = g;
    s.connect(g).connect(paneo(pan)).connect(master);
    s.start();
    grabacionUnica = s;
    subtitulo(creditoDe(clave));
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

// Efecto con grabación real (clave de sonidos.json). Si no hay archivo, devuelve false y se usa el sintetizado.
// La grabación se desvanece al final de «duracion» segundos para no tapar la explicación.
function efectoGrabado(clave, { pan = 0, volumen = 1, duracion = null } = {}) {
  if (!ctx || !tieneGrabacion(clave)) return false;
  subtitulo(creditoDe(clave));
  decodificar(clave).then((audio) => {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = audio;
    const g = ctx.createGain();
    const v = (manifiesto[clave].volumen ?? 0.9) * volumen;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, v), t + 0.15);
    const fin = Math.min(audio.duration, duracion ?? audio.duration);
    g.gain.setTargetAtTime(0.0001, t + Math.max(0.2, fin - 0.8), 0.25);
    s.connect(g).connect(paneo(pan)).connect(master);
    s.start(t);
    s.stop(t + fin + 0.3);
  }).catch(() => {});
  return true;
}

// Retumbo del sismo (onda S): grabación real si existe ('efecto-retumbo');
// si no, ruido marrón filtrado + temblor de baja frecuencia (sintetizado)
export function retumbo(intensidad = 0.6, duracion = 4, pan = 0) {
  if (!ctx) return;
  if (efectoGrabado('efecto-retumbo', { pan, volumen: Math.min(1, 0.3 + intensidad), duracion })) return;
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

// Alerta del simulador, de alta calidad: sirena de dos tonos como la de un altavoz en la calle.
// Cada tono lleva armónicos con un leve desafinado (suena «grande», no de juguete), pasa por un
// filtro de bocina y una reverberación de calle generada al vuelo, y sube y baja como una sirena real.
let reverbCalle = null;
function reverb() {
  if (reverbCalle) return reverbCalle;
  const dur = 2.2, n = Math.floor(ctx.sampleRate * dur);
  const ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      // ecos de fachadas (primeras reflexiones) + cola difusa
      const eco = [0.045, 0.11, 0.19, 0.31].some((e) => Math.abs(t - e - c * 0.007) < 0.0015) ? 0.6 : 0;
      d[i] = ((Math.random() * 2 - 1) * Math.exp(-t * 3.1) + eco * Math.exp(-t * 2)) * 0.5;
    }
  }
  reverbCalle = ctx.createConvolver();
  reverbCalle.buffer = ir;
  return reverbCalle;
}
export function alerta(repeticiones = 6) {
  subtitulo('Alerta sísmica · simulacro');
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.05;
  const periodo = 0.62; // cada tono
  const dur = repeticiones * periodo;
  const bus = ctx.createGain();
  // bocina: recorta graves y agudos extremos y le da cuerpo en 1-3 kHz
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280; hp.Q.value = 0.8;
  const pico = ctx.createBiquadFilter(); pico.type = 'peaking'; pico.frequency.value = 1700; pico.Q.value = 0.9; pico.gain.value = 5;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.5;
  // saturación suave, como un amplificador de altavoz al límite
  const sat = ctx.createWaveShaper();
  const curva = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curva[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  sat.curve = curva; sat.oversample = '4x';
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
  const seco = ctx.createGain(); seco.gain.value = 0.82;
  const humedo = ctx.createGain(); humedo.gain.value = 0.32;
  const salidaG = ctx.createGain();
  salidaG.gain.setValueAtTime(0.0001, t0);
  salidaG.gain.exponentialRampToValueAtTime(0.32, t0 + 0.08);
  salidaG.gain.setValueAtTime(0.32, t0 + dur - 0.12);
  salidaG.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);
  bus.connect(hp).connect(pico).connect(sat).connect(lp).connect(comp);
  comp.connect(seco).connect(salidaG);
  comp.connect(reverb()).connect(humedo).connect(salidaG);
  salidaG.connect(master);

  // dos tonos alternados con deslizamiento corto entre ellos (como la sirena electrónica)
  const voces = [{ tipo: 'sawtooth', mult: 1, det: -6, g: 0.22 }, { tipo: 'sawtooth', mult: 1, det: 7, g: 0.22 },
                 { tipo: 'square', mult: 2, det: 0, g: 0.06 }, { tipo: 'triangle', mult: 0.5, det: 0, g: 0.18 }];
  for (const v of voces) {
    const o = ctx.createOscillator();
    o.type = v.tipo; o.detune.value = v.det;
    const g = ctx.createGain(); g.gain.value = v.g;
    for (let i = 0; i < repeticiones; i++) {
      const t = t0 + i * periodo;
      const f = (i % 2 ? 740 : 988) * v.mult;
      if (i === 0) o.frequency.setValueAtTime(f, t);
      else o.frequency.setTargetAtTime(f, t, 0.012);
    }
    // vibrato lento: la sirena «respira»
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
    const lfoG = ctx.createGain(); lfoG.gain.value = 9 * v.mult;
    lfo.connect(lfoG).connect(o.frequency);
    o.connect(g).connect(bus);
    o.start(t0); lfo.start(t0);
    o.stop(t0 + dur + 0.1); lfo.stop(t0 + dur + 0.1);
  }
}

// Alerta del simulador: si el equipo agregó una grabación autorizada
// (clave "alerta-sismica" en sonidos.json) se usa esa; si no, el tono genérico.
export async function alertaSismica() {
  if (!ctx) return;
  await cargarManifiesto();
  if (tieneGrabacion('alerta-sismica') && (await reproducirGrabacion('alerta-sismica'))) return;
  alerta(8);
}

// Llegada de un tsunami: oleaje que crece y revienta
export function ola(intensidad = 0.6, pan = 0) {
  if (!ctx) return;
  if (efectoGrabado('efecto-oleaje', { pan, volumen: Math.min(1, 0.35 + intensidad), duracion: 8 })) return;
  subtitulo('Llegada del tsunami a la costa · sonido sintetizado');
  const t = ctx.currentTime;
  const src = fuenteRuido(ruidoMarron);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(200, t);
  lp.frequency.linearRampToValueAtTime(1400, t + 1.6);
  lp.frequency.exponentialRampToValueAtTime(250, t + 4);
  const g = ctx.createGain();
  const a = Math.min(1, 0.2 + intensidad);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(a, t + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
  src.connect(lp).connect(g).connect(paneo(pan)).connect(master);
  src.start(t);
  src.stop(t + 4.6);
}

// Erupción: explosión + retumbo + lluvia de piroclastos
export function erupcion(pan = 0) {
  if (!ctx) return;
  if (efectoGrabado('efecto-erupcion', { pan, duracion: 14 })) return;
  subtitulo('Erupción · retumbo y explosiones sintetizados');
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
      subtitulo(creditoDe('bioma-' + tipo));
      return;
    } catch (_) { /* si falla, seguimos con el sintetizado */ }
  }
  const cada = (fn, ms) => timers.push(setInterval(() => Math.random() < 0.7 && fn(), ms));
  subtitulo(`Paisaje sonoro de ${NOMBRE_BIOMA[tipo] ?? tipo} · sintetizado con física del sonido (viento, agua y animales)`);

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
  if (tieneGrabacion('efecto-viento')) {
    // viento real grabado; su volumen sigue la velocidad del dato de este momento
    subtitulo(`Viento de ${Math.round(vientoKmh)} km/h${llueve ? ' y lluvia' : ''} · ${creditoDe('efecto-viento')}`);
    decodificar('efecto-viento').then((audio) => {
      if (!ambiente || ambiente.salida !== salida) return;
      const s = ctx.createBufferSource();
      s.buffer = audio; s.loop = true;
      const g = ctx.createGain();
      g.gain.value = Math.min(1, 0.08 + vientoKmh / 45) * (manifiesto['efecto-viento'].volumen ?? 0.8);
      s.connect(g).connect(salida); s.start(); nodos.push(s);
    }).catch(() => {});
  } else {
    subtitulo(`Viento de ${Math.round(vientoKmh)} km/h${llueve ? ' y lluvia' : ''} · sonido sintetizado con el dato de este momento`);
    viento(salida, nodos, nivel, 250 + vientoKmh * 12);
  }
  ambiente = { nodos, timers: [], salida, tipo: 'clima' };
  const claveLluvia = tieneGrabacion('efecto-lluvia') ? 'efecto-lluvia' : 'clima-lluvia';
  if (llueve && tieneGrabacion(claveLluvia)) {
    decodificar(claveLluvia).then((audio) => {
      if (!ambiente || ambiente.salida !== salida) return;
      const s = ctx.createBufferSource();
      s.buffer = audio;
      s.loop = true;
      s.connect(salida);
      s.start();
      nodos.push(s);
    }).catch(() => {});
    return;
  }
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
