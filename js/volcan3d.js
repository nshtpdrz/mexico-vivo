// Visor 3D de un volcán con su RELIEVE REAL: modelo digital de elevación de
// Terrain Tiles (AWS Open Data: SRTM, GMTED y otros), generado con herramientas/relieve.ps1.
// La forma que ves no es un cono inventado: son miles de mediciones de satélite.
// Estilo «Atlas de Velasco»: relieve sombreado a mano con luz cálida del noroeste
// (la convención cartográfica), tintas hipsométricas, rayado en las sombras y
// curvas de nivel en sepia. Todo en un solo shader WebGL, sin posproceso.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearEtiqueta, materialAtlas } from './mapa3d.js';
import * as audio from './audio.js';

// Tintas hipsométricas (pisos de vegetación del centro de México, aproximados).
// Entre paradas se mezcla con curva suave: gradiente continuo, sin bandas.
const TINTAS = [
  [0, '#c4b67c'],     // cultivos y selva baja (ocres del valle de Velasco)
  [1600, '#b3ad74'],
  [2300, '#8a9a5e'],  // bosque de encino
  [2900, '#5f7b4b'],  // bosque de pino y oyamel
  [3500, '#687a4b'],
  [3850, '#b3a36b'],  // pastizal alpino (zacatonal)
  [4250, '#9c8466'],  // roca y arena volcánica
  [4700, '#8d7b6c'],
  [4780, '#f7efe0'],  // nieve (papel)
].map(([h, c]) => [h, new THREE.Color(c)]);
const ROCA = new THREE.Color('#8b7360');

// Leyenda (lo que ve el usuario)
const PISOS = [
  [4800, '#f7efe0', 'nieve y glaciar'],
  [4250, '#9c8466', 'roca y arena volcánica'],
  [3800, '#b3a36b', 'pastizal alpino (zacatonal)'],
  [2800, '#5f7b4b', 'bosque de pino y oyamel'],
  [2200, '#8a9a5e', 'bosque de encino'],
  [0, '#b3ad74', 'cultivos y selva baja'],
];

const PAPEL = 0xefe6d4;
const suave = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

function tinta(m, out) {
  let i = 0;
  while (i < TINTAS.length - 2 && m >= TINTAS[i + 1][0]) i++;
  const [h0, c0] = TINTAS[i], [h1, c1] = TINTAS[i + 1];
  return out.copy(c0).lerp(c1, suave((m - h0) / (h1 - h0)));
}

