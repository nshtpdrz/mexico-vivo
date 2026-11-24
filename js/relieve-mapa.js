// Relieve real en el mapa del país: cada volcán y cada maravilla natural montañosa se dibuja con su
// modelo digital de elevación (data/relieve/<id>.json, de Terrain Tiles de AWS: SRTM, GMTED…).
// Forma, cráter, barrancas y tamaño son los reales; para que se lean a la escala del país, todo el
// modelo se agranda ESCALA_H veces y la altura, además, EXAGERACION_V veces (el mismo factor para
// todos, así se comparan bien entre sí). El borde se funde con el mapa para que no parezca una loseta.
import * as THREE from 'three';
import { proyectar, KM_POR_UNIDAD } from './geo.js';

export const ESCALA_H = 2;        // tamaño horizontal ×2
export const EXAGERACION_V = 4;   // y la altura ×4 sobre eso (×8 respecto a la realidad)

const cache = new Map();
export function cargarDEM(id) {
  if (!cache.has(id)) cache.set(id, fetch(`data/relieve/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(id);
}

// altura (m) en lon/lat con interpolación bilineal
export function muestrear(dem, lon, lat) {
  const { n, lat0, lat1, lon0, lon1, z } = dem;
  const fx = ((lon - lon0) / (lon1 - lon0)) * (n - 1);
  const fy = ((lat1 - lat) / (lat1 - lat0)) * (n - 1);
  if (fx < 0 || fy < 0 || fx > n - 1 || fy > n - 1) return null;
  const x0 = Math.min(n - 2, Math.floor(fx)), y0 = Math.min(n - 2, Math.floor(fy));
  const tx = fx - x0, ty = fy - y0;
  const a = z[y0 * n + x0], b = z[y0 * n + x0 + 1], c = z[(y0 + 1) * n + x0], d = z[(y0 + 1) * n + x0 + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

// pisos de vegetación por altitud real (como en el visor de relieve)
const PISOS = [
  [4800, '#f4ecdc'], // nieve y glaciar
  [4250, '#8f7a66'], // roca y arena volcánica
  [3800, '#b7a56e'], // pastizal alpino
  [2800, '#4f6b3f'], // bosque de pino y oyamel
  [2200, '#6b8350'], // bosque de encino
  [1200, '#a39a62'], // matorral y cultivos
  [-500, '#c2ad7c'], // tierras bajas, desierto
];
const colorPiso = (m, c) => { for (const [h, col] of PISOS) if (m >= h) return c.set(col); return c.set(PISOS.at(-1)[1]); };

/**
 * Malla de relieve circular centrada en (lon, lat) con radio `radioGrados`.
 * Coordenadas locales: x = este, y = arriba, z = sur (la malla se acuesta con rotation.x = π/2, como los conos).
 * Devuelve { geometria, alturaEn(lon, lat) en unidades del mapa, alturaMax }.
 */
export function geometriaRelieve(dem, lon, lat, radioGrados, { anillos = 30, sectores = 96 } = {}) {
  const [cx, cy] = proyectar(lon, lat);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  // base: el terreno «de alrededor» (percentil 12 del disco), para que el modelo se levante del mapa
  const vals = [];
  for (let k = 0; k < 400; k++) {
    const a = (k / 400) * Math.PI * 2 * 7, r = Math.sqrt((k + 0.5) / 400) * radioGrados;
    const m = muestrear(dem, lon + (Math.cos(a) * r) / cosLat, lat + Math.sin(a) * r);
    if (m != null) vals.push(m);
  }
  vals.sort((a, b) => a - b);
  const base = vals[Math.floor(vals.length * 0.12)] ?? 0;
  const kmAUnidad = (km) => (km / KM_POR_UNIDAD) * ESCALA_H * EXAGERACION_V;
  const pos = [], col = [], alt = [], idx = [];
  const c = new THREE.Color();
  const ventana = (t) => (t < 0.72 ? 1 : 1 - THREE.MathUtils.smoothstep(t, 0.72, 1)); // orilla que se funde
  const alturaPunto = (lo, la, t) => {
    const m = muestrear(dem, lo, la) ?? base;
    return { m, h: Math.max(0, kmAUnidad((m - base) / 1000)) * ventana(t) };
  };
  // centro
  {
    const { m, h } = alturaPunto(lon, lat, 0);
    pos.push(0, h, 0); colorPiso(m, c); col.push(c.r, c.g, c.b, 1); alt.push(m);
  }
  for (let i = 1; i <= anillos; i++) {
    const t = i / anillos;
    for (let j = 0; j < sectores; j++) {
      const a = (j / sectores) * Math.PI * 2;
      const dLon = (Math.cos(a) * t * radioGrados) / cosLat, dLat = Math.sin(a) * t * radioGrados;
      const lo = lon + dLon, la = lat + dLat;
      const { m, h } = alturaPunto(lo, la, t);
      const [px, py] = proyectar(lo, la);
      pos.push((px - cx) * ESCALA_H, h, -(py - cy) * ESCALA_H);
      colorPiso(m, c);
      // nieve: solo donde de verdad hay (y menos en laderas que dan al sur, como en la realidad)
      if (m > 4600 && m <= 4800 && Math.sin(a) > 0.2) c.set('#f4ecdc');
      // la orilla se vuelve transparente: el relieve brota del estado, sin disco visible
      col.push(c.r, c.g, c.b, 1 - THREE.MathUtils.smoothstep(t, 0.7, 0.98)); alt.push(m);
    }
  }
  // triángulos: abanico central + anillos
  for (let j = 0; j < sectores; j++) idx.push(0, 1 + ((j + 1) % sectores), 1 + j);
  for (let i = 1; i < anillos; i++) {
    const a0 = 1 + (i - 1) * sectores, a1 = 1 + i * sectores;
    for (let j = 0; j < sectores; j++) {
      const j1 = (j + 1) % sectores;
      idx.push(a0 + j, a0 + j1, a1 + j, a0 + j1, a1 + j1, a1 + j);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setAttribute('alturaM', new THREE.Float32BufferAttribute(alt, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // las caras deben mirar hacia arriba (y+); si el orden de los vértices quedó al revés, se invierte
  if (geo.attributes.normal.getY(0) < 0) {
    for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  let alturaMax = 0;
  for (let i = 1; i < pos.length; i += 3) alturaMax = Math.max(alturaMax, pos[i]);
  // altura (unidades del mapa) en un punto, y la cima más alta cerca de él (para poner humo y etiqueta)
  const alturaEn = (lo, la, radioBusca = 0.03) => {
    let mejor = 0;
    for (let k = 0; k < 60; k++) {
      const a = k * 2.4, r = Math.sqrt(k / 60) * radioBusca;
      const p = muestrear(dem, lo + (Math.cos(a) * r) / cosLat, la + Math.sin(a) * r);
      if (p != null) mejor = Math.max(mejor, p);
    }
    const t = Math.hypot((lo - lon) * cosLat, la - lat) / radioGrados;
    return Math.max(0, kmAUnidad((mejor - base) / 1000)) * ventana(Math.min(1, t));
  };
  return { geometria: geo, alturaEn, alturaMax, base };
}
