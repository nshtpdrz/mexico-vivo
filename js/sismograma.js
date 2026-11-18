// Sismogramas: dibujar, detectar la onda P (STA/LTA) y sonificar.
//
// Sonificación: un sismógrafo registra vibraciones de ~0.01 a 10 Hz, que el oído
// no oye (oímos de 20 a 20,000 Hz). Si reproducimos el registro N veces más rápido,
// cada frecuencia se multiplica por N: a ×200, una vibración de 1 Hz suena a 200 Hz.
//
// STA/LTA: el algoritmo clásico con que los sensores detectan sismos. Compara el
// promedio de energía de una ventana CORTA (STA, lo que pasa ahora) con el de una
// ventana LARGA (LTA, el ruido de fondo). Si el cociente pasa un umbral: ¡sismo!
import { leerMiniSEED } from './miniseed.js';
import { iniciarAudio, contexto, salida } from './audio.js';

const cache = new Map();
export async function cargarSismograma(archivo) {
  if (cache.has(archivo)) return cache.get(archivo);
  const r = await fetch(`assets/sismos/${archivo}.mseed`);
  if (!r.ok) throw new Error('No se encontró el sismograma ' + archivo);
  const s = leerMiniSEED(await r.arrayBuffer());
  cache.set(archivo, s);
  return s;
}

// Devuelve el índice de la primera muestra donde STA/LTA supera el umbral
export function staLta(datos, fs, { sta = 1, lta = 30, umbral = 4, desde = 0 } = {}) {
  const nS = Math.round(sta * fs), nL = Math.round(lta * fs);
  let eS = 0, eL = 0;
  const e = (i) => datos[i] * datos[i];
  for (let i = desde; i < datos.length; i++) {
    eS += e(i) - (i - nS >= desde ? e(i - nS) : 0);
    eL += e(i) - (i - nL >= desde ? e(i - nL) : 0);
    if (i - desde < nL) continue;
    const r = (eS / nS) / (eL / nL + 1e-12);
    if (r > umbral) return { indice: i, cociente: r };
  }
  return null;
}

// Filtro pasa altas simple (quita la deriva muy lenta que no aporta al sonido)
function pasaAltas(datos, fs, fc = 0.05) {
  const rc = 1 / (2 * Math.PI * fc), dt = 1 / fs, a = rc / (rc + dt);
  const out = new Float32Array(datos.length);
  let y = 0, xp = datos[0];
  for (let i = 0; i < datos.length; i++) { y = a * (y + datos[i] - xp); xp = datos[i]; out[i] = y; }
  return out;
}

let fuente = null;
export function detenerSonido() { try { fuente?.stop(); } catch (_) {} fuente = null; }

// Reproduce el sismograma acelerado `factor` veces. Devuelve la duración (s).
export function sonificar(s, factor = 200, onFin) {
  iniciarAudio();
  const ctx = contexto();
  if (!ctx) return 0;
  detenerSonido();
  const f = pasaAltas(s.datos, s.fs);
  let max = 0;
  for (const v of f) max = Math.max(max, Math.abs(v));
  const SR = 8000; // la tasa del búfer; playbackRate hace el resto
  const buf = ctx.createBuffer(1, f.length, SR);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < f.length; i++) ch[i] = (f[i] / max) * 0.95;
  fuente = ctx.createBufferSource();
  fuente.buffer = buf;
  fuente.playbackRate.value = (s.fs * factor) / SR;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  fuente.connect(g).connect(salida());
  fuente.onended = () => { fuente = null; onFin?.(); };
  fuente.start();
  return s.datos.length / s.fs / factor;
}

// Dibuja el sismograma con marcas (en segundos desde el inicio del archivo)
export function dibujarSismograma(canvas, s, { marcas = [], cursor = null, titulo = '' } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#0d1424';
  c.fillRect(0, 0, W, H);
  const dur = s.datos.length / s.fs;
  const X = (t) => 6 + (t / dur) * (W - 12);
  // envolvente por columna de píxeles (rápido aunque haya miles de muestras)
  let max = 0;
  for (const v of s.datos) max = Math.max(max, Math.abs(v));
  const mid = H / 2 + 6;
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.beginPath(); c.moveTo(0, mid); c.lineTo(W, mid); c.stroke();
  for (let t = 0; t <= dur; t += 60) {
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.font = '9px system-ui, sans-serif';
    if (t % 120 === 0) c.fillText(`${t / 60} min`, X(t) + 2, H - 3);
    c.fillRect(X(t), H - 12, 1, 4);
  }
  const porPx = s.datos.length / (W - 12);
  c.fillStyle = '#7fd3ff';
  for (let px = 0; px < W - 12; px++) {
    const i0 = Math.floor(px * porPx), i1 = Math.min(s.datos.length, Math.floor((px + 1) * porPx));
    let lo = 0, hi = 0;
    for (let i = i0; i < i1; i++) { const v = s.datos[i] / max; if (v < lo) lo = v; if (v > hi) hi = v; }
    const a = (H / 2 - 14);
    c.fillRect(6 + px, mid - hi * a, 1, Math.max(1, (hi - lo) * a));
  }
  for (const m of marcas) {
    c.strokeStyle = m.color;
    c.setLineDash(m.punteada ? [3, 3] : []);
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(X(m.t), 14); c.lineTo(X(m.t), H - 14); c.stroke();
    c.setLineDash([]);
    c.fillStyle = m.color;
    c.font = '600 10px system-ui, sans-serif';
    c.fillText(m.texto, Math.min(X(m.t) + 3, W - 70), m.y ?? 12);
  }
  if (cursor !== null) {
    c.fillStyle = '#ffc21a';
    c.fillRect(X(cursor) - 1, 0, 2, H);
  }
  if (titulo) {
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.font = '10px system-ui, sans-serif';
    c.fillText(titulo, 8, H - 16);
  }
}
