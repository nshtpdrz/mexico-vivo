// Conexión con datos en tiempo real:
//  • Open-Meteo (https://open-meteo.com): clima actual, gratis y sin clave.
//  • USGS Earthquake Catalog (FDSN): sismos reales de los últimos días.
// Si no hay internet se usa la última respuesta guardada o datos de respaldo.
import { ESTADOS, CLIMA_RESPALDO } from './datos.js';

function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), valor })); } catch (_) {}
}
function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave)); } catch (_) { return null; }
}

async function fetchTimeout(url, ms = 9000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(id);
  }
}

// Devuelve { fuente: 'vivo'|'cache'|'respaldo', hora, datos: { id: {...} } }
export async function obtenerClima() {
  const ids = Object.keys(ESTADOS);
  const lat = ids.map((id) => ESTADOS[id].lat).join(',');
  const lon = ids.map((id) => ESTADOS[id].lon).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure' +
    '&daily=temperature_2m_max,temperature_2m_min&past_days=1&forecast_days=1' +
    '&timezone=America%2FMexico_City';
  try {
    const json = await fetchTimeout(url);
    const arr = Array.isArray(json) ? json : [json];
    const datos = {};
    arr.forEach((r, i) => {
      const c = r.current;
      datos[ids[i]] = {
        temp: c.temperature_2m,
        sensacion: c.apparent_temperature,
        humedad: c.relative_humidity_2m,
        lluvia: c.precipitation,
        codigo: c.weather_code,
        viento: c.wind_speed_10m,
        dirViento: c.wind_direction_10m,
        presion: c.surface_pressure,
        altitud: r.elevation,
        hora: c.time,
        // promedio de ayer (día completo): (máx + mín) / 2, menos afectado por la hora
        mediaAyer: r.daily ? (r.daily.temperature_2m_max[0] + r.daily.temperature_2m_min[0]) / 2 : null,
      };
    });
    const res = { fuente: 'vivo', hora: arr[0]?.current?.time, datos };
    guardar('mv-clima', res);
    return res;
  } catch (e) {
    const c = leer('mv-clima');
    if (c) return { ...c.valor, fuente: 'cache', guardado: c.t };
    const datos = {};
    ids.forEach((id) => {
      const [temp, alt] = CLIMA_RESPALDO[id];
      datos[id] = { temp, sensacion: temp, humedad: null, lluvia: 0, codigo: 1, viento: null, dirViento: null, presion: null, altitud: alt, mediaAyer: temp };
    });
    return { fuente: 'respaldo', hora: null, datos };
  }
}

// Sismos M≥4 en la región de México en los últimos `dias`
export async function obtenerSismosUSGS(dias = 30, magMin = 4) {
  const fin = new Date();
  const ini = new Date(fin.getTime() - dias * 86400000);
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    `&starttime=${ini.toISOString().slice(0, 10)}&minmagnitude=${magMin}` +
    '&minlatitude=13.5&maxlatitude=33&minlongitude=-118.5&maxlongitude=-86&orderby=time&limit=300';
  try {
    const json = await fetchTimeout(url, 12000);
    const lista = json.features.map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      lugar: f.properties.place,
      tiempo: f.properties.time,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      prof: f.geometry.coordinates[2],
      url: f.properties.url,
    }));
    const res = { fuente: 'vivo', lista };
    guardar('mv-usgs', res);
    return res;
  } catch (e) {
    const c = leer('mv-usgs');
    if (c) return { ...c.valor, fuente: 'cache', guardado: c.t };
    return { fuente: 'error', lista: [] };
  }
}

// Regresión lineal simple: y = a + b x
export function regresion(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  const r = sxy / Math.sqrt(sxx * syy);
  return { a, b, r2: r * r };
}
