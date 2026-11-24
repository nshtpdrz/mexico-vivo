// Simulador físico de propagación de ondas sísmicas y alerta temprana.
import * as THREE from 'three';
import { distanciaKm, proyectar, KM_POR_UNIDAD } from './geo.js';
import { ESTADOS, SENSORES, VEL_P, VEL_S, T_PROCESO_ALERTA, LIMITES_PLACAS } from './datos.js';
import { crearEtiqueta, vec, EXAG_PROF } from './mapa3d.js';
import * as audio from './audio.js';

export const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const DESC_MMI = {
  1: 'No se siente', 2: 'Apenas perceptible', 3: 'Débil', 4: 'Ligero', 5: 'Moderado',
  6: 'Fuerte', 7: 'Muy fuerte', 8: 'Severo', 9: 'Violento', 10: 'Extremo', 11: 'Extremo', 12: 'Extremo',
};

// Relación de atenuación simplificada (calibrada a mano con sismos mexicanos; didáctica)
export function intensidad(mag, R, id) {
  let I = 2.7 + 1.5 * mag - 3 * Math.log10(Math.max(R, 5));
  if (id === 'MX-CMX') I += 1; // amplificación del suelo lacustre
  return Math.max(1, Math.min(12, I));
}

// Energía liberada (J): log10 E = 1.5 M + 4.8
export const energia = (m) => Math.pow(10, 1.5 * m + 4.8);

