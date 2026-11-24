// Viento y lluvia en vivo sobre el mapa (capa Clima).
//
// Datos: Open-Meteo, una sola consulta con 286 puntos (rejilla de 1.5° que cubre México).
// Cada punto cuenta para el límite gratuito (~10 000 al día), así que solo se consulta con la
// capa Clima abierta y como máximo cada 30 minutos; la respuesta se guarda en localStorage y sin
// internet se muestra el último dato guardado.
//
// Viento: ~1500 partículas que se mueven con el viento interpolado (bilineal) entre los puntos
// de la rejilla y dejan una estela corta. La dirección meteorológica dice DE DÓNDE viene el
// viento, así que las componentes son u = −v·sin(dir) (hacia el este) y v = −v·cos(dir) (al norte).
// Lluvia: un disco azul translúcido y gotas que caen en cada celda con precipitación > 0.1 mm.
//
// Todo cuelga de mapa.root para que también aparezca en AR. No se cuelga de mapa.capas.clima
// porque pintarClima() vacía ese grupo cada vez que cambia la variable.
import * as THREE from 'three';
import { proyectar, desproyectar } from './geo.js';

const LAT_MIN = 14, LON_MIN = -118, PASO = 1.5, NLAT = 13, NLON = 22; // 13 × 22 = 286 puntos
const CLAVE = 'mv-viento-vivo';
const REFRESCO_MS = 30 * 60 * 1000;
const N_PART = 1500;
const Z_VIENTO = 0.05; // se dibuja sin prueba de profundidad: siempre encima de las columnas de Clima (hasta ≈ 0.08), debajo de las etiquetas (orden 10)
const Z_LLUVIA = 0.047;
const VEL_VISUAL = 0.0018; // unidades del mapa por segundo por cada km/h
const ESTELA = 0.45; // segundos de recorrido que muestra la estela
const LLUVIA_MIN = 0.1; // mm

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE)); } catch (_) { return null; }
}
function guardar(v) {
  try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (_) {}
}

