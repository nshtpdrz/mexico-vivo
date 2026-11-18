// "Haz tu propio sismo": el dispositivo se vuelve un sismógrafo.
// 1) Acelerómetro (tablets y celulares): mide la aceleración en m/s².
// 2) Si no hay acelerómetro (laptops): el MICRÓFONO, que también registra
//    ondas (de sonido): un aplauso o un golpe en la mesa.
// Detecta "sismos" con el mismo algoritmo STA/LTA que usan las estaciones reales.

const VENTANA = 10; // s visibles
let estado = null;

export function sensorActivo() { return !!estado; }

export async function iniciarSensor({ onDatos, onDeteccion, modo = 'auto' } = {}) {
  detenerSensor();
  const st = { buf: [], t0: performance.now(), tipo: null, limpiar: [], ultimoDisparo: 0, pico: 0 };
  const empujar = (v) => {
    const t = (performance.now() - st.t0) / 1000;
    st.buf.push([t, v]);
    while (st.buf.length && st.buf[0][0] < t - VENTANA) st.buf.shift();
    st.pico = Math.max(st.pico, v);
    // STA/LTA sobre las últimas muestras
    const n = st.buf.length;
    if (n > 60) {
      const sta = st.buf.slice(-10).reduce((s, [, x]) => s + x * x, 0) / 10;
      const lta = st.buf.slice(0, -10).reduce((s, [, x]) => s + x * x, 0) / (n - 10);
      const r = sta / (lta + (st.tipo === 'acelerometro' ? 0.01 : 1e-5));
      if (r > 6 && t - st.ultimoDisparo > 1.5) { st.ultimoDisparo = t; onDeteccion?.({ t, cociente: r, valor: v }); }
    }
    onDatos?.(st);
  };

  // --- acelerómetro ---
  if (modo !== 'microfono' && 'DeviceMotionEvent' in window) {
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const p = await DeviceMotionEvent.requestPermission(); // iPhone/iPad
        if (p !== 'granted') throw new Error('permiso');
      }
      const ok = await new Promise((res) => {
        let g = null; // gravedad estimada (filtro pasa bajas) cuando no hay e.acceleration
        const h = (e) => {
          let a = e.acceleration;
          let v;
          if (a && a.x !== null) v = Math.hypot(a.x, a.y, a.z);
          else {
            const ag = e.accelerationIncludingGravity;
            if (!ag || ag.x === null) return;
            g = g ? g.map((x, i) => x * 0.9 + [ag.x, ag.y, ag.z][i] * 0.1) : [ag.x, ag.y, ag.z];
            v = Math.hypot(ag.x - g[0], ag.y - g[1], ag.z - g[2]);
          }
          if (!st.tipo) { st.tipo = 'acelerometro'; res(true); }
          empujar(v);
        };
        window.addEventListener('devicemotion', h);
        st.limpiar.push(() => window.removeEventListener('devicemotion', h));
        setTimeout(() => { if (!st.tipo) res(false); }, 1200);
      });
      if (ok) { estado = st; return st.tipo; }
      st.limpiar.forEach((f) => f());
      st.limpiar = [];
    } catch (_) { /* seguimos con el micrófono */ }
  }

  // --- micrófono ---
  const flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const src = ctx.createMediaStreamSource(flujo);
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const datos = new Float32Array(an.fftSize);
  st.tipo = 'microfono';
  let id = 0;
  const leer = () => {
    an.getFloatTimeDomainData(datos);
    let s = 0;
    for (const x of datos) s += x * x;
    empujar(Math.sqrt(s / datos.length));
    id = requestAnimationFrame(leer);
  };
  leer();
  st.limpiar.push(() => { cancelAnimationFrame(id); flujo.getTracks().forEach((t) => t.stop()); ctx.close(); });
  estado = st;
  return st.tipo;
}

export function detenerSensor() {
  if (!estado) return;
  estado.limpiar.forEach((f) => f());
  estado = null;
}

export function dibujarSensor(canvas, st, disparos = []) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#0d1424';
  c.fillRect(0, 0, W, H);
  if (!st || !st.buf.length) return;
  const tFin = st.buf.at(-1)[0];
  const X = (t) => W - ((tFin - t) / VENTANA) * W;
  const escala = Math.max(st.tipo === 'acelerometro' ? 2 : 0.05, ...st.buf.map(([, v]) => v));
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.beginPath(); c.moveTo(0, H - 6); c.lineTo(W, H - 6); c.stroke();
  for (const d of disparos) {
    if (d.t < tFin - VENTANA) continue;
    c.fillStyle = 'rgba(255,64,64,0.25)';
    c.fillRect(X(d.t) - 2, 0, 4, H);
  }
  c.strokeStyle = '#ffc21a';
  c.lineWidth = 1.5;
  c.beginPath();
  st.buf.forEach(([t, v], i) => {
    const x = X(t), y = H - 6 - (v / escala) * (H - 16);
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.stroke();
}
