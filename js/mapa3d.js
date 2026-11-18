// Construcción del mapa 3D de México. Todo vive en el plano XY con Z "hacia
// afuera del papel"; así el mismo grupo sirve en modo mesa y anclado al marcador AR.
import * as THREE from 'three';
import { proyectar, desproyectar, prepararEstados, MARCADOR_ASPECTO, KM_POR_UNIDAD } from './geo.js';

export const EXAG_PROF = 4; // exageración vertical de la profundidad bajo el mapa
import {
  ESTADOS, REGIONES, ZONAS_SISMICAS, BIOMAS, LIMITES_PLACAS, PLACAS, VOLCANES,
  EJE_NEOVOLCANICO, GEOSITIOS, ESPECIES, SENSORES, MUSEO,
} from './datos.js';
import { SITIOS } from './cultura.js';
import { LENGUA_ESTADOS } from './lenguas.js';
import { ORIGENES } from './sabores.js';

// Escala para el % de hablantes de lengua indígena (de menos a más)
export const ESCALA_LENGUAS = ['#f3e7c9', '#a9d8b8', '#3fa38a', '#2a6f86', '#1e3f73'];
export function colorLenguas(pct) {
  const t = Math.max(0, Math.min(1, Math.sqrt(pct / 31.2))); // raíz: distingue mejor los valores bajos
  const n = ESCALA_LENGUAS.length - 1, i = Math.min(n - 1, Math.floor(t * n));
  return new THREE.Color(ESCALA_LENGUAS[i]).lerp(new THREE.Color(ESCALA_LENGUAS[i + 1]), t * n - i).getStyle();
}
import { dibujarMarcador } from './marcador.js';

export function crearEtiqueta(texto, { tam = 0.022, color = '#fff', fondo = 'rgba(10,14,22,0.78)', borde = null, negrita = true, prioridad = 1 } = {}) {
  const lineas = String(texto).split('\n');
  const fs = 44;
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d');
  c.font = `${negrita ? '700' : '500'} ${fs}px system-ui, sans-serif`;
  const w = Math.max(...lineas.map((l) => c.measureText(l).width)) + fs * 0.9;
  const h = lineas.length * fs * 1.2 + fs * 0.5;
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  c.font = `${negrita ? '700' : '500'} ${fs}px system-ui, sans-serif`;
  if (fondo) {
    c.fillStyle = fondo;
    const r = fs * 0.4;
    c.beginPath();
    c.roundRect(0, 0, cv.width, cv.height, r);
    c.fill();
    if (borde) { c.strokeStyle = borde; c.lineWidth = 4; c.stroke(); }
  }
  c.fillStyle = color;
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  lineas.forEach((l, i) => c.fillText(l, cv.width / 2, fs * 0.25 + fs * 0.6 + i * fs * 1.2));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  const alto = tam * (h / (fs * 1.7));
  s.scale.set((alto * cv.width) / cv.height, alto, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 10;
  s.userData.etiqueta = true; // participa en el acomodo anti-encimado
  s.userData.prioridad = prioridad;
  s.userData.actualizarTexto = (nuevo) => {
    const n = crearEtiqueta(nuevo, { tam, color, fondo, borde, negrita });
    s.material.map.dispose();
    s.material.map = n.material.map;
    s.scale.copy(n.scale);
  };
  return s;
}

function emojiSprite(emoji, tam = 0.03) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#1f8a5a'; c.lineWidth = 6; c.stroke();
  c.font = '76px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  s.scale.set(tam, tam, 1);
  s.center.set(0.5, 0);
  return s;
}