async function consultar() {
  const lats = [], lons = [];
  for (let j = 0; j < NLAT; j++) for (let i = 0; i < NLON; i++) { lats.push(LAT_MIN + j * PASO); lons.push(LON_MIN + i * PASO); }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}` +
    '&current=wind_speed_10m,wind_direction_10m,precipitation,weather_code&wind_speed_unit=kmh&timezone=America%2FMexico_City';
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    const arr = Array.isArray(json) ? json : [json];
    if (arr.length !== NLAT * NLON) throw new Error('respuesta incompleta');
    // [u, v, lluvia] por punto, redondeados para que quepa holgado en localStorage
    const p = arr.map((x) => {
      const c = x.current, s = c.wind_speed_10m ?? 0, d = ((c.wind_direction_10m ?? 0) * Math.PI) / 180;
      return [+(-s * Math.sin(d)).toFixed(1), +(-s * Math.cos(d)).toFixed(1), +(c.precipitation ?? 0).toFixed(1)];
    });
    return { t: Date.now(), hora: arr[0].current.time, p };
  } finally {
    clearTimeout(id);
  }
}

export class VientoVivo {
  constructor(mapa) {
    this.mapa = mapa;
    this.grupo = new THREE.Group();
    this.grupo.name = 'VientoVivo';
    this.grupo.visible = false;
    mapa.root.add(this.grupo);
    this.verViento = true;
    this.verLluvia = true;
    this.datos = null;
    this.fuente = null; // 'vivo' | 'cache'
    this.cargando = false;
    this.alCambiar = null; // callback para actualizar el texto del panel
    this._particulas();
    this.grupoLluvia = new THREE.Group();
    this.grupo.add(this.grupoLluvia);
    const c = leer();
    if (c?.p?.length === NLAT * NLON) { this.datos = c; this.fuente = 'cache'; this._pintarLluvia(); }
  }

  // ---------- datos ----------
  async cargar(forzar = false) {
    if (this.cargando) return;
    if (!forzar && this.datos && Date.now() - this.datos.t < REFRESCO_MS) {
      if (this.fuente === 'cache') { this.fuente = 'vivo'; this.alCambiar?.(); } // dato reciente: se considera vigente
      return;
    }
    this.cargando = true;
    this.alCambiar?.();
    try {
      this.datos = await consultar();
      this.fuente = 'vivo';
      guardar(this.datos);
    } catch (_) {
      const c = leer();
      if (c?.p?.length === NLAT * NLON) { this.datos = c; this.fuente = 'cache'; }
      this._ultimoFallo = Date.now();
    } finally {
      this.cargando = false;
      this._pintarLluvia();
      this.alCambiar?.();
    }
  }

  // viento (u, v) en km/h en un punto lon/lat; null fuera de la rejilla
  vientoEn(lon, lat) {
    const fx = (lon - LON_MIN) / PASO, fy = (lat - LAT_MIN) / PASO;
    if (fx < 0 || fy < 0 || fx > NLON - 1 || fy > NLAT - 1) return null;
    const i = Math.min(NLON - 2, Math.floor(fx)), j = Math.min(NLAT - 2, Math.floor(fy));
    const a = fx - i, b = fy - j, p = this.datos.p;
    const k = (jj, ii) => p[jj * NLON + ii];
    const p00 = k(j, i), p10 = k(j, i + 1), p01 = k(j + 1, i), p11 = k(j + 1, i + 1);
    const mix = (n) => (p00[n] * (1 - a) + p10[n] * a) * (1 - b) + (p01[n] * (1 - a) + p11[n] * a) * b;
    return [mix(0), mix(1)];
  }

  resumen() {
    if (!this.datos) return null;
    const conLluvia = this.datos.p.filter((x) => x[2] > LLUVIA_MIN).length;
    const max = Math.max(...this.datos.p.map((x) => Math.hypot(x[0], x[1])));
    return { hora: this.datos.hora, guardado: this.datos.t, conLluvia, max, fuente: this.fuente, cargando: this.cargando };
  }

  // ---------- viento: partículas ----------
  _particulas() {
    const [x0, y0] = proyectar(LON_MIN, LAT_MIN);
    const [x1, y1] = proyectar(LON_MIN + (NLON - 1) * PASO, LAT_MIN + (NLAT - 1) * PASO);
    this.caja = { x0, y0, x1, y1 };
    this.px = new Float32Array(N_PART);
    this.py = new Float32Array(N_PART);
    this.edad = new Float32Array(N_PART);
    this.vida = new Float32Array(N_PART);
    for (let i = 0; i < N_PART; i++) this._renacer(i, true);
    this.pos = new Float32Array(N_PART * 2 * 3);
    this.col = new Float32Array(N_PART * 2 * 4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, Z_VIENTO), 0.7);
    this.lineas = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, depthTest: false,
    }));
    this.lineas.renderOrder = 3;
    this.lineas.frustumCulled = false;
    this.grupo.add(this.lineas);
  }

  _renacer(i, inicio = false) {
    const c = this.caja;
    this.px[i] = c.x0 + Math.random() * (c.x1 - c.x0);
    this.py[i] = c.y0 + Math.random() * (c.y1 - c.y0);
    this.vida[i] = 2.2 + Math.random() * 2.6;
    this.edad[i] = inicio ? Math.random() * this.vida[i] : 0;
  }

  _moverViento(dt) {
    const c = this.caja, pos = this.pos, col = this.col;
    for (let i = 0; i < N_PART; i++) {
      this.edad[i] += dt;
      let x = this.px[i], y = this.py[i];
      const [lon, lat] = desproyectar(x, y);
      const w = this.vientoEn(lon, lat);
      if (!w || this.edad[i] > this.vida[i]) { this._renacer(i); x = this.px[i]; y = this.py[i]; }
      const [u, v] = w ?? [0, 0];
      const vel = Math.hypot(u, v);
      x += u * VEL_VISUAL * dt;
      y += v * VEL_VISUAL * dt;
      if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) { this._renacer(i); x = this.px[i]; y = this.py[i]; }
      this.px[i] = x; this.py[i] = y;
      // estela: del punto actual hacia atrás, proporcional a la velocidad (con un mínimo para que
      // la brisa débil de tierra adentro también se lea)
      const largo = (ESTELA * VEL_VISUAL * Math.max(vel, 9)) / Math.max(vel, 0.01);
      const o = i * 6;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = Z_VIENTO;
      pos[o + 3] = x - u * largo; pos[o + 4] = y - v * largo; pos[o + 5] = Z_VIENTO;
      // aparece y se desvanece suave; más brillante con más viento
      const t = this.edad[i] / this.vida[i];
      const a = Math.min(1, t * 5, (1 - t) * 4) * Math.min(1, 0.6 + vel / 25);
      // tinta oscura (se lee sobre el mar gris y sobre los estados claros); con viento fuerte, grana
      const f = Math.max(0, Math.min(1, (vel - 15) / 35));
      const r = 0.11 + f * 0.55, g = 0.1 + f * 0.02, b = 0.09 + f * 0.04;
      const k = i * 8;
      col[k] = r; col[k + 1] = g; col[k + 2] = b; col[k + 3] = a * 0.95;
      col[k + 4] = r; col[k + 5] = g; col[k + 6] = b; col[k + 7] = 0;
    }
    this.lineas.geometry.attributes.position.needsUpdate = true;
    this.lineas.geometry.attributes.color.needsUpdate = true;
  }

  // ---------- lluvia ----------
  _pintarLluvia() {
    const g = this.grupoLluvia;
    g.traverse((o) => { if (o !== g) { o.geometry?.dispose(); o.material?.dispose(); } });
    g.clear();
    this.gotas = null;
    if (!this.datos) return;
    const celdas = [];
    this.datos.p.forEach((x, n) => {
      if (x[2] > LLUVIA_MIN) celdas.push({ lon: LON_MIN + (n % NLON) * PASO, lat: LAT_MIN + Math.floor(n / NLON) * PASO, mm: x[2] });
    });
    if (!celdas.length) return;
    const radio = PASO * 0.55 * proyectar(LON_MIN + 1, 0)[0] - PASO * 0.55 * proyectar(LON_MIN, 0)[0];
    const disco = new THREE.CircleGeometry(1, 28);
    for (const c of celdas) {
      const [x, y] = proyectar(c.lon, c.lat);
      const fuerte = Math.min(1, c.mm / 4);
      const m = new THREE.Mesh(disco, new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x3d8fe6).lerp(new THREE.Color(0x1d4fb5), fuerte),
        transparent: true, opacity: 0.38 + fuerte * 0.25, depthWrite: false, depthTest: false,
      }));
      m.position.set(x, y, Z_LLUVIA);
      m.scale.setScalar(Math.abs(radio) * (0.8 + fuerte * 0.4));
      m.renderOrder = 2;
      g.add(m);
    }
    // gotas: más gotas donde llueve más
    const lista = [];
    for (const c of celdas) {
      const n = Math.round(14 + Math.min(1, c.mm / 4) * 30);
      const [cx, cy] = proyectar(c.lon, c.lat);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.abs(radio) * 0.9;
        lista.push(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, Z_LLUVIA + Math.random() * 0.06);
      }
    }
    const pos = new Float32Array(lista);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xa8dcff, size: 0.0035, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }));
    pts.frustumCulled = false;
    pts.renderOrder = 4;
    g.add(pts);
    this.gotas = { pos, geo };
  }

  _moverLluvia(dt) {
    if (!this.gotas) return;
    const p = this.gotas.pos;
    for (let i = 2; i < p.length; i += 3) {
      p[i] -= dt * 0.09;
      if (p[i] < Z_LLUVIA) p[i] = Z_LLUVIA + 0.06;
    }
    this.gotas.geo.attributes.position.needsUpdate = true;
  }

  // ---------- cada cuadro ----------
  update(dt) {
    const capaClima = document.body.dataset.capa === 'clima';
    const activo = capaClima && (this.verViento || this.verLluvia);
    this.grupo.visible = activo;
    if (!activo) return;
    // pedir datos solo con la capa abierta; si falló, reintentar a los 2 min
    const viejo = !this.datos || Date.now() - this.datos.t > REFRESCO_MS || this.fuente === 'cache';
    if (viejo && !this.cargando && (!this._ultimoFallo || Date.now() - this._ultimoFallo > 120000)) this.cargar();
    if (!this.datos) { this.lineas.visible = false; return; }
    this.lineas.visible = this.verViento;
    this.grupoLluvia.visible = this.verLluvia;
    if (this.verViento) this._moverViento(dt);
    if (this.verLluvia) this._moverLluvia(dt);
  }
}
