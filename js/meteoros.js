// Fenómenos meteorológicos (capa Clima): huracanes y frentes fríos («nortes»).
//
// Huracán: se forma sobre agua de mar de 26 °C o más. El agua que se evapora sube, se condensa y
// libera calor latente; el aire caliente asciende, baja la presión en el centro y entra más aire.
// Por la rotación de la Tierra (efecto Coriolis) en el hemisferio norte gira en sentido contrario
// a las manecillas del reloj. Sobre tierra pierde su fuente de energía (el mar cálido) y se debilita.
// Categoría por viento sostenido, escala Saffir-Simpson (NOAA): 1: 119–153 km/h, 2: 154–177,
// 3: 178–208, 4: 209–251, 5: 252 o más.
//
// Frente frío: una masa de aire polar, fría y más densa, avanza hacia el sur y levanta al aire cálido.
// En la costa del Golfo de México provoca los «nortes»: vientos fuertes del norte y descenso de temperatura.
//
// Todo es una simulación didáctica: las trayectorias son ilustrativas, no de huracanes reales.
import * as THREE from '../vendor/three/three.module.js';
import { vec } from './mapa3d.js';
import { enTierra } from './tsunami.js';
import { distanciaKm } from './geo.js';
import { ESTADOS } from './datos.js';

export const SAFFIR = [
  { cat: 1, min: 119, max: 153, efecto: 'ramas rotas, daños menores en techos' },
  { cat: 2, min: 154, max: 177, efecto: 'árboles caídos, daños en techos y ventanas' },
  { cat: 3, min: 178, max: 208, efecto: 'daños graves en casas, cortes de luz por días' },
  { cat: 4, min: 209, max: 251, efecto: 'daños severos: techos y muros caen, inundación costera' },
  { cat: 5, min: 252, max: 300, efecto: 'catastrófico: destrucción de casas y de la zona costera' },
];

// trayectorias ilustrativas [lon, lat]
export const TRAYECTORIAS = {
  pacifico: { nombre: 'Pacífico', puntos: [[-97.2, 11.8], [-98.6, 13.4], [-99.9, 15.0], [-100.9, 16.4], [-101.6, 17.6], [-101.9, 18.7], [-102.0, 19.7]] },
  atlantico: { nombre: 'Atlántico y Caribe', puntos: [[-83.2, 16.4], [-84.6, 17.8], [-86.0, 19.5], [-87.4, 20.8], [-89.4, 21.4], [-92.6, 22.4], [-95.8, 23.2], [-97.9, 23.9], [-100.0, 24.6]] },
};

function interpolar(pts, u) {
  const n = pts.length - 1, x = Math.min(n - 1e-6, Math.max(0, u * n)), i = Math.floor(x), f = x - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
}

