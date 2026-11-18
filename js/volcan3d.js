// Visor 3D de un volcán con su RELIEVE REAL: modelo digital de elevación de
// Terrain Tiles (AWS Open Data: SRTM, GMTED y otros), generado con herramientas/relieve.ps1.
// La forma que ves no es un cono inventado: son miles de mediciones de satélite.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearEtiqueta } from './mapa3d.js';
import * as audio from './audio.js';

// Pisos de vegetación del centro de México (aproximados)
const PISOS = [
  [0, '#5f8f3e'],     // selva y cultivos
  [2200, '#4f7d3a'],  // bosque de encino
  [2800, '#2f5f34'],  // bosque de pino y oyamel
  [3700, '#8a8a52'],  // pastizal alpino (zacatonal)
  [4300, '#6f655c'],  // roca y arena volcánica
  [4900, '#f2f5fa'],  // nieve
];

// Color según el piso de altitud, con transición suave de 150 m entre pisos
function colorAltura(m) {
  let i = PISOS.length - 1;
  while (i > 0 && m < PISOS[i][0]) i--;
  const c = new THREE.Color(PISOS[i][1]);
  const sig = PISOS[i + 1];
  if (sig && m > sig[0] - 150) c.lerp(new THREE.Color(sig[1]), (m - (sig[0] - 150)) / 150);
  return c;
}

let vista = null;