// Distancia (km) del epicentro a la fosa; positiva del lado del continente
export function distanciaFosa(lat, lon) {
  const fosa = LIMITES_PLACAS[0].puntos;
  const cos = Math.cos((lat * Math.PI) / 180);
  let mejor = Infinity, signo = 1;
  for (let i = 0; i < fosa.length - 1; i++) {
    const [ax, ay] = fosa[i], [bx, by] = fosa[i + 1];
    const Ax = ax * cos * 111.2, Ay = ay * 111.2, Bx = bx * cos * 111.2, By = by * 111.2;
    const Px = lon * cos * 111.2, Py = lat * 111.2;
    const dx = Bx - Ax, dy = By - Ay;
    let t = ((Px - Ax) * dx + (Py - Ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const ex = Px - (Ax + t * dx), ey = Py - (Ay + t * dy);
    const d = Math.hypot(ex, ey);
    if (d < mejor) { mejor = d; signo = dx * ey - dy * ex > 0 ? 1 : -1; }
  }
  return mejor * signo;
}

export class SimuladorSismo {
  constructor(mapa, cb = {}) {
    this.mapa = mapa;
    this.cb = cb;
    this.grupo = mapa.capas.sismo;
    this.velocidad = 10;
    this.alertaActiva = true;
    this.escucha = 'MX-HID';
    this.corriendo = false;
    this.t = 0;
    this.cfg = { lat: 16.98, lon: -99.77, mag: 7.4, prof: 20 };

    const matP = new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide });
    const matS = new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide });
    this.anilloP = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.11, 8), matP);
    this.anilloS = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.11, 8), matS);
    this.relleno = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.12, depthTest: false }));
    [this.anilloP, this.anilloS, this.relleno].forEach((m) => { m.renderOrder = 6; m.visible = false; this.grupo.add(m); });

    this.epi = new THREE.Group();
    const estrella = new THREE.Mesh(new THREE.OctahedronGeometry(0.008), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff0000, emissiveIntensity: 0.8 }));
    estrella.position.z = 0.06;
    const linea = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.06, 6), new THREE.MeshBasicMaterial({ color: 0xff6060 }));
    linea.rotation.x = Math.PI / 2;
    linea.position.z = 0.03;
    this.epiLbl = crearEtiqueta('Epicentro', { prioridad: 9, tam: 0.016, color: '#fff', fondo: 'rgba(160,10,10,0.9)' });
    this.epiLbl.position.z = 0.072;
    this.epi.add(estrella, linea, this.epiLbl);
    // Hipocentro bajo el mapa (misma exageración vertical que la placa)
    this.hipo = new THREE.Mesh(new THREE.SphereGeometry(0.007, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2020, emissiveIntensity: 1 }));
    this.hipoLinea = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineDashedMaterial({ color: 0xff8080, dashSize: 0.006, gapSize: 0.004 }),
    );
    this.hipoLinea.computeLineDistances();
    this.epi.add(this.hipo, this.hipoLinea);
    // frentes de onda en 3D alrededor del hipocentro
    const matEsf = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    this.esferaP = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), matEsf(0x4fc3ff));
    this.esferaS = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), matEsf(0xff4040));
    this.esferaP.visible = this.esferaS.visible = false;
    this.epi.add(this.esferaP, this.esferaS);
    this.estrella = estrella;
    this.grupo.add(this.epi);
    this._colocarEpicentro();

    this.marcasCiudad = new Map();
  }

  configurar(c) {
    Object.assign(this.cfg, c);
    this._colocarEpicentro();
    if (!this.corriendo) this._calcular();
  }

  _colocarEpicentro() {
    const [x, y] = proyectar(this.cfg.lon, this.cfg.lat);
    this.epi.position.set(x, y, 0);
    this.epiLbl.userData.actualizarTexto?.(`M${this.cfg.mag.toFixed(1)} · ${this.cfg.prof} km`);
    if (this.hipo) {
      const z = -(this.cfg.prof / KM_POR_UNIDAD) * EXAG_PROF;
      this.hipo.position.z = z;
      this.hipoLinea.scale.z = -z;
      this.esferaP.position.z = this.esferaS.position.z = z;
    }
  }

  _calcular() {
    const { lat, lon, mag, prof } = this.cfg;
    const ciudades = Object.entries(ESTADOS).map(([id, e]) => {
      const d = distanciaKm(lat, lon, e.lat, e.lon);
      const R = Math.hypot(d, prof);
      return { id, nombre: e.capital, d, R, tP: R / VEL_P, tS: R / VEL_S, I: intensidad(mag, R, id) };
    });
    let tAlerta = null, sensorDetecta = null;
    if (mag >= 5.5) {
      for (const s of SENSORES) {
        const d = distanciaKm(lat, lon, s.lat, s.lon);
        if (d > 300) continue;
        const tp = Math.hypot(d, prof) / VEL_P;
        if (tAlerta === null || tp < tAlerta) { tAlerta = tp; sensorDetecta = s; }
      }
      if (tAlerta !== null) tAlerta += T_PROCESO_ALERTA;
    }
    ciudades.forEach((c) => { c.aviso = tAlerta !== null ? c.tS - tAlerta : null; });
    ciudades.sort((a, b) => a.d - b.d);
    this.res = { ciudades, tAlerta, sensorDetecta, tFin: Math.max(...ciudades.map((c) => c.tS)) + 5 };
    this.cb.onResultados?.(this.res, this.cfg);
    return this.res;
  }

  iniciar() {
    this.tiempoReal = false;
    audio.iniciarAudio();
    this.detener(false);
    this._calcular();
    this.t = 0;
    this.corriendo = true;
    this.eventos = [];
    const { ciudades, tAlerta, sensorDetecta } = this.res;
    const esc = ciudades.find((c) => c.id === this.escucha);
    const pan = (id) => { const e = ESTADOS[id]; return e ? (e.lon + 102.5) / 15 : 0; };

    this._evento(0, `<img class="pi" src="assets/pegatinas/ui/ruptura.png" alt="">Ruptura: M${this.cfg.mag.toFixed(1)} a ${this.cfg.prof} km de profundidad. Energía ≈ ${energia(this.cfg.mag).toExponential(1)} J`, 'ruptura', () => {
      audio.golpeP(Math.min(1, this.cfg.mag / 8), 0);
    });
    if (tAlerta !== null) {
      this._evento(tAlerta - T_PROCESO_ALERTA, `<img class="pi" src="assets/pegatinas/ui/sensor-sismico.png" alt="">Sensor «${sensorDetecta.nombre}» detecta la onda P`, 'sensor');
      this._evento(tAlerta, `<img class="pi" src="assets/pegatinas/ui/alerta.png" alt="">ALERTA SÍSMICA emitida por radio (t = ${tAlerta.toFixed(1)} s)`, 'alerta', () => {
        this.cb.onAlerta?.(true);
        if (this.alertaActiva && esc && esc.aviso > 0) audio.alertaSismica();
      });
    } else {
      this._evento(0.1, this.cfg.mag < 5.5 ? 'ℹ️ Magnitud menor a 5.5: el sistema no emite alerta pública.' : 'ℹ️ Ningún sensor está cerca del epicentro: no hay alerta temprana.', 'info');
    }
    for (const c of ciudades) {
      const relevante = c.id === this.escucha || c.d < 450 || ['MX-CMX', 'MX-HID'].includes(c.id);
      this._evento(c.tP, relevante ? `<img class="pi" src="assets/pegatinas/ui/onda-p.png" alt="">Onda P llega a ${c.nombre}` : null, 'p', () => {
        this._marcarCiudad(c, 0x4fc3ff);
        if (c.id === this.escucha) audio.golpeP(Math.min(1, (c.I - 2) / 7), pan(c.id));
      });
      this._evento(c.tS, relevante ? `<img class="pi" src="assets/pegatinas/ui/onda-s.png" alt="">Onda S llega a ${c.nombre} · intensidad ${ROMANOS[Math.round(c.I)]}${c.aviso !== null && this.alertaActiva ? ` · aviso: ${c.aviso > 0 ? c.aviso.toFixed(0) + ' s' : 'ninguno'}` : ''}` : null, 's', () => {
        this._marcarCiudad(c, 0xff4040);
        const reg = this.mapa.estados.get(c.id);
        if (reg) reg.sacudida = Math.max(0, (c.I - 2.5) / 9) * 0.014;
        if (c.id === this.escucha) {
          const ii = Math.max(0, Math.min(1, (c.I - 2) / 8));
          audio.retumbo(ii, 2.5 + ii * 4, pan(c.id));
          this.cb.onEscucha?.(c, this.res);
        }
      });
    }
    this.eventos.sort((a, b) => a.t - b.t);
    this.cb.onInicio?.(this.res, this.cfg);
    [this.anilloP, this.anilloS, this.relleno].forEach((m) => (m.visible = true));
  }

  _evento(t, texto, tipo, fn) { this.eventos.push({ t, texto, tipo, fn, hecho: false }); }

  _marcarCiudad(c, color) {
    let m = this.marcasCiudad.get(c.id);
    const e = ESTADOS[c.id];
    if (!m) {
      m = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 12, 10), new THREE.MeshBasicMaterial({ color, depthTest: false }));
      m.renderOrder = 7;
      m.position.copy(vec(e.lon, e.lat, 0.05));
      this.grupo.add(m);
      this.marcasCiudad.set(c.id, m);
    }
    m.material.color.setHex(color);
    m.scale.setScalar(2.2);
  }

  detener(limpiar = true) {
    this.tiempoReal = false;
    this.corriendo = false;
    if (limpiar) {
      [this.anilloP, this.anilloS, this.relleno, this.esferaP, this.esferaS].forEach((m) => (m.visible = false));
      this.marcasCiudad.forEach((m) => { this.grupo.remove(m); m.geometry.dispose(); });
      this.marcasCiudad.clear();
      this.cb.onAlerta?.(false);
    }
  }

  _anillo(mesh, radioKm, grosor) {
    const r = radioKm / KM_POR_UNIDAD;
    if (r <= 0) { mesh.visible = false; return; }
    mesh.visible = true;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.RingGeometry(Math.max(0, r - grosor), r, 128);
  }

  update(dt) {
    this.estrella.rotation.z += dt * 2;
    this.marcasCiudad.forEach((m) => m.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.pow(0.05, dt)));
    if (!this.corriendo) return;
    // Durante el simulacro el reloj corre a tiempo real: los «91 s de aviso» son 91 s de verdad.
    // Cuando la onda S ya llegó a la ciudad que escuchas, el resto del país se recorre rápido
    // (el visitante ya vio lo importante y no tiene que esperar un minuto más).
    let v = this.velocidad;
    if (this.tiempoReal) v = 1;
    else {
      const esc = this.res?.ciudades.find((c) => c.id === this.escucha);
      if (esc && this.t > esc.tS + 4) v = Math.max(v, 40);
    }
    this.t += dt * v;
    const t = this.t;
    const prof = this.cfg.prof;
    // radio en superficie: sqrt((v t)^2 - h^2)
    const rP = (VEL_P * t) ** 2 > prof ** 2 ? Math.sqrt((VEL_P * t) ** 2 - prof ** 2) : 0;
    const rS = (VEL_S * t) ** 2 > prof ** 2 ? Math.sqrt((VEL_S * t) ** 2 - prof ** 2) : 0;
    this.anilloP.position.copy(this.epi.position).setZ(0.046);
    this.anilloS.position.copy(this.epi.position).setZ(0.047);
    this.relleno.position.copy(this.epi.position).setZ(0.045);
    this._anillo(this.anilloP, rP, 0.0035);
    this._anillo(this.anilloS, rS, 0.006);
    // frentes esféricos alrededor del hipocentro (elipsoides por la exageración vertical)
    for (const [esf, v] of [[this.esferaP, VEL_P], [this.esferaS, VEL_S]]) {
      const r = (v * t) / KM_POR_UNIDAD;
      esf.visible = r > 0 && r < 0.12;
      esf.scale.set(r || 1e-4, r || 1e-4, (r || 1e-4) * EXAG_PROF);
      esf.material.opacity = 0.18 * (1 - r / 0.12);
    }
    const rs = rS / KM_POR_UNIDAD;
    this.relleno.visible = rs > 0;
    this.relleno.scale.set(rs || 0.0001, rs || 0.0001, 1);
    this.relleno.material.opacity = 0.16 * Math.max(0, 1 - t / this.res.tFin);

    for (const ev of this.eventos) {
      if (!ev.hecho && t >= ev.t) {
        ev.hecho = true;
        ev.fn?.();
        if (ev.texto) this.cb.onEvento?.(ev.texto, ev.tipo, ev.t);
      }
    }
    this.cb.onTiempo?.(t, rP, rS);
    if (t > this.res.tFin) {
      this.corriendo = false;
      this.cb.onFin?.();
    }
  }
}