function texturaHuracan() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.translate(128, 128);
  // brazos espirales (bandas de lluvia) que se enrollan hacia el centro
  for (let b = 0; b < 4; b++) {
    for (let k = 0; k < 120; k++) {
      const t = k / 120, a = b * (Math.PI / 2) + t * Math.PI * 2.2, r = 18 + t * 104;
      g.fillStyle = `rgba(245,249,255,${0.8 * (1 - t) + 0.15})`;
      g.beginPath(); g.arc(Math.cos(a) * r, -Math.sin(a) * r, 10 * (1 - t * 0.6), 0, Math.PI * 2); g.fill();
    }
  }
  const gr = g.createRadialGradient(0, 0, 4, 0, 0, 40);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(40,60,110,0.85)'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill(); // el ojo
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Meteoros {
  constructor(mapa, cb = {}) {
    this.mapa = mapa; this.cb = cb;
    this.grupo = new THREE.Group();
    // grupo propio colgado del mapa: la capa Clima se vacía cada vez que se repinta
    mapa.root.add(this.grupo);
    this.grupo.visible = false;
    this.disco = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texturaHuracan(), transparent: true, depthWrite: false }));
    this.disco.position.z = 0.05; this.disco.visible = false; this.disco.renderOrder = 5;
    this.grupo.add(this.disco);
    this.estela = null; this.frenteObj = null; this.flechas = [];
    this.modo = null;
  }

  detener() {
    this.modo = null;
    this.grupo.visible = false;
    this.disco.visible = false;
    for (const o of [this.estela, this.frenteObj, ...this.flechas]) if (o) { this.grupo.remove(o); o.traverse?.((m) => { m.geometry?.dispose(); m.material?.dispose?.(); }); }
    this.estela = null; this.frenteObj = null; this.flechas = [];
  }

  // ---------- huracán ----------
  huracan(oceano, cat) {
    this.detener();
    this.modo = 'huracan';
    this.grupo.visible = true;
    this.tr = TRAYECTORIAS[oceano];
    this.cat0 = cat; this.u = 0; this.fuerza = 1; this.tocoTierra = false;
    this.afectados = new Map();
    this.disco.visible = true;
    const pts = this.tr.puntos.map(([lo, la]) => vec(lo, la, 0.03));
    const geo = new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(120));
    this.estela = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.008, gapSize: 0.006, transparent: true, opacity: 0.7 }));
    this.estela.computeLineDistances();
    this.estela.geometry.setDrawRange(0, 0);
    this.grupo.add(this.estela);
    this.cb.onInicio?.({ tipo: 'huracan', oceano: this.tr.nombre, cat });
  }

  // ---------- frente frío ----------
  frente() {
    this.detener();
    this.modo = 'frente';
    this.grupo.visible = true;
    this.lat = 32.5; this.afectados = new Map(); this.norte = false;
    this.frenteObj = new THREE.Group();
    const lons = []; for (let lo = -117.5; lo <= -86.5; lo += 0.5) lons.push(lo);
    this.lons = lons;
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lons.map((lo) => vec(lo, this.lat, 0.03))), new THREE.LineBasicMaterial({ color: 0x2f7dff }));
    this.frenteObj.add(linea);
    // triángulos azules que apuntan hacia donde avanza el aire frío (símbolo meteorológico)
    const tri = new THREE.Shape(); tri.moveTo(-0.006, 0); tri.lineTo(0.006, 0); tri.lineTo(0, -0.011); tri.closePath();
    const triGeo = new THREE.ShapeGeometry(tri), triMat = new THREE.MeshBasicMaterial({ color: 0x2f7dff, side: THREE.DoubleSide });
    this.triangulos = [];
    for (let k = 0; k < lons.length; k += 4) { const m = new THREE.Mesh(triGeo, triMat); this.frenteObj.add(m); this.triangulos.push([m, lons[k]]); }
    this.lineaFrente = linea;
    this.grupo.add(this.frenteObj);
    this.cb.onInicio?.({ tipo: 'frente' });
  }

  update(dt) {
    if (this.modo === 'huracan') this._updHuracan(dt);
    else if (this.modo === 'frente') this._updFrente(dt);
  }

  _updHuracan(dt) {
    this.u += dt / 14; // cruza en ~14 s
    const [lo, la] = interpolar(this.tr.puntos, this.u);
    const tierra = enTierra(lo, la);
    if (tierra && !this.tocoTierra) { this.tocoTierra = true; this.cb.onTierra?.({ lon: lo, lat: la }); }
    // sobre tierra pierde energía; sobre el mar recupera algo
    this.fuerza = tierra ? Math.max(0.15, this.fuerza - dt * 0.22) : Math.min(1, this.fuerza + dt * 0.05);
    const viento = (SAFFIR[this.cat0 - 1].min + 15) * this.fuerza;
    const cat = SAFFIR.filter((s) => viento >= s.min).at(-1)?.cat ?? 0;
    const p = vec(lo, la, 0.05);
    this.disco.position.set(p.x, p.y, 0.05);
    const tam = (0.11 + this.cat0 * 0.022) * (0.55 + 0.45 * this.fuerza);
    this.disco.scale.set(tam, tam, 1);
    this.disco.rotation.z += dt * (1.2 + viento / 90); // antihorario, visto desde arriba
    this.disco.material.opacity = 0.55 + 0.45 * this.fuerza;
    this.estela.geometry.setDrawRange(0, Math.floor(121 * Math.min(1, this.u)));
    // estados bajo la influencia: el radio de vientos y lluvia se encoge al debilitarse (≈250 km a ≈100 km)
    const radio = 100 + 150 * this.fuerza;
    for (const [id, e] of Object.entries(ESTADOS)) {
      const d = distanciaKm(la, lo, e.lat, e.lon);
      if (this.fuerza > 0.3 && d < radio && !this.afectados.has(id)) { this.afectados.set(id, cat); this.cb.onEstado?.({ id, nombre: e.nombre ?? id, cat, viento }); }
    }
    this.cb.onPaso?.({ viento, cat, tierra });
    if (this.u >= 1) { this.modo = 'fin'; this.disco.visible = false; this.cb.onFin?.({ tipo: 'huracan', afectados: [...this.afectados.keys()] }); }
  }

  _updFrente(dt) {
    this.lat -= dt * 1.25; // baja ~15° en 12 s
    const pts = this.lons.map((lo) => vec(lo, this.lat + Math.sin(lo * 0.25) * 0.4, 0.03));
    this.lineaFrente.geometry.setFromPoints(pts);
    for (const [m, lo] of this.triangulos) { const v = vec(lo, this.lat + Math.sin(lo * 0.25) * 0.4, 0.031); m.position.copy(v); }
    for (const [id, e] of Object.entries(ESTADOS)) {
      if (e.lat > this.lat && !this.afectados.has(id)) { this.afectados.set(id, true); this.cb.onEstado?.({ id, nombre: e.nombre ?? id }); }
    }
    // al cruzar la costa del Golfo, aparecen los «nortes»: flechas de viento hacia el sur
    if (!this.norte && this.lat < 22.5) {
      this.norte = true;
      const fl = new THREE.Shape(); fl.moveTo(-0.003, 0.02); fl.lineTo(0.003, 0.02); fl.lineTo(0.003, 0); fl.lineTo(0.008, 0); fl.lineTo(0, -0.012); fl.lineTo(-0.008, 0); fl.lineTo(-0.003, 0); fl.closePath();
      const mat = new THREE.MeshBasicMaterial({ color: 0xbfe3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      for (const [lo, la] of [[-97.2, 23.6], [-96.6, 21.6], [-95.6, 19.6], [-94.2, 18.9], [-92.4, 19.4]]) {
        const m = new THREE.Mesh(new THREE.ShapeGeometry(fl), mat); const v = vec(lo + 0.6, la, 0.035); m.position.copy(v); this.grupo.add(m); this.flechas.push(m);
      }
      this.cb.onNorte?.();
    }
    if (this.lat < 17.5) { this.modo = 'fin'; this.cb.onFin?.({ tipo: 'frente', afectados: [...this.afectados.keys()] }); }
  }
}
