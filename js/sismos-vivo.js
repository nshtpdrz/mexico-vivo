// «El país se mueve ahora mismo»: tarjeta de la portada con los sismos reales de las últimas
// 24 horas (USGS). Un minimapa de México donde cada sismo late en su lugar, y un renglón que
// va cambiando: cuándo, qué magnitud y dónde. Recuerda que la Tierra se mueve todo el tiempo
// y atrae a quien pasa frente al stand.
// Sin internet usa el último dato guardado (lo dice); si nunca hubo datos, la tarjeta no aparece.
import { obtenerSismosUSGS } from './apis.js';
import { prepararEstados, proyectar } from './geo.js';

const REFRESCO_MS = 10 * 60 * 1000;

function hace(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
// «45 km SW of Pinotepa Nacional, Mexico» → «45 km al SO de Pinotepa Nacional»
function lugarEs(t = '') {
  const R = { N: 'N', S: 'S', E: 'E', W: 'O', NE: 'NE', NW: 'NO', SE: 'SE', SW: 'SO', NNE: 'NNE', NNW: 'NNO', SSE: 'SSE', SSW: 'SSO', ENE: 'ENE', ESE: 'ESE', WNW: 'ONO', WSW: 'OSO' };
  return t.replace(/, (Mexico|México|MX|Guatemala)$/, '')
    .replace(/^(\d+) km ([NSEW]{1,3}) of /, (_, km, d) => `${km} km al ${R[d] || d} de `)
    .replace(/^off the coast of /i, 'frente a la costa de ')
    .replace(/^near the coast of /i, 'cerca de la costa de ');
}

export function montarSismosVivo(contenedor) {
  const card = document.createElement('aside');
  card.className = 'sismos-vivo';
  card.hidden = true;
  card.setAttribute('aria-live', 'polite');
  card.innerHTML = `<p class="sv-etq"><i class="sv-punto"></i>El país se mueve ahora mismo</p>
    <canvas class="sv-mapa" width="560" height="360" aria-hidden="true"></canvas>
    <p class="sv-cifra"></p><p class="sv-renglon"></p>`;
  contenedor.appendChild(card);
  const cv = card.querySelector('canvas'), c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  // encuadre: el país completo (≈ −118…−86 °, 14…33 °) con margen
  const [x0, y0] = proyectar(-118.5, 33.2), [x1, y1] = proyectar(-86.2, 14.0);
  const esc = Math.min(W / (x1 - x0), H / (y0 - y1)) * 0.94;
  const ox = (W - (x1 - x0) * esc) / 2, oy = (H - (y0 - y1) * esc) / 2;
  const P = (lon, lat) => { const [x, y] = proyectar(lon, lat); return [ox + (x - x0) * esc, oy + (y0 - y) * esc]; };

  // silueta del país (una vez, en una capa aparte)
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  if (window.MX_GEO) {
    const g = base.getContext('2d');
    g.fillStyle = '#e6dcc5'; g.strokeStyle = 'rgba(27,26,23,.35)'; g.lineWidth = 1;
    for (const e of prepararEstados(window.MX_GEO, 0.03)) for (const pol of e.poligonos) {
      g.beginPath();
      pol[0].forEach(([lon, lat], i) => { const [x, y] = P(lon, lat); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.closePath(); g.fill(); g.stroke();
    }
  }

  let lista = [], k = 0, renglonT = 0;
  const radio = (m) => 3 + Math.max(0, m - 2.5) * 3.2;
  function dibujar(t) {
    c.clearRect(0, 0, W, H);
    c.drawImage(base, 0, 0);
    lista.forEach((q, i) => {
      const [x, y] = P(q.lon, q.lat), r = radio(q.mag);
      // onda que se expande (cada sismo con su propio desfase)
      const f = ((t / 2400) + i * 0.37) % 1;
      c.strokeStyle = `rgba(179,38,30,${0.55 * (1 - f)})`; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, r + f * r * 3, 0, Math.PI * 2); c.stroke();
      c.fillStyle = i === k ? '#b3261e' : 'rgba(179,38,30,.75)';
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      if (i === k) { c.strokeStyle = '#1b1a17'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 3, 0, Math.PI * 2); c.stroke(); }
    });
  }
  function renglon() {
    if (!lista.length) return;
    const q = lista[k];
    card.querySelector('.sv-renglon').innerHTML = `<b>M${q.mag.toFixed(1)}</b> · ${lugarEs(q.lugar)} · <span>${hace(Date.now() - q.tiempo)}</span>`;
  }
  let anim = 0;
  const bucle = (t) => {
    if (!card.isConnected) return;
    if (!document.hidden && !contenedor.hidden) {
      dibujar(t);
      if (t - renglonT > 4000 && lista.length) { renglonT = t; k = (k + 1) % lista.length; renglon(); }
    }
    anim = requestAnimationFrame(bucle);
  };

  async function cargar() {
    let res = await obtenerSismosUSGS(1, 2.5);
    let periodo = 'en las últimas 24 horas';
    if (res.lista.length < 3 && res.fuente !== 'error') {
      // días tranquilos: se amplía a una semana para que la tarjeta no quede vacía
      res = await obtenerSismosUSGS(7, 3.5);
      periodo = 'en los últimos 7 días';
    }
    if (!res.lista.length) { card.hidden = true; return; }
    lista = res.lista.slice(0, 40);
    k = 0;
    const n = res.lista.length;
    const nota = res.fuente === 'cache' ? ' <small>(último dato guardado)</small>' : '';
    card.querySelector('.sv-cifra').innerHTML = `<b>${n}</b> ${n === 1 ? 'sismo' : 'sismos'} ${periodo}${nota}`;
    renglon();
    card.hidden = false;
    if (!anim) anim = requestAnimationFrame(bucle);
  }
  cargar();
  setInterval(() => { if (!contenedor.hidden) cargar(); }, REFRESCO_MS);
  return { recargar: cargar };
}