// ---------------------------------------------------------------------
// Corte transversal de la zona de subducción (canvas 2D)
// Eje X: km desde la fosa (positivo hacia el continente). Eje Y: profundidad.
// ---------------------------------------------------------------------
export function dibujarCorte(canvas, cfg, t = 0, corriendo = false) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const xMin = -150, xMax = 650, zMax = 160;
  const X = (km) => ((km - xMin) / (xMax - xMin)) * W;
  const Z = (km) => 14 + (km / zMax) * (H - 22);
  c.clearRect(0, 0, W, H);
  // corteza continental y océano
  c.fillStyle = '#1b2a3f';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#163d5c';
  c.fillRect(0, Z(0) - 8, X(70), 8);
  c.fillStyle = '#6b5a45';
  c.beginPath();
  c.moveTo(X(70), Z(0) - 8); c.lineTo(X(150), Z(0) - 12); c.lineTo(X(300), Z(0) - 13); c.lineTo(X(650), Z(0) - 12);
  c.lineTo(X(650), Z(40)); c.lineTo(X(0), Z(5)); c.closePath(); c.fill();
  // placa de Cocos (losa plana bajo Guerrero: rasgo real de la subducción mexicana)
  const losa = [[-150, 4], [0, 6], [60, 20], [120, 40], [160, 48], [280, 50], [320, 60], [360, 90], [420, 140], [440, 160]];
  c.beginPath();
  losa.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
  [...losa].reverse().forEach(([x, z]) => c.lineTo(X(x - 10), Z(z + 22)));
  c.closePath();
  c.fillStyle = '#3c5f7d';
  c.fill();
  c.fillStyle = '#9fc6e6';
  c.font = '11px system-ui, sans-serif';
  c.fillText('Placa de Cocos →', X(-140), Z(22));
  c.fillStyle = '#e8d7bd';
  c.fillText('Placa Norteamericana', X(330), Z(18));
  // ciudades de referencia
  [['Costa', 70], ['CDMX', 300], ['Pachuca', 380]].forEach(([n, x]) => {
    c.fillStyle = '#ffd34d';
    c.beginPath(); c.moveTo(X(x), Z(0) - 13); c.lineTo(X(x) - 4, Z(0) - 21); c.lineTo(X(x) + 4, Z(0) - 21); c.fill();
    c.fillStyle = '#f4ead7';
    c.fillText(n, X(x) - 14, Z(0) - 24);
  });
  // volcanes (eje neovolcánico ~ donde la losa llega a 100 km)
  c.fillStyle = '#c0532c';
  c.beginPath(); c.moveTo(X(355), Z(0) - 13); c.lineTo(X(370), Z(0) - 30); c.lineTo(X(385), Z(0) - 13); c.fill();
  // hipocentro
  const dx = distanciaFosa(cfg.lat, cfg.lon);
  const hx = X(dx), hz = Z(cfg.prof);
  if (corriendo) {
    const rp = VEL_P * t, rs = VEL_S * t;
    const sx = W / (xMax - xMin), sz = (H - 22) / zMax;
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(79,195,255,0.9)';
    c.beginPath(); c.ellipse(hx, hz, rp * sx, rp * sz, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,64,64,0.95)';
    c.lineWidth = 3;
    c.beginPath(); c.ellipse(hx, hz, rs * sx, rs * sz, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = '#ff3030';
  c.beginPath(); c.arc(hx, hz, 5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#fff';
  c.fillText(`Hipocentro (${cfg.prof} km)`, Math.min(hx + 8, W - 110), hz + 4);
  // escala
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.font = '10px system-ui, sans-serif';
  [0, 50, 100, 150].forEach((z) => c.fillText(`${z} km`, 4, Z(z) + 3));
  c.fillText('Fosa', X(0) - 10, H - 4);
}