// Remuestreo bicúbico (Catmull-Rom) x f: más vértices, normales y sombras suaves
// sin escalones, conservando cada medición original.
function remuestrear(z, n, f) {
  const m = (n - 1) * f + 1;
  const cr = (a, b, c, d, t) => b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
  const cl = (k, max) => Math.max(0, Math.min(max - 1, k));
  const tmp = new Float32Array(n * m);
  for (let i = 0; i < n; i++) for (let J = 0; J < m; J++) {
    const j0 = Math.min(n - 2, Math.floor(J / f)), t = J / f - j0;
    const g = (j) => z[i * n + cl(j, n)];
    tmp[i * m + J] = cr(g(j0 - 1), g(j0), g(j0 + 1), g(j0 + 2), t);
  }
  const out = new Float32Array(m * m);
  for (let I = 0; I < m; I++) {
    const i0 = Math.min(n - 2, Math.floor(I / f)), t = I / f - i0;
    for (let J = 0; J < m; J++) {
      const g = (i) => tmp[cl(i, n) * m + J];
      out[I * m + J] = cr(g(i0 - 1), g(i0), g(i0 + 1), g(i0 + 2), t);
    }
  }
  return { zz: out, m };
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
        ${volcan.activo ? '<button class="btn peligro" id="vv-erupcion"><img class="pi" src="assets/pegatinas/ui/erupcion.png" alt="">Erupción</button>' : ''}
        <button class="btn" id="vv-girar">⟳ Girar</button>
        <button class="btn" id="vv-vr" hidden><img class="pi" src="assets/pegatinas/ui/ar.png" alt="">Ver en VR</button>
      </div>
      <div class="vv-leyenda">${PISOS.map(([h, c, nom], i) => `<div><i style="background:${c}"></i>${i === 0 ? `más de ${h.toLocaleString('es-MX')} m` : `${h.toLocaleString('es-MX')}–${PISOS[i - 1][0].toLocaleString('es-MX')} m`} · ${nom}</div>`).join('')}
        <div><i style="background:none;border-top:2px solid #7a5a3c;height:0;margin-top:6px"></i>curvas de nivel cada 100 m</div></div>
      <p class="nota" id="vv-info">Cargando relieve…</p>
    </div>`;
  document.body.appendChild(cont);
  const lienzo = cont.querySelector('.vv-lienzo');

  const r = await fetch(`data/relieve/${volcan.relieve}.json`);
  if (!r.ok) { cont.querySelector('#vv-info').textContent = 'No hay datos de relieve para este volcán.'; return; }
  const dem = await r.json();
  if (!cont.isConnected) return; // se cerró mientras cargaba
  const n = dem.n;
  const latC = (dem.lat0 + dem.lat1) / 2;
  const anchoKm = (dem.lon1 - dem.lon0) * 111.32 * Math.cos((latC * Math.PI) / 180);
  const altoKm = (dem.lat1 - dem.lat0) * 111.32;
  let zMin = Infinity, zMax = -Infinity;
  for (const z of dem.z) { if (z < zMin) zMin = z; if (z > zMax) zMax = z; }
  const L = Math.max(anchoKm, altoKm);
  const desnivel = zMax - zMin;
  // exageración calibrada: el relieve ocupa ~1/5 del ancho de la maqueta
  // (Orizaba ~1.4x, Popo-Izta ~2.5x); el usuario puede cambiarla
  let exag = Math.round(Math.max(1.2, Math.min(2.5, (0.2 * L) / (desnivel / 1000))) * 10) / 10;
  cont.querySelector('#vv-rng').value = exag;
  cont.querySelector('#vv-exag').textContent = exag.toFixed(1) + '×';

  // --- escena ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(PAPEL, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // el terreno no se mueve: la sombra se recalcula solo al cambiarlo
  renderer.xr.enabled = true;
  lienzo.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(PAPEL, L * 1.5, L * 4.2); // bruma ligera de papel
  const camara = new THREE.PerspectiveCamera(40, 1, 0.1, L * 8);
  camara.position.set(L * 0.35, (desnivel / 1000) * exag + L * 0.75, L * 1.35); // desde el sur, como un mapa
  const ctl = new OrbitControls(camara, renderer.domElement);
  ctl.enableDamping = true;
  ctl.maxPolarAngle = Math.PI * 0.48;
  ctl.minDistance = L * 0.25;
  ctl.maxDistance = L * 3;
  ctl.target.set(0, (desnivel / 1000) * exag * 0.25, 0);
  const hemi = new THREE.HemisphereLight(0xfff1da, 0x6e5c48, 0.95);
  escena.add(hemi);
  // sol cálido del noroeste (norte = -z), bajo, para que las barrancas se lean
  const sol = new THREE.DirectionalLight(0xffe2b8, 3.1);
  sol.position.set(-1, 1.25, -1).normalize().multiplyScalar(L * 1.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  const mitad = L * 0.75;
  Object.assign(sol.shadow.camera, { left: -mitad, right: mitad, top: mitad, bottom: -mitad, near: L * 0.3, far: L * 3 });
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = L * 0.0012;
  escena.add(sol);
  const luzRef = (sol.intensity * 0.75 + hemi.intensity) / Math.PI;

  // --- terreno ---
  const F = 2;
  const { zz, m } = remuestrear(dem.z, n, F);
  const geo = new THREE.PlaneGeometry(anchoKm, altoKm, m - 1, m - 1);
  geo.rotateX(-Math.PI / 2); // filas = norte a sur, columnas = oeste a este
  const pos = geo.attributes.position;
  geo.setAttribute('alturaM', new THREE.BufferAttribute(new Float32Array(zz), 1));

  // pendiente, orientación y curvatura en metros reales (no dependen de la exageración)
  const dx = (anchoKm * 1000) / (m - 1), dz = (altoKm * 1000) / (m - 1);
  const cl = (k) => Math.max(0, Math.min(m - 1, k));
  const Z = (i, j) => zz[cl(i) * m + cl(j)];
  const lisa = new Float32Array(m * m); // altura suavizada 5x5: curvatura a escala de barranca
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
    let s = 0;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) s += Z(i + a, j + b);
    lisa[i * m + j] = s / 25;
  }
  const Ls = (i, j) => lisa[cl(i) * m + cl(j)];
  const curv = new Float32Array(m * m);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
    curv[i * m + j] = Ls(i - 1, j) + Ls(i + 1, j) + Ls(i, j - 1) + Ls(i, j + 1) - 4 * Ls(i, j); // >0 = cóncavo (barranca)
  }
  const ord = Float32Array.from(curv, Math.abs).sort();
  const escalaCurv = ord[Math.floor(ord.length * 0.95)] || 1;

  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
    const k = i * m + j, h = zz[k];
    const gx = (Z(i, j + 1) - Z(i, j - 1)) / (2 * dx), gs = (Z(i + 1, j) - Z(i - 1, j)) / (2 * dz);
    const tanP = Math.hypot(gx, gs);
    const norte = tanP > 0.05 ? Math.max(0, gs / tanP) : 0; // sube hacia el sur = ladera que mira al norte
    const cv = Math.max(-1, Math.min(1, curv[k] / escalaCurv));
    // límites irregulares entre pisos (no curvas de nivel perfectas)
    const ruido = Math.sin(i * 0.37 + j * 0.11) * 45 + Math.sin(j * 0.53 - i * 0.23) * 35 + Math.sin((i + j) * 1.7) * 15;
    // la nieve y el zacatonal bajan en caras norte y en barrancas
    const hEf = h + ruido + norte * Math.min(1, tanP * 3) * 140 + Math.max(0, cv) * (h > 4200 ? 160 : 60);
    tinta(hEf, c);
    // laderas muy empinadas sobre el bosque: roca desnuda; la nieve no se sostiene
    const escarpe = suave((tanP - 0.6) / 0.45) * suave((h - 3300) / 500);
    if (escarpe > 0) c.lerp(ROCA, escarpe * (hEf > 4780 ? 0.55 : 0.8));
    // barrancas más oscuras, crestas un poco más claras (oclusión de atlas)
    c.multiplyScalar(1 - Math.max(0, cv) * 0.18 + Math.max(0, -cv) * 0.06);
    col.set([c.r, c.g, c.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const base = zMin / 1000;
  const terreno = new THREE.Mesh(geo, materialAtlas({ rayado: 2.2, fuerza: 0.3, curva: 100, luzRef }));
  terreno.castShadow = terreno.receiveShadow = true;
  escena.add(terreno);

  // Faldón: corte de la maqueta con estratos de tierra y borde en tinta (una sola malla)
  const PISO = -0.6, FRANJA = 0.35;
  const faldon = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); // tinta plana, como grabado
  const borde = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2b2118, transparent: true, opacity: 0.7 }));
  const cEst = [new THREE.Color('#b59a72'), new THREE.Color('#c7ad85'), new THREE.Color('#a3875f')];
  const cSuelo = new THREE.Color('#6b513b');
  const LUZ_LADO = [1, 0.86, 0.74, 0.92]; // norte, este, sur, oeste: sombreado fijo por cara
  const cTmp = new THREE.Color();
  const lados = [
    Array.from({ length: m }, (_, j) => j),
    Array.from({ length: m }, (_, i) => i * m + m - 1),
    Array.from({ length: m }, (_, j) => (m - 1) * m + (m - 1 - j)),
    Array.from({ length: m }, (_, i) => (m - 1 - i) * m),
  ];
  const crearFaldon = () => {
    const v = [], cc = [], ln = [];
    lados.forEach((idx, lado) => {
      for (let k = 0; k < idx.length - 1; k++) {
        const a = idx[k], b = idx[k + 1];
        const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
        const bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b);
        // columna partida en franjas: estratos horizontales y suelo oscuro arriba
        const tope = Math.max(ay, by);
        for (let y0 = PISO, e = 0; y0 < tope; y0 += FRANJA, e++) {
          const y1 = Math.min(tope, y0 + FRANJA);
          const ya0 = Math.min(ay, y0), yb0 = Math.min(by, y0), ya1 = Math.min(ay, y1), yb1 = Math.min(by, y1);
          v.push(ax, ya0, az, bx, yb0, bz, ax, ya1, az, bx, yb0, bz, bx, yb1, bz, ax, ya1, az);
          const ce = cTmp.copy(y1 >= tope ? cSuelo : cEst[e % 3]).multiplyScalar(LUZ_LADO[lado]);
          for (let q = 0; q < 6; q++) cc.push(ce.r, ce.g, ce.b);
        }
        ln.push(ax, ay + 0.01, az);
      }
    });
    faldon.geometry.dispose();
    faldon.geometry = new THREE.BufferGeometry();
    faldon.geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    faldon.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    borde.geometry.dispose();
    borde.geometry = new THREE.BufferGeometry();
    borde.geometry.setAttribute('position', new THREE.Float32BufferAttribute(ln, 3));
  };

  const aplicarAltura = () => {
    for (let i = 0; i < pos.count; i++) pos.setY(i, (zz[i] / 1000 - base) * exag);
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    crearFaldon();
    renderer.shadowMap.needsUpdate = true;
  };
  aplicarAltura();
  escena.add(faldon, borde);
  const base3d = new THREE.Mesh(new THREE.BoxGeometry(anchoKm + 0.3, 0.2, altoKm + 0.3), new THREE.MeshBasicMaterial({ color: 0x4a3828 }));
  base3d.position.y = PISO - 0.1;
  escena.add(base3d);

  // --- etiquetas de cimas (papel y tinta) ---
  const etiquetas = [];
  const ponerEtiqueta = (texto, i) => {
    const s = crearEtiqueta(texto, { tam: L * 0.042, color: '#1b1a17', fondo: 'rgba(247,239,224,0.94)', borde: 'rgba(27,26,23,0.45)' });
    s.material.fog = false;
    s.userData.i = i;
    escena.add(s);
    etiquetas.push(s);
  };
  const indice = (lat, lon) => {
    const fi = Math.round(((dem.lat1 - lat) / (dem.lat1 - dem.lat0)) * (m - 1));
    const cj = Math.round(((lon - dem.lon0) / (dem.lon1 - dem.lon0)) * (m - 1));
    return cl(fi) * m + cl(cj);
  };
  // la cima de este volcán = el punto más alto cerca de su coordenada
  const buscarCima = (lat, lon, radio = 4 * F) => {
    const c0 = indice(lat, lon);
    const fi = Math.floor(c0 / m), cj = c0 % m;
    let mejor = c0;
    for (let a = -radio; a <= radio; a++) for (let b = -radio; b <= radio; b++) {
      const i = (fi + a) * m + (cj + b);
      if (fi + a >= 0 && fi + a < m && cj + b >= 0 && cj + b < m && zz[i] > zz[mejor]) mejor = i;
    }
    return mejor;
  };
  const iCima = buscarCima(volcan.lat, volcan.lon);
  ponerEtiqueta(`${volcan.nombre.split(' (')[0]}\n${volcan.alt.toLocaleString('es-MX')} m`, iCima);
  for (const v of cimas) ponerEtiqueta(`${v.nombre.split(' (')[0]}\n${v.alt.toLocaleString('es-MX')} m`, buscarCima(v.lat, v.lon));
  const colocarEtiquetas = () => etiquetas.forEach((s) => {
    const i = s.userData.i;
    s.position.set(pos.getX(i), pos.getY(i) + L * 0.025, pos.getZ(i));
  });
  colocarEtiquetas();

  // brújula: N en grana
  const norte = crearEtiqueta('N ↑', { tam: L * 0.036, color: '#fff', fondo: 'rgba(179,38,30,0.92)' });
  norte.material.fog = false;
  norte.position.set(0, 0.5, -altoKm / 2 - L * 0.05);
  escena.add(norte);

  // --- fumarola / erupción ---
  const N = 900;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(N * 3), pc = new Float32Array(N * 3);
  const vida = new Float32Array(N).fill(-1);
  const vel = new Float32Array(N * 3);
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const puntos = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
  puntos.frustumCulled = false;
  escena.add(puntos);
  let fuerza = volcan.activo ? 0.08 : 0; // fumarola leve si está activo
  let luz = null;
  const emitir = (k) => {
    const cx = pos.getX(iCima), cy = pos.getY(iCima), cz = pos.getZ(iCima);
    pp.set([cx + (Math.random() - 0.5) * 0.4, cy, cz + (Math.random() - 0.5) * 0.4], k * 3);
    const lava = fuerza > 0.5 && Math.random() < 0.35;
    const ang = Math.random() * Math.PI * 2, ab = Math.random() * (lava ? 2.5 : 0.6);
    vel.set([Math.cos(ang) * ab + (lava ? 0 : 0.6), (lava ? 5 : 2.2) + Math.random() * 3 * fuerza * 2, Math.sin(ang) * ab], k * 3);
    const g = 0.5 + Math.random() * 0.25; // ceniza gris cálida: se lee sobre el papel
    pc.set(lava ? [1, 0.35 + Math.random() * 0.3, 0.05] : [g * 1.03, g, g * 0.95], k * 3);
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
    aplicarAltura(); colocarEtiquetas();
  });
  cont.querySelector('.cerrar').addEventListener('click', cerrarVolcan);

  cont.querySelector('#vv-info').innerHTML = `Área: ${anchoKm.toFixed(0)} × ${altoKm.toFixed(0)} km · ${n * n} mediciones · desnivel <b>${desnivel.toLocaleString('es-MX')} m</b>.
    Punto más alto del modelo: ${zMax.toLocaleString('es-MX')} m (cada celda del modelo promedia decenas de metros, por eso la cima sale un poco más baja que la real).
    <br>Fuente: ${dem.fuente}.`;

  const reloj = new THREE.Clock();
  const ajustar = () => {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(lienzo);
  ajustar();
  // --- VR (WebXR): la maqueta sobre una mesa virtual, o volando sobre el volcán ---
  // En lugar de escalar la escena (rompería sombras y bruma), se escala al visitante:
  // la cámara cuelga de un «carro» cuya escala convierte metros reales en km del modelo.
  const carro = new THREE.Group();
  escena.add(carro);
  const MODOS = [
    { nombre: 'maqueta', k: L / 1.4, alto: 0.85, frente: 1.0 }, // modelo de 1.4 m sobre una mesa
    { nombre: 'vuelo', k: L / 9, alto: -0.6, frente: 3.2 }, // modelo de 9 m: se ve desde arriba, como en avioneta
  ];
  let modoVR = 0, camaraGuardada = null;
  const ponerModo = (i) => {
    modoVR = i;
    const m = MODOS[i];
    carro.scale.setScalar(m.k);
    carro.position.set(0, -m.alto * m.k, m.frente * m.k);
  };
  const rayoGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const controles = [0, 1].map((i) => {
    const c = renderer.xr.getController(i);
    const linea = new THREE.Line(rayoGeo, new THREE.LineBasicMaterial({ color: 0xb3261e }));
    linea.scale.z = 0.6;
    c.add(linea);
    c.addEventListener('selectstart', () => cont.querySelector('#vv-erupcion')?.click()); // gatillo: erupción
    c.addEventListener('squeezestart', () => ponerModo((modoVR + 1) % MODOS.length)); // agarre: maqueta ↔ vuelo
    carro.add(c);
    return c;
  });
  const btnVR = cont.querySelector('#vv-vr');
  navigator.xr?.isSessionSupported?.('immersive-vr').then((ok) => { btnVR.hidden = !ok; }).catch(() => {});
  btnVR.addEventListener('click', async () => {
    try {
      const sesion = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      renderer.xr.setReferenceSpaceType('local-floor');
      await renderer.xr.setSession(sesion);
    } catch (e) {
      cont.querySelector('#vv-info').insertAdjacentHTML('afterbegin', `<b>No se pudo abrir la VR:</b> ${e.message || e}<br>`);
    }
  });
  renderer.xr.addEventListener('sessionstart', () => {
    camaraGuardada = { p: camara.position.clone(), q: camara.quaternion.clone() };
    carro.add(camara);
    ponerModo(0);
    audio.iniciarAudio?.();
  });
  renderer.xr.addEventListener('sessionend', () => {
    carro.remove(camara);
    if (camaraGuardada) { camara.position.copy(camaraGuardada.p); camara.quaternion.copy(camaraGuardada.q); }
    ajustar();
  });

  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, reloj.getDelta());
    actualizarParticulas(dt);
    if (!renderer.xr.isPresenting) ctl.update();
    renderer.render(escena, camara);
  });
  vista = { cont, renderer, ro, escena, ctl, controles };
}

export function cerrarVolcan() {
  if (!vista) return;
  vista.renderer.xr.getSession?.()?.end().catch(() => {});
  vista.renderer.setAnimationLoop(null);
  vista.ro.disconnect();
  vista.ctl.dispose();
  // liberar GPU: geometrías, materiales y texturas de etiquetas
  vista.escena.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const mt of mats) { mt.map?.dispose(); mt.dispose(); }
  });
  vista.renderer.dispose();
  vista.cont.remove();
  vista = null;
}