// Volcán con perfil cóncavo (como los estratovolcanes reales), cráter en la
// cima, surcos de erosión y colores por piso de altitud: bosque, roca y nieve.
function geometriaVolcan(v, h) {
  const R = 0.006 + h * 0.5;
  const escudo = /escudo/i.test(v.tipo), escoria = /escoria/i.test(v.tipo);
  // "Ruido" periódico determinista: cada volcán tiene su propia forma irregular
  let semillaN = 0;
  for (const ch of v.nombre) semillaN = (semillaN * 31 + ch.charCodeAt(0)) % 9973;
  const rnd = (k) => { const x = Math.sin(semillaN * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const ondas = Array.from({ length: 6 }, (_, k) => ({ f: [2, 3, 5, 7, 11, 13][k], a: [0.04, 0.03, 0.022, 0.016, 0.012, 0.01][k], fase: rnd(k) * 6.28, giro: (rnd(k + 9) - 0.5) * 3 }));
  const ruido = (ang, t) => ondas.reduce((s, o) => s + o.a * Math.sin(o.f * ang + o.fase + o.giro * t), 0);

  // perfil: faldón que se funde con el suelo, laderas cóncavas, borde y fondo del cráter
  const perfil = [new THREE.Vector2(R * 1.18, 0), new THREE.Vector2(R * 1.06, h * 0.02)];
  const pasos = 22;
  for (let k = 1; k <= pasos; k++) {
    const t = 0.03 + (k / pasos) * 0.9;
    const forma = escudo ? Math.pow(1 - t, 0.55) : escoria ? 1 - t * 0.8 : Math.pow(1 - t, 1.4);
    perfil.push(new THREE.Vector2(Math.max(R * 0.12, R * forma + R * 0.12 * (1 - t)), t * h));
  }
  perfil.push(new THREE.Vector2(R * 0.115, h * 0.955), new THREE.Vector2(R * 0.075, h * 0.94), new THREE.Vector2(0.0001, h * 0.88));
  const geo = new THREE.LatheGeometry(perfil, 72);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cBos = new THREE.Color('#3d6a34'), cBos2 = new THREE.Color('#5a7a3a'), cPasto = new THREE.Color('#8a8455');
  const cRoca = new THREE.Color('#6e5a4c'), cOsc = new THREE.Color('#33261f'), cNieve = new THREE.Color('#f3f6fb');
  const c = new THREE.Color();
  const mezcla = (a, b, x) => c.copy(a).lerp(b, Math.max(0, Math.min(1, x)));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / h;
    const ang = Math.atan2(z, x);
    const n = ruido(ang, t);
    // barrancas radiales que se hacen más profundas a media ladera
    const barranca = 0.09 * Math.pow(Math.max(0, Math.sin(ang * 11 + n * 6)), 6) * Math.sin(Math.PI * Math.min(1, t * 1.1));
    const f = Math.max(0.6, 1 + n * (1 - t * 0.7) - barranca);
    pos.setX(i, x * f); pos.setZ(i, z * f);
    pos.setY(i, y * (1 + n * 0.25 * t * (1 - t)));
    // color por piso de altitud, con límites irregulares (no líneas rectas)
    const altM = v.alt * (0.3 + 0.7 * t) + n * 450;
    if (t > 0.935) mezcla(cOsc, cRoca, 0.25);
    else if (altM > 4750) mezcla(cRoca, cNieve, (altM - 4750) / 150);
    else if (altM > 3950) mezcla(cPasto, cRoca, (altM - 3950) / 400);
    else if (altM > 3300) mezcla(cBos2, cPasto, (altM - 3300) / 650);
    else mezcla(cBos, cBos2, (altM - 2200) / 1100);
    // las barrancas se ven más oscuras
    c.multiplyScalar(1 - barranca * 2.2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

const V = (lon, lat, z = 0) => {
  const [x, y] = proyectar(lon, lat);
  return new THREE.Vector3(x, y, z);
};

export class MapaMexico {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'MexicoVivo';
    this.estados = new Map();
    this.pickables = [];
    this.animables = [];
    this.capas = {};
    this.capa = 'estados';
    this.seleccion = null;
    this.hover = null;
    this.tiempo = 0;

    this._papel();
    this._estados();
    this._comun();
    this._tectonica();
    this._volcanes();
    this._biodiversidad();
    this._cultura();
    this._sabores();
    this.capas.clima = new THREE.Group();
    this.capas.sismo = new THREE.Group();
    this.capas.usgs = new THREE.Group();
    Object.values(this.capas).forEach((g) => this.root.add(g));
    this.setCapa('estados');
  }

  _papel() {
    const cv = dibujarMarcador(document.createElement('canvas'), 2048);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, color: 0x8a8f99 });
    this.papel = new THREE.Mesh(new THREE.PlaneGeometry(1, MARCADOR_ASPECTO), mat);
    this.papel.position.z = -0.0005;
    this.papel.receiveShadow = true;
    this.root.add(this.papel);
  }

  _estados() {
    this.grupoEstados = new THREE.Group();
    this.root.add(this.grupoEstados);
    const datos = prepararEstados(window.MX_GEO, 0.012);
    for (const e of datos) {
      const info = ESTADOS[e.id];
      if (!info) continue;
      const formas = e.poligonos.map((pol) => {
        const s = new THREE.Shape(pol[0].map(([lon, lat]) => new THREE.Vector2(...proyectar(lon, lat))));
        for (let i = 1; i < pol.length; i++) s.holes.push(new THREE.Path(pol[i].map(([lon, lat]) => new THREE.Vector2(...proyectar(lon, lat)))));
        return s;
      });
      const geo = new THREE.ExtrudeGeometry(formas, { depth: 1, bevelEnabled: false, curveSegments: 1 });
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.62, metalness: 0.05, emissive: 0x000000 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.scale.z = 0.001;
      // contorno superior
      e.poligonos.forEach((pol) => {
        const pts = pol[0].map(([lon, lat]) => V(lon, lat, 1.001));
        const linea = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x0b0f17, transparent: true, opacity: 0.55 }),
        );
        mesh.add(linea);
      });
      mesh.userData = { tipo: 'estado', id: e.id, nombre: e.nombre, info };
      const reg = {
        id: e.id, nombre: e.nombre, info, mesh,
        color: new THREE.Color('#888'), colorObj: new THREE.Color('#888'),
        altura: 0.001, alturaObj: 0.012, sacudida: 0, offset: new THREE.Vector3(),
      };
      this.estados.set(e.id, reg);
      this.grupoEstados.add(mesh);
      this.pickables.push(mesh);
    }
  }

  alturaEn(id) {
    const r = this.estados.get(id);
    return r ? r.altura : 0.012;
  }

  _comun() {
    const g = new THREE.Group();
    this.capas.comun = g;
    // Pin del museo
    const pin = new THREE.Group();
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0xffd34d }));
    palo.rotation.x = Math.PI / 2;
    palo.position.z = 0.025;
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x8a5a00, emissiveIntensity: 0.6 }));
    bola.position.z = 0.052;
    pin.add(palo, bola);
    const lbl = crearEtiqueta('★ Museo El Rehilete', { prioridad: 10, tam: 0.017, color: '#1a1200', fondo: 'rgba(255,205,60,0.95)' });
    lbl.position.z = 0.062;
    pin.add(lbl);
    pin.position.copy(V(MUSEO.lon, MUSEO.lat, 0));
    pin.userData.base = 0.03;
    this.pinMuseo = pin;
    bola.userData = { tipo: 'museo' };
    this.pickables.push(bola);
    g.add(pin);
    this.animables.push((t) => { bola.position.z = 0.052 + Math.sin(t * 3) * 0.003; });
  }

  _tubo(puntos, radio, material, z = 0.05) {
    const curva = new THREE.CatmullRomCurve3(puntos.map(([lon, lat]) => V(lon, lat, z)), false, 'catmullrom', 0.3);
    return new THREE.Mesh(new THREE.TubeGeometry(curva, puntos.length * 12, radio, 6, false), material);
  }

  _tectonica() {
    const g = new THREE.Group();
    this.capas.tectonica = g;
    const colores = { subduccion: 0xff3b3b, transformante: 0x3ad1ff, divergente: 0xffd23a };
    for (const lim of LIMITES_PLACAS) {
      const mat = new THREE.MeshStandardMaterial({ color: colores[lim.tipo], emissive: colores[lim.tipo], emissiveIntensity: 0.6 });
      const tubo = this._tubo(lim.puntos, 0.0022, mat, 0.004);
      tubo.userData = { tipo: 'limite', data: lim };
      this.pickables.push(tubo);
      g.add(tubo);
      if (lim.tipo === 'subduccion') {
        // "dientes" triangulares apuntando a la placa que cabalga (convención geológica)
        const curva = new THREE.CatmullRomCurve3(lim.puntos.map(([lon, lat]) => V(lon, lat, 0.004)));
        for (let i = 1; i < 26; i++) {
          const u = i / 26;
          const p = curva.getPointAt(u);
          const tg = curva.getTangentAt(u);
          const diente = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.009, 3), mat);
          diente.position.copy(p);
          const normal = new THREE.Vector3(-tg.y, tg.x, 0).normalize(); // hacia el continente
          diente.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
          diente.position.addScaledVector(normal, 0.004);
          g.add(diente);
        }
      }
    }
    for (const pl of PLACAS) {
      const lbl = crearEtiqueta(pl.nombre + (pl.mov ? `\n${pl.mov.cm} cm/año` : ''), { prioridad: 5, tam: 0.014, color: '#e9f6ff', fondo: 'rgba(8,30,48,0.82)', borde: '#3ad1ff' });
      lbl.position.copy(V(pl.lon, pl.lat, 0.02));
      g.add(lbl);
      if (pl.mov) {
        const ang = ((90 - pl.mov.dir) * Math.PI) / 180;
        const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
        const largo = 0.025 + pl.mov.cm * 0.006;
        const flecha = new THREE.ArrowHelper(dir, V(pl.lon, pl.lat - 0.9, 0.01), largo, 0xffffff, 0.012, 0.009);
        flecha.line.material.linewidth = 2;
        g.add(flecha);
        const base = flecha.position.clone();
        this.animables.push((t) => {
          if (!g.visible) return;
          const f = (t * 0.5) % 1;
          flecha.position.copy(base).addScaledVector(dir, f * 0.015);
          flecha.cone.material.opacity = 1;
        });
      }
    }
    this._placaCocos();
    // sensores de alerta
    this.grupoSensores = new THREE.Group();
    const geoS = new THREE.OctahedronGeometry(0.004);
    for (const s of SENSORES) {
      const m = new THREE.Mesh(geoS, new THREE.MeshStandardMaterial({ color: 0x9ef0ff, emissive: 0x1b8fb0, emissiveIntensity: 0.8 }));
      m.position.copy(V(s.lon, s.lat, 0.05));
      m.userData = { tipo: 'sensor', data: s, z0: 0.05 };
      this.pickables.push(m);
      this.grupoSensores.add(m);
    }
    this.animables.push((t) => this.grupoSensores.children.forEach((m, i) => { m.rotation.z = t + i; }));
    g.add(this.grupoSensores);
  }

  // Superficie de la placa de Cocos hundiéndose bajo México (geometría esquemática).
  // Bajo Guerrero la placa viaja casi horizontal ~50 km antes de hundirse
  // (losa plana; Pérez-Campos et al., 2008). Profundidad exagerada ×EXAG_PROF.
  _placaCocos() {
    const g = new THREE.Group();
    this.capas.subsuelo = g;
    const fosa = LIMITES_PLACAS[0].puntos.filter(([lon]) => lon > -105.5);
    const curva = new THREE.CatmullRomCurve3(fosa.map(([lon, lat]) => V(lon, lat, 0)));
    const plana = [[0, 6], [60, 20], [120, 40], [160, 48], [280, 50], [320, 60], [360, 90], [420, 140], [470, 180]];
    const normal = [[0, 6], [60, 20], [120, 40], [200, 80], [280, 120], [360, 160], [470, 210]];
    const interp = (perfil, d) => {
      for (let i = 1; i < perfil.length; i++) {
        if (d <= perfil[i][0]) {
          const [d0, z0] = perfil[i - 1], [d1, z1] = perfil[i];
          return z0 + ((d - d0) / (d1 - d0)) * (z1 - z0);
        }
      }
      return perfil.at(-1)[1];
    };
    const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const NU = 70, NV = 24, DMAX = 470;
    const pos = [], col = [], idx = [];
    const cSom = new THREE.Color('#ff9a3a'), cProf = new THREE.Color('#3a5bff'), tmp = new THREE.Color();
    for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      const p = curva.getPointAt(u);
      const tg = curva.getTangentAt(u);
      const nrm = new THREE.Vector3(-tg.y, tg.x, 0).normalize(); // hacia el continente
      const [lon] = desproyectar(p.x, p.y);
      const w = suave(-103.5, -101.5, lon) * (1 - suave(-97.5, -95.5, lon)); // 1 = losa plana
      for (let j = 0; j <= NV; j++) {
        const d = (j / NV) * DMAX;
        const prof = w * interp(plana, d) + (1 - w) * interp(normal, d);
        const q = p.clone().addScaledVector(nrm, d / KM_POR_UNIDAD);
        pos.push(q.x, q.y, -(prof / KM_POR_UNIDAD) * EXAG_PROF);
        tmp.copy(cSom).lerp(cProf, Math.min(1, prof / 200));
        col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j, b = a + NV + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const losa = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.8, roughness: 0.7, depthWrite: false,
    }));
    losa.userData = { tipo: 'placa' };
    this.pickables.push(losa);
    g.add(losa);
    // malla de referencia cada 50 km de profundidad
    const lineas = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }));
    g.add(lineas);
    const lbl = (txt, lon, lat, prof) => {
      const s = crearEtiqueta(txt, { tam: 0.013, color: '#dfe8ff', fondo: 'rgba(20,30,80,0.8)', negrita: false });
      s.position.copy(V(lon, lat, -(prof / KM_POR_UNIDAD) * EXAG_PROF));
      g.add(s);
    };
    lbl('Placa de Cocos bajo México', -99.6, 16.9, 15);
    lbl('Losa plana ~50 km', -99.3, 18.6, 50);
    lbl('~100 km: nace el magma', -98.9, 19.6, 100);
    lbl('Profundidad ×4', -94.5, 16.4, 120);
  }

  setSubsuelo(on) {
    this.subsueloActivo = on;
    this.capas.subsuelo.visible = on && this.capa === 'tectonica';
    const ver = on && this.capa === 'tectonica';
    this.papel.material.transparent = ver;
    this.papel.material.opacity = ver ? 0.35 : 1;
    this.papel.material.depthWrite = !ver;
    for (const r of this.estados.values()) {
      r.mesh.material.transparent = ver;
      r.mesh.material.opacity = ver ? 0.55 : 1;
      r.mesh.material.depthWrite = !ver;
      r.mesh.material.needsUpdate = true;
    }
    this.papel.material.needsUpdate = true;
  }

  _volcanes() {
    const g = new THREE.Group();
    this.capas.volcanes = g;
    const eje = this._tubo(EJE_NEOVOLCANICO, 0.014, new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.18, depthWrite: false }), 0.012);
    eje.userData = { tipo: 'eje' };
    this.pickables.push(eje);
    g.add(eje);
    const lblEje = crearEtiqueta('Eje Neovolcánico Transversal', { prioridad: 0.5, tam: 0.016, color: '#ffd1a8', fondo: 'rgba(60,20,0,0.75)' });
    lblEje.position.copy(V(-100.3, 20.5, 0.05));
    g.add(lblEje);

    this.volcanes = [];
    for (const v of VOLCANES) {
      const h = 0.005 + (v.alt / 5636) * 0.022; // altura discreta: realista sin tapar el mapa
      const grupo = new THREE.Group();
      const cono = new THREE.Mesh(geometriaVolcan(v, h), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
      cono.rotation.x = Math.PI / 2;
      // el Iztaccíhuatl es una sierra alargada de norte a sur ("la mujer dormida")
      if (v.nombre === 'Iztaccíhuatl') cono.scale.set(0.8, 0.85, 2.1);
      cono.castShadow = true;
      grupo.add(cono);
      const lbl = crearEtiqueta(v.nombre.split(' (')[0], { prioridad: 2 + v.alt / 2000, tam: 0.0075, color: '#ffe3cc', fondo: 'rgba(40,12,0,0.7)', negrita: false });
      lbl.position.z = h + 0.004;
      grupo.add(lbl);
      grupo.position.copy(V(v.lon, v.lat, 0));
      cono.userData = { tipo: 'volcan', data: v };
      this.pickables.push(cono);
      g.add(grupo);
      const reg = { v, grupo, h, humo: null, erupcion: null, lbl };
      if (v.activo) reg.humo = this._humo(grupo, h);
      this.volcanes.push(reg);
    }

    for (const s of GEOSITIOS) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.012, 6), new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.4, metalness: 0.3, flatShading: true }));
      m.rotation.x = Math.PI / 2;
      m.position.copy(V(s.lon, s.lat, 0.04));
      m.userData = { tipo: 'geositio', data: s };
      const lbl = crearEtiqueta('⬡ ' + s.nombre, { prioridad: s.nombre.startsWith('Prismas') ? 4 : 2, tam: 0.012, color: '#e7f1ff', fondo: 'rgba(20,30,60,0.8)', negrita: false });
      lbl.position.copy(m.position).add(new THREE.Vector3(0, 0, 0.01));
      this.pickables.push(m);
      g.add(m, lbl);
    }
  }

  _humo(grupo, h, n = 40) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vida = new Float32Array(n);
    for (let i = 0; i < n; i++) vida[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xcfcfcf, size: 0.004, transparent: true, opacity: 0.55, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    grupo.add(pts);
    const anim = (t, dt) => {
      if (!pts.parent?.parent?.visible) return;
      for (let i = 0; i < n; i++) {
        vida[i] += dt * 0.25;
        if (vida[i] > 1) vida[i] -= 1;
        const v = vida[i];
        const a = i * 2.399;
        pos[i * 3] = Math.cos(a) * v * 0.006 + v * 0.012;
        pos[i * 3 + 1] = Math.sin(a) * v * 0.006;
        pos[i * 3 + 2] = h + v * 0.028;
      }
      geo.attributes.position.needsUpdate = true;
    };
    this.animables.push(anim);
    return pts;
  }

  erupcion(reg) {
    const n = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.25;
      vel.push(new THREE.Vector3(Math.cos(a) * r * 0.08, Math.sin(a) * r * 0.08, 0.05 + Math.random() * 0.08));
      pos[i * 3 + 2] = reg.h;
      const lava = Math.random() < 0.55;
      col.set(lava ? [1, 0.25 + Math.random() * 0.4, 0.05] : [0.35, 0.33, 0.32], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.0045, vertexColors: true, transparent: true, depthWrite: false }));
    reg.grupo.add(pts);
    const luz = new THREE.PointLight(0xff5a1a, 2, 0.12);
    luz.position.z = reg.h + 0.01;
    reg.grupo.add(luz);
    let vidaT = 0;
    const anim = (t, dt) => {
      vidaT += dt;
      for (let i = 0; i < n; i++) {
        const v = vel[i];
        v.z -= 0.16 * dt;
        pos[i * 3] += v.x * dt;
        pos[i * 3 + 1] += v.y * dt;
        pos[i * 3 + 2] = Math.max(0.002, pos[i * 3 + 2] + v.z * dt);
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.opacity = Math.max(0, 1 - vidaT / 5);
      luz.intensity = Math.max(0, 2 * (1 - vidaT / 2.5)) * (0.7 + Math.random() * 0.3);
      if (vidaT > 5) {
        reg.grupo.remove(pts, luz);
        geo.dispose();
        return false;
      }
    };
    this.animables.push(anim);
  }

  _biodiversidad() {
    const g = new THREE.Group();
    this.capas.biodiversidad = g;
    this.especies = [];
    for (const e of ESPECIES) {
      const s = emojiSprite(e.emoji, 0.03);
      s.position.copy(V(e.lon, e.lat, 0.03));
      s.userData = { tipo: 'especie', data: e };
      this.pickables.push(s);
      g.add(s);
      const fase = Math.random() * 6;
      this.animables.push((t) => { s.position.z = 0.03 + Math.sin(t * 2 + fase) * 0.003; });
      this.especies.push(s);
    }
  }

  // Sitios de cultura e historia: pirámides escalonadas (prehispánicos),
  // templos con cúpula (virreinales) y estrellas (historia moderna).
  _cultura() {
    const g = new THREE.Group();
    this.capas.cultura = g;
    this.sitios = [];
    const piedra = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.85 });
    const cantera = new THREE.MeshStandardMaterial({ color: 0xe0b9a0, roughness: 0.7 });
    const oro = new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x7a5200, emissiveIntensity: 0.5 });
    const piedraOsc = new THREE.MeshStandardMaterial({ color: 0xb09a72, roughness: 0.9 });
    const escalera = new THREE.MeshStandardMaterial({ color: 0x8f7b58, roughness: 0.9 });
    const techo = new THREE.MeshStandardMaterial({ color: 0x9b3d2a, roughness: 0.7 });
    const azulejo = new THREE.MeshStandardMaterial({ color: 0x2f6fb5, roughness: 0.35, metalness: 0.1 });
    for (const s of SITIOS) {
      const m = new THREE.Group();
      // tronco de pirámide cuadrado (talud) con eje vertical en Z
      const talud = (abajo, arriba, alto, z, mat) => {
        const geo = new THREE.CylinderGeometry(arriba * Math.SQRT1_2, abajo * Math.SQRT1_2, alto, 4, 1);
        geo.rotateY(Math.PI / 4);
        geo.rotateX(Math.PI / 2);
        const t = new THREE.Mesh(geo, mat);
        t.position.z = z + alto / 2;
        t.castShadow = true;
        return t;
      };
      const caja = (x, y, z, sx, sy, sz, mat) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        b.position.set(x, y, z + sz / 2);
        b.castShadow = true;
        return b;
      };
      if (s.tipo === 'arqueologico') {
        // pirámide mesoamericana: 4 cuerpos en talud, escalinata al frente y templo
        let z = 0;
        const cuerpos = [[0.012, 0.0102], [0.0096, 0.0080], [0.0074, 0.0060], [0.0054, 0.0042]];
        cuerpos.forEach(([a, b], k) => { m.add(talud(a, b, 0.0024, z, k % 2 ? piedraOsc : piedra)); z += 0.0024; });
        // escalinata inclinada en la cara sur
        const esc = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0012, 0.011), escalera);
        esc.position.set(0, -0.0042, z / 2);
        esc.rotation.x = -0.62;
        m.add(esc);
        m.add(caja(0, 0, z, 0.0034, 0.003, 0.0024, cantera));
        m.add(talud(0.0044, 0.0008, 0.0016, z + 0.0024, techo));
      } else if (s.tipo === 'virreinal') {
        // templo virreinal: nave, fachada, dos torres con remate y cúpula de azulejo
        m.add(caja(0, 0.001, 0, 0.0062, 0.012, 0.0056, cantera));
        for (const x of [-0.0036, 0.0036]) {
          m.add(caja(x, -0.0052, 0, 0.0026, 0.0026, 0.0098, cantera));
          m.add(talud(0.0026, 0.0004, 0.0026, 0.0098, techo));
        }
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), azulejo);
        cup.rotation.x = Math.PI / 2;
        cup.position.set(0, 0.0032, 0.0056);
        const linterna = caja(0, 0.0032, 0.0082, 0.0009, 0.0009, 0.0016, cantera);
        m.add(cup, linterna);
      } else {
        // columna conmemorativa con figura dorada
        m.add(caja(0, 0, 0, 0.0062, 0.0062, 0.0018, cantera));
        m.add(caja(0, 0, 0.0018, 0.0042, 0.0042, 0.0016, cantera));
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0013, 0.012, 14), cantera);
        col.rotation.x = Math.PI / 2;
        col.position.z = 0.0034 + 0.006;
        const figura = new THREE.Mesh(new THREE.OctahedronGeometry(0.0022), oro);
        figura.scale.set(1, 1, 1.5);
        figura.position.z = 0.0034 + 0.012 + 0.0024;
        m.add(col, figura);
        this.animables.push((t) => { if (g.visible) figura.rotation.z = t * 1.2; });
      }
      const zona = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.02), new THREE.MeshBasicMaterial({ visible: false }));
      zona.position.z = 0.01;
      zona.userData = { tipo: 'sitio', data: s };
      m.add(zona);
      this.pickables.push(zona);
      const lbl = crearEtiqueta(s.nombre, { prioridad: (['tula', 'realdelmonte', 'tembleque', 'pachuca'].includes(s.id) ? 5 : 2) + (s.unesco ? 1 : 0), tam: 0.011, color: '#fff3dc', fondo: 'rgba(60,30,10,0.78)', negrita: false });
      lbl.position.z = 0.03;
      m.add(lbl);
      m.position.copy(V(s.lon, s.lat, 0.012));
      m.userData.sitio = s;
      g.add(m);
      this.sitios.push({ s, m, lbl, objetivo: 1, actual: 1 });
    }
    this.animables.push((t, dt) => {
      if (!g.visible) return;
      for (const r of this.sitios) {
        r.actual += (r.objetivo - r.actual) * Math.min(1, dt * 6);
        r.m.scale.setScalar((0.35 + 0.65 * r.actual) * 1.5);
        r.lbl.visible = r.actual > 0.6;
        r.m.position.z = 0.012 + (r.objetivo > 0.5 ? Math.sin(t * 2 + r.s.lat) * 0.0015 : 0);
      }
    });
  }

  // Sitios con evidencia arqueológica de alimentos: una vasija de barro con
  // el color del alimento encima (mazorca, calabaza, chile o cacao estilizados).
  _sabores() {
    const g = new THREE.Group();
    this.capas.sabores = g;
    const barro = new THREE.MeshStandardMaterial({ color: 0xa8603a, roughness: 0.85 });
    const bordeMat = new THREE.MeshStandardMaterial({ color: 0x7d4227, roughness: 0.9 });
    for (const o of ORIGENES) {
      const m = new THREE.Group();
      // vasija: perfil torneado
      const perfil = [[0.0001, 0], [0.004, 0.0004], [0.0062, 0.003], [0.0064, 0.0055], [0.0048, 0.0085], [0.0042, 0.0098], [0.0052, 0.0108]]
        .map(([r, z]) => new THREE.Vector2(r, z));
      const vasija = new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), barro);
      vasija.rotation.x = Math.PI / 2;
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.0047, 0.0007, 8, 24), bordeMat);
      aro.position.z = 0.0105;
      // el alimento: forma alargada (maíz, chile, cacao) o redonda (calabaza)
      const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.55 });
      const fruto = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 16, 12), mat);
      const forma = { Maíz: [0.75, 0.75, 2.2], Calabaza: [1.25, 1.25, 1], Chile: [0.6, 0.6, 2.4], Cacao: [0.95, 0.95, 1.7] }[o.alimento] || [1, 1, 1];
      fruto.scale.set(...forma);
      fruto.position.z = 0.012 + 0.0034 * forma[2] * 0.7;
      if (o.alimento === 'Chile') fruto.rotation.y = 0.5;
      m.add(vasija, aro, fruto);
      const zona = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.03), new THREE.MeshBasicMaterial({ visible: false }));
      zona.position.z = 0.014;
      zona.userData = { tipo: 'origen', data: o };
      m.add(zona);
      this.pickables.push(zona);
      const lbl = crearEtiqueta(`${o.alimento}\n${o.nombre}`, { prioridad: 3, tam: 0.016, color: '#fff6e6', fondo: 'rgba(90,40,15,0.82)', negrita: false });
      lbl.position.z = 0.032;
      m.add(lbl);
      m.position.copy(V(o.lon, o.lat, 0.012));
      m.scale.setScalar(1.4);
      g.add(m);
      const fase = o.lat;
      this.animables.push((t) => { if (g.visible) fruto.rotation.z = Math.sin(t * 1.5 + fase) * 0.25; });
    }
  }

  // Resalta los sitios que existían en el año elegido (null = todos)
  setAnio(anio) {
    for (const r of this.sitios || []) r.objetivo = anio === null || (anio >= r.s.desde && anio <= r.s.hasta) ? 1 : 0;
  }

  // ------------------------------------------------------------------
  setCapa(capa) {
    this.capa = capa;
    const vis = {
      estados: ['comun'],
      tectonica: ['comun', 'tectonica', 'sismo', 'usgs'],
      volcanes: ['comun', 'volcanes'],
      biodiversidad: ['comun', 'biodiversidad'],
      clima: ['comun', 'clima'],
      historia: ['comun', 'cultura'], // el grupo «cultura» contiene los sitios históricos
      cultura: ['comun'],
      lenguas: ['comun'],
      sabores: ['comun', 'sabores'],
    }[capa];
    Object.entries(this.capas).forEach(([k, g]) => { g.visible = vis.includes(k); });
    this.setSubsuelo(this.subsueloActivo ?? true);
    for (const r of this.estados.values()) {
      const { info } = r;
      let color = '#888', h = 0.012;
      switch (capa) {
        case 'estados':
          color = REGIONES[info.region].color;
          h = r.id === 'MX-HID' ? 0.032 : 0.012;
          if (r.id === 'MX-HID') color = '#f2b21b';
          break;
        case 'tectonica':
          color = ZONAS_SISMICAS[info.zona].color;
          h = ZONAS_SISMICAS[info.zona].altura;
          break;
        case 'volcanes':
          color = '#9a8a68';
          h = 0.006;
          break;
        case 'biodiversidad':
          color = BIOMAS[info.bioma].color;
          h = 0.01;
          break;
        case 'clima':
          color = r.climaColor || '#5a6b80';
          h = r.climaAltura ?? 0.01;
          break;
        case 'historia':
          color = r.id === 'MX-HID' ? '#e0a21b' : '#b98a5e';
          h = 0.012;
          break;
        case 'lenguas': {
          const d = LENGUA_ESTADOS[r.id];
          color = d ? colorLenguas(d.pct2020) : '#666';
          h = d ? 0.004 + (d.pct2020 / 31.2) * 0.045 : 0.004;
          break;
        }
        case 'sabores':
          // tono neutro: los sitios son puntos, no estados «de origen»
          color = '#c7ab84';
          h = 0.008;
          break;
        case 'cultura':
          // tonos por región: recuerda que cada tradición es de una región, no de un estado
          color = new THREE.Color(REGIONES[info.region].color).lerp(new THREE.Color('#e2b8a0'), 0.35).getStyle();
          h = r.id === 'MX-HID' ? 0.02 : 0.011;
          break;
      }
      r.colorObj.set(color);
      r.alturaObj = h;
    }
  }

  setClimaEstado(id, color, altura) {
    const r = this.estados.get(id);
    if (!r) return;
    r.climaColor = color;
    r.climaAltura = altura;
    if (this.capa === 'clima') { r.colorObj.set(color); r.alturaObj = altura; }
  }

  seleccionar(id) {
    this.seleccion = id;
  }

  setHover(id) {
    this.hover = id;
  }

  // dt en segundos
  update(dt) {
    this.tiempo += dt;
    const t = this.tiempo;
    const k = 1 - Math.pow(0.0015, dt);
    for (const r of this.estados.values()) {
      const sel = r.id === this.seleccion;
      const hov = r.id === this.hover;
      const objetivo = r.alturaObj * (sel ? 1.8 : 1) + (hov ? 0.004 : 0);
      r.altura += (objetivo - r.altura) * k;
      r.mesh.scale.z = Math.max(0.0005, r.altura);
      r.color.lerp(r.colorObj, k);
      r.mesh.material.color.copy(r.color);
      const em = sel ? 0.28 + Math.sin(t * 4) * 0.08 : hov ? 0.14 : 0;
      r.mesh.material.emissive.copy(r.color).multiplyScalar(em);
      // sacudida sísmica
      if (r.sacudida > 0.0001) {
        const a = r.sacudida;
        r.mesh.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, 0);
        r.sacudida *= Math.pow(0.15, dt);
      } else if (r.mesh.position.lengthSq() > 0) r.mesh.position.set(0, 0, 0);
    }
    const hid = this.estados.get('MX-HID');
    if (hid) this.pinMuseo.position.z = hid.altura;
    this.animables = this.animables.filter((fn) => fn(t, dt) !== false);
  }

  // Acomodo de etiquetas: si dos etiquetas se enciman en pantalla, se oculta
  // la de menor prioridad. Se llama unas 8 veces por segundo desde app.js.
  ordenarEtiquetas(cam, W, H) {
    const lista = [];
    this.root.traverseVisible((o) => { if (o.isSprite && o.userData.etiqueta) lista.push(o); });
    lista.sort((a, b) => b.userData.prioridad - a.userData.prioridad);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), esc = new THREE.Vector3();
    const arriba = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).normalize();
    const ocupado = [];
    for (const s of lista) {
      s.getWorldPosition(p);
      s.getWorldScale(esc);
      q.copy(p).addScaledVector(arriba, esc.y);
      p.project(cam); q.project(cam);
      if (p.z > 1) { s.material.opacity = 0; continue; }
      const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
      const h = Math.abs(((-q.y * 0.5 + 0.5) * H) - y);
      const w = h * (esc.x / esc.y);
      const r = { a: x - w / 2 - 2, b: y - h - 2, c: x + w / 2 + 2, d: y + 2 };
      const choca = ocupado.some((o) => r.a < o.c && r.c > o.a && r.b < o.d && r.d > o.b);
      s.material.opacity = choca ? 0 : 1;
      if (!choca) ocupado.push(r);
    }
  }

  // altura "del terreno" en un punto (aprox. usando el estado bajo el punto)
  superficie() {
    let max = 0;
    for (const r of this.estados.values()) max = Math.max(max, r.altura);
    return max;
  }
}

export { V as vec };
