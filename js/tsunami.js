// Simulador didáctico de tsunami.
//
// Física: un tsunami es una ola de agua "somera" aunque el mar sea profundo,
// porque su longitud de onda (cientos de km) es mucho mayor que la profundidad.
// Por eso su velocidad depende SOLO de la profundidad h:   v = √(g · h)
//   · mar abierto, h ≈ 4,000 m → v ≈ 198 m/s ≈ 713 km/h (¡como un avión!)
//   · plataforma costera, h ≈ 100 m → v ≈ 31 m/s ≈ 113 km/h
// Al llegar a aguas someras se frena, la energía se comprime y la ola crece
// (asomeramiento). Todo esto es un modelo simplificado con fines educativos.
import * as THREE from '../vendor/three/three.module.js';
import { distanciaKm, puntoEnPoligono, KM_POR_UNIDAD } from './geo.js';
import { vec } from './mapa3d.js';

const G = 9.81;
export const H_PROFUNDO = 4000; // m
export const H_COSTA = 100; // m
export const ANCHO_PLATAFORMA = 40; // km
export const V_PROFUNDO = Math.sqrt(G * H_PROFUNDO) * 3.6; // km/h
export const V_COSTA = Math.sqrt(G * H_COSTA) * 3.6; // km/h

export const PUERTOS = {
  pacifico: [
    ['Ensenada', 31.86, -116.62], ['Cabo San Lucas', 22.89, -109.91], ['La Paz', 24.16, -110.32], ['Mazatlán', 23.22, -106.42],
    ['Puerto Vallarta', 20.62, -105.23], ['Manzanillo', 19.05, -104.32], ['Cuyutlán', 18.92, -104.07], ['Lázaro Cárdenas', 17.96, -102.20],
    ['Zihuatanejo', 17.64, -101.55], ['Acapulco', 16.85, -99.88], ['Puerto Escondido', 15.86, -97.07], ['Huatulco', 15.77, -96.13],
    ['Salina Cruz', 16.17, -95.20], ['Puerto Chiapas', 14.70, -92.40],
  ],
  golfo: [
    ['Tampico', 22.25, -97.86], ['Veracruz', 19.20, -96.13], ['Coatzacoalcos', 18.15, -94.43], ['Ciudad del Carmen', 18.65, -91.83],
    ['Progreso', 21.28, -89.66], ['Cancún', 21.16, -86.85],
  ],
};

export function enTierra(lon, lat) {
  for (const f of window.MX_GEO.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const p of polys) if (puntoEnPoligono(lon, lat, p[0])) return true;
  }
  return false;
}

function oceano(lat, lon) {
  if (lon > -88.6) return 'golfo'; // Caribe
  if (lon > -98.2 && lat > 18.2) return 'golfo';
  return 'pacifico';
}

// Tiempo de llegada (h): mar profundo y luego la plataforma costera
export function tiempoLlegada(dKm) {
  const plataforma = Math.min(dKm, ANCHO_PLATAFORMA);
  return (dKm - plataforma) / V_PROFUNDO + plataforma / V_COSTA;
}

// Altura aproximada en la costa (m): crece con la magnitud, baja con la distancia
// (la energía se reparte en un anillo cada vez más grande) y sube al llegar a la costa.
function alturaCosta(mag, prof, dKm) {
  const fuente = Math.pow(10, 0.5 * (mag - 7)) * (prof <= 30 ? 1 : 0.6);
  const reparto = Math.sqrt(60 / Math.max(60, dKm));
  const asomeramiento = 2; // simplificado (ley de Green: (h_prof/h_costa)^¼ ≈ 2.5)
  return fuente * reparto * asomeramiento;
}

export function evaluar(cfg) {
  const { lat, lon, mag, prof } = cfg;
  if (enTierra(lon, lat)) return { genera: false, razon: 'El epicentro está en tierra: no mueve el fondo del mar.' };
  if (mag < 7) return { genera: false, razon: `Con M${mag.toFixed(1)} el fondo marino se mueve muy poco. Los tsunamis peligrosos suelen requerir M7 o más.` };
  if (prof > 70) return { genera: false, razon: `A ${prof} km de profundidad la ruptura no levanta el fondo del mar lo suficiente.` };
  const lado = oceano(lat, lon);
  const ciudades = PUERTOS[lado].map(([nombre, la, lo]) => {
    const d = distanciaKm(lat, lon, la, lo);
    return { nombre, lat: la, lon: lo, d, horas: tiempoLlegada(d), altura: alturaCosta(mag, prof, d) };
  }).filter((c) => c.d < 2500).sort((a, b) => a.horas - b.horas);
  return { genera: true, oceano: lado, ciudades };
}

export class Tsunami {
  constructor(mapa, cb = {}) {
    this.mapa = mapa;
    this.cb = cb;
    this.grupo = new THREE.Group();
    mapa.capas.sismo.add(this.grupo);
    // los anillos van casi al ras del papel: la tierra (estados en relieve) los tapa
    this.anillos = [0, 1, 2].map((k) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 160), new THREE.MeshBasicMaterial({ color: k ? 0x7fe3ff : 0xe8fbff, transparent: true, opacity: 0.85 - k * 0.25, side: THREE.DoubleSide }));
      m.position.z = 0.0012;
      m.visible = false;
      this.grupo.add(m);
      return m;
    });
    this.marcas = [];
    this.activo = false;
  }

  iniciar(cfg) {
    this.detener();
    this.res = evaluar(cfg);
    this.cb.onResultado?.(this.res, cfg);
    if (!this.res.genera) return;
    this.activo = true;
    this.horas = 0;
    this.centro = vec(cfg.lon, cfg.lat, 0);
    this.pendientes = this.res.ciudades.slice();
    this.anillos.forEach((a) => { a.visible = true; a.position.x = this.centro.x; a.position.y = this.centro.y; });
  }

  detener() {
    this.activo = false;
    this.anillos.forEach((a) => (a.visible = false));
    this.marcas.forEach((m) => { this.grupo.remove(m); m.geometry.dispose(); });
    this.marcas = [];
  }

  // velocidad: horas de tsunami por segundo real
  update(dt, velocidad) {
    if (!this.activo) return;
    this.horas += dt * velocidad;
    const rKm = this.horas * V_PROFUNDO;
    this.anillos.forEach((a, k) => {
      const r = Math.max(0.0001, (rKm - k * 35) / KM_POR_UNIDAD);
      a.scale.set(r, r, 1);
      a.visible = rKm - k * 35 > 0;
    });
    while (this.pendientes.length && this.pendientes[0].horas <= this.horas) {
      const c = this.pendientes.shift();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, Math.min(0.05, 0.006 + c.altura * 0.004), 16), new THREE.MeshBasicMaterial({ color: c.altura >= 3 ? 0xff4d4d : c.altura >= 1 ? 0xffb02e : 0x7fe3ff }));
      m.rotation.x = Math.PI / 2;
      const v = vec(c.lon, c.lat, 0);
      m.position.set(v.x, v.y, m.geometry.parameters.height / 2);
      this.grupo.add(m);
      this.marcas.push(m);
      this.cb.onLlegada?.(c);
    }
    const max = this.res.ciudades.at(-1)?.d ?? 0;
    if (rKm > max + 300) {
      this.activo = false;
      this.anillos.forEach((a) => (a.visible = false));
      this.cb.onFin?.();
    }
  }
}
