// Proyección y utilidades geográficas compartidas por el mapa 3D y el marcador AR.
// Unidad del mundo 3D: 1 = ancho del marcador impreso.

export const LON0 = -102.5;
export const LAT0 = 23.55;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);
export const ESCALA = 0.9 / (32 * COS0); // unidades por grado
export const MARCADOR_ASPECTO = 0.64; // alto / ancho del marcador
export const KM_POR_UNIDAD = 111.2 / ESCALA;

// lon/lat -> [x, y] en unidades del marcador (centro = 0,0; y hacia el norte)
export function proyectar(lon, lat) {
  return [(lon - LON0) * COS0 * ESCALA, (lat - LAT0) * ESCALA];
}

export function desproyectar(x, y) {
  return [x / (COS0 * ESCALA) + LON0, y / ESCALA + LAT0];
}

export function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Simplificación Douglas–Peucker sobre anillos [[lon,lat],...]
function dp(puntos, tol) {
  if (puntos.length < 4) return puntos;
  const marcados = new Uint8Array(puntos.length);
  marcados[0] = marcados[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    const [ax, ay] = puntos[a];
    const [bx, by] = puntos[b];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-12;
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = puntos[i];
      let t = ((px - ax) * dx + (py - ay) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px, ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol * tol && idx > 0) {
      marcados[idx] = 1;
      pila.push([a, idx], [idx, b]);
    }
  }
  return puntos.filter((_, i) => marcados[i]);
}

// Devuelve [{id, nombre, poligonos: [[anilloExterior, ...huecos]], area}]
export function prepararEstados(geo, tolerancia = 0.02) {
  return geo.features.map((f) => {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const poligonos = polys
      .map((p) => p.map((anillo) => dp(anillo, tolerancia)).filter((a) => a.length >= 4))
      .filter((p) => p.length && areaAnillo(p[0]) > 0.0004);
    return { id: f.properties.id, nombre: f.properties.name, poligonos };
  });
}

export function areaAnillo(a) {
  let s = 0;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) s += (a[j][0] + a[i][0]) * (a[j][1] - a[i][1]);
  return Math.abs(s / 2);
}

export function puntoEnPoligono(lon, lat, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

// Generador pseudoaleatorio determinista (para el marcador)
export function semilla(s) {
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