export async function abrirVolcan(volcan, cimas = []) {
  cerrarVolcan();
  const cont = document.createElement('div');
  cont.className = 'volcan-vista';
  cont.innerHTML = `
    <div class="vv-barra">
      <div><p class="sub">Relieve real · satélite</p><h2>${volcan.nombre}</h2></div>
      <button class="cerrar" aria-label="Cerrar">×</button>
    </div>
    <div class="vv-lienzo"></div>
    <div class="vv-panel">
      <div class="control"><label>Exageración vertical <output id="vv-exag">1.5×</output></label>
        <input type="range" id="vv-rng" min="1" max="3" step="0.1" value="1.5"></div>
      <div class="fila">
        ${volcan.activo ? '<button class="btn peligro" id="vv-erupcion">🌋 Erupción</button>' : ''}
        <button class="btn" id="vv-girar">⟳ Girar</button>
      </div>
      <div class="vv-leyenda">${PISOS.slice().reverse().map(([h, c], i, a) => `<div><i style="background:${c}"></i>${i === 0 ? `más de ${h.toLocaleString('es-MX')} m · nieve` : `${h.toLocaleString('es-MX')}–${a[i - 1][0].toLocaleString('es-MX')} m`}</div>`).join('')}</div>
      <p class="nota" id="vv-info">Cargando relieve…</p>
    </div>`;
  document.body.appendChild(cont);
  const lienzo = cont.querySelector('.vv-lienzo');

  const r = await fetch(`data/relieve/${volcan.relieve}.json`);
  if (!r.ok) { cont.querySelector('#vv-info').textContent = 'No hay datos de relieve para este volcán.'; return; }
  const dem = await r.json();
  const n = dem.n;
  const latC = (dem.lat0 + dem.lat1) / 2;
  const anchoKm = (dem.lon1 - dem.lon0) * 111.32 * Math.cos((latC * Math.PI) / 180);
  const altoKm = (dem.lat1 - dem.lat0) * 111.32;
  let zMin = Infinity, zMax = -Infinity, iMax = 0;
  dem.z.forEach((z, i) => { if (z < zMin) zMin = z; if (z > zMax) { zMax = z; iMax = i; } });

  // --- escena ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  lienzo.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(0x0b1222, 60, 140);
  const camara = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  camara.position.set(anchoKm * 0.7, zMax / 1000 * 3 + 18, altoKm * 0.95);
  const ctl = new OrbitControls(camara, renderer.domElement);
  ctl.enableDamping = true;
  ctl.maxPolarAngle = Math.PI * 0.48;
  ctl.minDistance = 8;
  ctl.maxDistance = 120;
  escena.add(new THREE.HemisphereLight(0xcfe3ff, 0x3a2a1a, 1.1));
  const sol = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sol.position.set(-40, 50, 25);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 });
  escena.add(sol);

  // --- terreno ---
  const geo = new THREE.PlaneGeometry(anchoKm, altoKm, n - 1, n - 1);
  geo.rotateX(-Math.PI / 2); // filas = norte→sur, columnas = oeste→este
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const base = zMin / 1000;
  let exag = 1.5;
  const aplicarAltura = () => {
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, (dem.z[i] / 1000 - base) * exag);
      const c = colorAltura(dem.z[i]);
      // sombreado suave extra por altura (más contraste)
      col.set([c.r, c.g, c.b], i * 3);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  aplicarAltura();
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const terreno = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: false }));
  terreno.castShadow = terreno.receiveShadow = true;
  escena.add(terreno);

  // Faldón: convierte el terreno en una "maqueta" con base
  const faldon = new THREE.Group();
  const matF = new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 1 });
  const crearFaldon = () => {
    faldon.clear();
    const lados = [
      Array.from({ length: n }, (_, j) => j),
      Array.from({ length: n }, (_, j) => (n - 1) * n + j),
      Array.from({ length: n }, (_, i) => i * n),
      Array.from({ length: n }, (_, i) => i * n + n - 1),
    ];
    for (const idx of lados) {
      const v = [];
      for (let k = 0; k < idx.length - 1; k++) {
        const a = idx[k], b = idx[k + 1];
        const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
        const bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b);
        v.push(ax, ay, az, bx, by, bz, ax, -0.6, az, bx, by, bz, bx, -0.6, bz, ax, -0.6, az);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.computeVertexNormals();
      faldon.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 1, side: THREE.DoubleSide })));
    }
  };
  crearFaldon();
  escena.add(faldon);
  const base3d = new THREE.Mesh(new THREE.BoxGeometry(anchoKm, 0.2, altoKm), matF);
  base3d.position.y = -0.7;
  escena.add(base3d);

  // --- etiquetas de cimas ---
  const etiquetas = [];
  const ponerEtiqueta = (texto, i) => {
    const s = crearEtiqueta(texto, { tam: 2.2, fondo: 'rgba(10,14,24,0.8)' });
    s.userData.i = i;
    escena.add(s);
    etiquetas.push(s);
  };
  const indice = (lat, lon) => {
    const fi = Math.round(((dem.lat1 - lat) / (dem.lat1 - dem.lat0)) * (n - 1));
    const cj = Math.round(((lon - dem.lon0) / (dem.lon1 - dem.lon0)) * (n - 1));
    return Math.max(0, Math.min(n - 1, fi)) * n + Math.max(0, Math.min(n - 1, cj));
  };
  // la cima de este volcán = el punto más alto cerca de su coordenada
  const buscarCima = (lat, lon, radio = 4) => {
    const c = indice(lat, lon);
    const fi = Math.floor(c / n), cj = c % n;
    let mejor = c;
    for (let a = -radio; a <= radio; a++) for (let b = -radio; b <= radio; b++) {
      const i = (fi + a) * n + (cj + b);
      if (fi + a >= 0 && fi + a < n && cj + b >= 0 && cj + b < n && dem.z[i] > dem.z[mejor]) mejor = i;
    }
    return mejor;
  };
  const iCima = buscarCima(volcan.lat, volcan.lon);
  ponerEtiqueta(`${volcan.nombre.split(' (')[0]}\n${volcan.alt.toLocaleString('es-MX')} m`, iCima);
  for (const v of cimas) ponerEtiqueta(`${v.nombre.split(' (')[0]}\n${v.alt.toLocaleString('es-MX')} m`, buscarCima(v.lat, v.lon));
  const colocarEtiquetas = () => etiquetas.forEach((s) => {
    const i = s.userData.i;
    s.position.set(pos.getX(i), pos.getY(i) + 0.8, pos.getZ(i));
  });
  colocarEtiquetas();

  // brújula: N
  const norte = crearEtiqueta('N ↑', { tam: 2, fondo: 'rgba(160,30,30,0.85)' });
  norte.position.set(0, 0.5, -altoKm / 2 - 1.5);
  escena.add(norte);

  // --- fumarola / erupción ---
  const N = 900;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(N * 3), pc = new Float32Array(N * 3);
  const vida = new Float32Array(N).fill(-1);
  const vel = new Float32Array(N * 3);
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const puntos = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  escena.add(puntos);
  let fuerza = volcan.activo ? 0.08 : 0; // fumarola leve si está activo
  let luz = null;
  const emitir = (k) => {
    const cx = pos.getX(iCima), cy = pos.getY(iCima), cz = pos.getZ(iCima);
    pp.set([cx + (Math.random() - 0.5) * 0.4, cy, cz + (Math.random() - 0.5) * 0.4], k * 3);
    const lava = fuerza > 0.5 && Math.random() < 0.35;
    const ang = Math.random() * Math.PI * 2, ab = Math.random() * (lava ? 2.5 : 0.6);
    vel.set([Math.cos(ang) * ab + (lava ? 0 : 0.6), (lava ? 5 : 2.2) + Math.random() * 3 * fuerza * 2, Math.sin(ang) * ab], k * 3);
    const g = 0.55 + Math.random() * 0.3;
    pc.set(lava ? [1, 0.35 + Math.random() * 0.3, 0.05] : [g, g, g * 1.02], k * 3);
    vida[k] = 0;
  };
  const actualizarParticulas = (dt) => {
    const nuevos = Math.floor(fuerza * 40 * dt * 60);
    let emitidos = 0;
    for (let k = 0; k < N; k++) {
      if (vida[k] < 0) { if (emitidos < nuevos) { emitir(k); emitidos++; } else { pp[k * 3 + 1] = -999; } continue; }
      vida[k] += dt;
      const esLava = pc[k * 3] > 0.9 && pc[k * 3 + 2] < 0.2;
      vel[k * 3 + 1] -= (esLava ? 4.5 : 0.25) * dt;
      vel[k * 3] += 0.15 * dt; // viento hacia el este
      pp[k * 3] += vel[k * 3] * dt;
      pp[k * 3 + 1] += vel[k * 3 + 1] * dt;
      pp[k * 3 + 2] += vel[k * 3 + 2] * dt;
      if (vida[k] > (esLava ? 3 : 9) || pp[k * 3 + 1] < -0.5) vida[k] = -1;
    }
    pg.attributes.position.needsUpdate = true;
    pg.attributes.color.needsUpdate = true;
    if (luz) luz.intensity = fuerza > 0.5 ? 30 * fuerza * (0.7 + Math.random() * 0.3) : 0;
  };

  cont.querySelector('#vv-erupcion')?.addEventListener('click', () => {
    if (!luz) { luz = new THREE.PointLight(0xff5a1a, 0, 30); escena.add(luz); }
    luz.position.set(pos.getX(iCima), pos.getY(iCima) + 1, pos.getZ(iCima));
    fuerza = 1.2;
    audio.erupcion(0);
    setTimeout(() => (fuerza = 0.5), 4000);
    setTimeout(() => (fuerza = volcan.activo ? 0.08 : 0), 9000);
  });
  let girar = true;
  ctl.autoRotate = true;
  ctl.autoRotateSpeed = 0.6;
  cont.querySelector('#vv-girar').addEventListener('click', () => { girar = !girar; ctl.autoRotate = girar; });
  cont.querySelector('#vv-rng').addEventListener('input', (e) => {
    exag = +e.target.value;
    cont.querySelector('#vv-exag').textContent = exag.toFixed(1) + '×';
    aplicarAltura(); crearFaldon(); colocarEtiquetas();
  });
  cont.querySelector('.cerrar').addEventListener('click', cerrarVolcan);

  const desnivel = zMax - zMin;
  cont.querySelector('#vv-info').innerHTML = `Área: ${anchoKm.toFixed(0)} × ${altoKm.toFixed(0)} km · ${n * n} mediciones · desnivel <b>${desnivel.toLocaleString('es-MX')} m</b>.
    Punto más alto del modelo: ${zMax.toLocaleString('es-MX')} m (cada celda del modelo promedia decenas de metros, por eso la cima sale un poco más baja que la real).
    <br>Fuente: ${dem.fuente}.`;

  const reloj = new THREE.Clock();
  const ajustar = () => {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(lienzo);
  ajustar();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, reloj.getDelta());
    actualizarParticulas(dt);
    ctl.update();
    renderer.render(escena, camara);
  });
  vista = { cont, renderer, ro };
}

export function cerrarVolcan() {
  if (!vista) return;
  vista.renderer.setAnimationLoop(null);
  vista.ro.disconnect();
  vista.renderer.dispose();
  vista.cont.remove();
  vista = null;
}
