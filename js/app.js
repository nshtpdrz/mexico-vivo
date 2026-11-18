// =====================================================================
//  México Vivo — aplicación principal
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapaMexico, crearEtiqueta, vec } from './mapa3d.js';
import { SimuladorSismo, dibujarCorte, ROMANOS, DESC_MMI, energia } from './sismo.js';
import { obtenerClima, obtenerSismosUSGS, regresion } from './apis.js';
import { desproyectar, distanciaKm } from './geo.js';
import * as audio from './audio.js';
import * as ev from './evaluacion.js';
import * as guia from './guia.js';
import { cargarSismograma, sonificar, detenerSonido, dibujarSismograma, staLta } from './sismograma.js';
import { iniciarSensor, detenerSensor, dibujarSensor, sensorActivo } from './sensor.js';
import {
  ESTADOS, REGIONES, ZONAS_SISMICAS, BIOMAS, VOLCANES, ESPECIES, SISMOS_HISTORICOS, ESTACION_UNM,
  RETO, describeTiempo, VEL_P, VEL_S,
} from './datos.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n, d = 0) => Number(n).toLocaleString('es-MX', { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------------------------------------------------------------------
// Escena 3D (modo mesa)
// ---------------------------------------------------------------------
const vista = $('#vista');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
vista.appendChild(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(38, 1, 0.01, 20);
camara.position.set(0.0, 0.86, 0.66);
const controles = new OrbitControls(camara, renderer.domElement);
controles.target.set(0.0, 0, 0.04);
controles.enableDamping = true;
controles.minDistance = 0.25;
controles.maxDistance = 1.8;
controles.maxPolarAngle = Math.PI * 0.47;
controles.zoomSpeed = 0.8;

escena.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2016, 1.15));
const sol = new THREE.DirectionalLight(0xffffff, 2.2);
sol.position.set(-0.6, 1.2, 0.5);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -0.7, right: 0.7, top: 0.6, bottom: -0.6, near: 0.1, far: 4 });
sol.shadow.bias = -0.0005;
escena.add(sol);

const mesa = new THREE.Group();
mesa.rotation.x = -Math.PI / 2;
escena.add(mesa);

const mapa = new MapaMexico();
mesa.add(mapa.root);

// ---------------------------------------------------------------------
// Estado de la aplicación
// ---------------------------------------------------------------------
const app = {
  capa: 'estados',
  modoAR: false,
  ar: null,
  clima: null,
  climaVar: 'temp',
  usgs: null,
  seleccion: null,
};

// ---------------------------------------------------------------------
// Simulador sísmico
// ---------------------------------------------------------------------
const log = $('#sismo-log');
const sim = new SimuladorSismo(mapa, {
  onEscucha(c, res) {
    // Predecir → observar → explicar
    const pred = app.prediccion;
    const aviso = sim.alertaActiva && res.tAlerta !== null ? Math.max(0, c.aviso) : 0;
    const dif = Math.abs(pred - aviso);
    const veredicto = dif <= 10 ? '¡Muy cerca!' : pred < aviso ? 'Hubo más tiempo del que pensabas.' : 'Hubo menos tiempo del que pensabas.';
    const por = res.tAlerta === null
      ? `No hubo alerta: ${$('#sismo-log li.ev-info')?.textContent.replace(/^[\d.]+ s/, '') || 'ningún sensor cerca.'}`
      : !sim.alertaActiva ? 'La alerta estaba apagada: el sismo llegó sin aviso.'
        : `La alerta salió a los ${fmt(res.tAlerta, 1)} s. La onda S tardó ${fmt(c.tS, 1)} s en recorrer ${fmt(c.R)} km hasta ${c.nombre}. Aviso = ${fmt(c.tS, 1)} − ${fmt(res.tAlerta, 1)} = ${fmt(aviso)} s.`;
    const el = $('#poe-res');
    el.hidden = false;
    el.innerHTML = `<b>Predijiste ${pred} s · Resultado: ${fmt(aviso)} s</b><br>${veredicto} ${por}`;
    el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra');
    if (c.id === 'MX-HID' && aviso > 60) guia.completar('aviso60');
    if (dif <= 10) guia.completar('prediccion');
  },

  onInicio() {
    app.prediccion = +$('#rng-pred').value;
    $('#poe-res').hidden = true;
    log.innerHTML = '';
    $('#btn-sismo').textContent = '■ Detener';
    $('#btn-sismo').classList.add('peligro');
  },
  onEvento(texto, tipo, t) {
    const li = document.createElement('li');
    li.className = 'ev-' + tipo;
    li.innerHTML = `<span class="t">${t.toFixed(1)} s</span>${texto}`;
    log.prepend(li);
  },
  onTiempo(t, rP, rS) {
    $('#sismo-reloj').textContent = `${t.toFixed(1)} s`;
    $('#sismo-radios').textContent = `P: ${fmt(rP)} km · S: ${fmt(rS)} km`;
  },
  onAlerta(on) {
    $('#alerta-banner').classList.toggle('visible', on && sim.alertaActiva);
    if (on) setTimeout(() => $('#alerta-banner').classList.remove('visible'), 6000);
    if (on && sim.alertaActiva && $('#chk-simulacro').checked) {
      const esc = sim.res.ciudades.find((c) => c.id === sim.escucha);
      if (esc && esc.aviso > 0) iniciarSimulacro(esc);
    }
  },
  onFin() {
    $('#btn-sismo').textContent = '▶ Simular sismo';
    $('#btn-sismo').classList.remove('peligro');
  },
  onResultados(res, cfg) {
    pintarResultados(res, cfg);
  },
});

function pintarResultados(res, cfg) {
  const { ciudades, tAlerta } = res;
  const destacados = new Set(['MX-CMX', 'MX-HID', sim.escucha]);
  const lista = ciudades.filter((c, i) => i < 6 || destacados.has(c.id));
  $('#sismo-tabla tbody').innerHTML = lista.map((c) => {
    const I = Math.round(c.I);
    const aviso = c.aviso === null ? '—' : c.aviso > 0 ? `<b class="ok">${fmt(c.aviso)} s</b>` : '<b class="mal">0 s</b>';
    return `<tr class="${destacados.has(c.id) ? 'dest' : ''}">
      <td>${c.nombre}</td><td>${fmt(c.d)}</td><td>${fmt(c.tP, 1)}</td><td>${fmt(c.tS, 1)}</td>
      <td>${aviso}</td><td><span class="mmi mmi-${Math.min(I, 10)}" title="${DESC_MMI[I]}">${ROMANOS[I]}</span></td></tr>`;
  }).join('');
  const esc = ciudades.find((c) => c.id === sim.escucha);
  const E = energia(cfg.mag);
  const bombas = E / 6.3e13; // bomba de Hiroshima ≈ 15 kt ≈ 6.3e13 J
  $('#sismo-resumen').innerHTML = `
    <div class="chip"><b>M${cfg.mag.toFixed(1)}</b> energía ≈ ${bombas >= 1 ? fmt(bombas) + ' bombas de Hiroshima' : fmt(E / 4.184e9, 1) + ' t de TNT'}</div>
    <div class="chip">Cada +1 de magnitud = <b>×32</b> energía</div>
    ${tAlerta !== null ? `<div class="chip">Alerta emitida a los <b>${fmt(tAlerta, 1)} s</b></div>` : '<div class="chip mal">Sin alerta temprana</div>'}
    ${esc ? `<div class="chip">En ${esc.nombre}: S–P = <b>${fmt(esc.tS - esc.tP, 1)} s</b> → distancia ≈ ${fmt((esc.tS - esc.tP) / (1 / VEL_S - 1 / VEL_P))} km</div>` : ''}`;
}

// ---------------------------------------------------------------------
// Interfaz: capas
// ---------------------------------------------------------------------
const LEYENDAS = {
  estados: () => Object.values(REGIONES).map((r) => [r.color, r.nombre]).concat([['#f2b21b', 'Hidalgo (¡aquí estamos!)']]),
  tectonica: () => Object.values(ZONAS_SISMICAS).map((z) => [z.color, z.nombre])
    .concat([['#ff3b3b', 'Subducción'], ['#ffd23a', 'Divergente'], ['#3ad1ff', 'Transformante']]),
  volcanes: () => [['#5b3a2a', 'Volcán (altura proporcional)'], ['#ff7a1a', 'Eje Neovolcánico'], ['#2b2f3a', 'Sitio geológico']],
  biodiversidad: () => Object.values(BIOMAS).map((b) => [b.color, b.nombre]),
  clima: () => escalaLeyenda(),
};

function cambiarCapa(capa) {
  if (app.modoAR === false && capa === app.capa && document.body.dataset.capa === capa) return;
  app.capa = capa;
  document.body.dataset.capa = capa;
  mapa.setCapa(capa);
  mapa.capas.usgs.visible = capa === 'tectonica' && $('#chk-usgs').checked;
  $$('.capas button').forEach((b) => b.setAttribute('aria-selected', b.dataset.capa === capa));
  $$('.panel-capa').forEach((s) => (s.hidden = s.dataset.capa !== capa));
  cerrarFicha();
  audio.detenerAmbiente();
  if (capa !== 'tectonica') { sim.detener(); }
  if (capa === 'tectonica') { sim._calcular(); }
  if (capa === 'clima' && !app.clima) cargarClima();
  pintarLeyenda();
  audio.clic(660);
  guia.alEntrarCapa(capa);
  if (capa !== 'tectonica') { detenerSensor(); detenerSonido(); }
}

function pintarLeyenda() {
  const items = LEYENDAS[app.capa]();
  $('#leyenda').innerHTML = items.map(([c, t]) => `<div><i style="background:${c}"></i>${t}</div>`).join('');
}

$$('.capas button').forEach((b) => b.addEventListener('click', () => cambiarCapa(b.dataset.capa)));

// Panel plegable (en AR deja ver todo el mapa)
function plegarPanel(on) {
  document.body.classList.toggle('panel-plegado', on);
  const b = $('#btn-panel');
  b.setAttribute('aria-expanded', String(!on));
  b.title = on ? 'Mostrar panel' : 'Ocultar panel';
}
$('#btn-panel').addEventListener('click', () => plegarPanel(!document.body.classList.contains('panel-plegado')));

// Ver bajo la superficie (placa de Cocos)
$('#chk-subsuelo').addEventListener('change', (e) => mapa.setSubsuelo(e.target.checked));

// Modo sencillo: menos texto, botones grandes (visitantes jóvenes)
function modoSencillo(on) {
  document.body.classList.toggle('sencillo', on);
  $('#btn-sencillo').setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('mv-sencillo', on ? '1' : '0'); } catch (_) {}
}
$('#btn-sencillo').addEventListener('click', () => modoSencillo(!document.body.classList.contains('sencillo')));
try { if (localStorage.getItem('mv-sencillo') === '1') modoSencillo(true); } catch (_) {}

// ---------------------------------------------------------------------
// Ficha de información
// ---------------------------------------------------------------------
const ficha = $('#ficha');
function abrirFicha({ titulo, sub = '', cuerpo = '', chips = [], acciones = [], color = null }) {
  plegarPanel(false);
  ficha.hidden = false;
  ficha.style.setProperty('--acento', color || 'var(--oro)');
  ficha.innerHTML = `
    <button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sub">${sub}</p>
    <h2>${titulo}</h2>
    ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>` : ''}
    <div class="cuerpo">${cuerpo}</div>
    <div class="acciones-ficha">${acciones.map((a, i) => `<button class="btn ${a.clase || ''}" data-i="${i}">${a.texto}</button>`).join('')}<button class="btn sec leer" title="Leer en voz alta">🔈 Leer</button></div>`;
  $('.cerrar', ficha).onclick = cerrarFicha;
  $$('.acciones-ficha button[data-i]', ficha).forEach((b) => (b.onclick = () => acciones[b.dataset.i].fn()));
  const leer = () => guia.hablar(`${titulo.replace(/<[^>]+>/g, '')}. ${$('.cuerpo', ficha).innerText}`, true);
  $('.leer', ficha).onclick = leer;
  if (guia.vozEncendida()) leer();
  ficha.classList.remove('entra');
  void ficha.offsetWidth;
  ficha.classList.add('entra');
  $('#panel').scrollTo({ top: 0, behavior: 'smooth' });
}
function cerrarFicha() {
  ficha.hidden = true;
  mapa.seleccionar(null);
  app.seleccion = null;
}

function fichaEstado(id) {
  const r = mapa.estados.get(id);
  if (!r) return;
  const e = r.info;
  mapa.seleccionar(id);
  app.seleccion = id;
  const pan = (e.lon + 102.5) / 15;
  if (id === 'MX-HID') guia.completar('hidalgo');
  const base = {
    titulo: r.nombre,
    sub: `Capital: ${e.capital} · ${REGIONES[e.region].nombre}`,
    color: REGIONES[e.region].color,
  };
  if (app.capa === 'biodiversidad') {
    const b = BIOMAS[e.bioma];
    const sp = ESPECIES.filter((s) => {
      const d = distanciaKm(s.lat, s.lon, e.lat, e.lon);
      return d < 380;
    });
    audio.ambienteBioma(b.sonido, pan);
    if (e.bioma === 'selvaHumeda') guia.completar('selva');
    abrirFicha({
      ...base, color: b.color,
      chips: [`🌿 ${b.nombre}`, '🔊 Paisaje sonoro'],
      cuerpo: `<p>${b.texto}</p>${sp.length ? `<h3>Especies cercanas</h3><ul class="lista-sp">${sp.map((s) => `<li>${s.emoji} <b>${s.nombre}</b> <i>${s.cientifico}</i></li>`).join('')}</ul>` : ''}<p class="dato">💡 ${e.dato}</p>`,
      acciones: [{ texto: '🔇 Silenciar ambiente', fn: () => audio.detenerAmbiente() }],
    });
    return;
  }
  if (app.capa === 'clima' && app.clima) {
    const c = app.clima.datos[id];
    const [ico, desc] = describeTiempo(c.codigo);
    audio.ambienteClima(c.viento ?? 5, (c.lluvia ?? 0) > 0, pan);
    const minT = Math.min(...Object.values(app.clima.datos).map((x) => x.temp));
    if (c.temp === minT) guia.completar('frio');
    abrirFicha({
      ...base,
      chips: [`${ico} ${desc}`, `🌡️ ${fmt(c.temp, 1)} °C`, c.humedad != null ? `💧 ${c.humedad}%` : '', `🍃 ${fmt(c.viento)} km/h ${rumbo(c.dirViento)}`, `⛰️ ${fmt(c.altitud)} m`].filter(Boolean),
      cuerpo: `<p>Sensación térmica: <b>${fmt(c.sensacion, 1)} °C</b>${c.presion ? ` · Presión: <b>${fmt(c.presion)} hPa</b>` : ''}${c.lluvia ? ` · Lluvia: <b>${c.lluvia} mm</b>` : ''}</p>
        <p>Con el gradiente de −6.5 °C/km, a nivel del mar ${e.capital} tendría unos <b>${fmt(c.temp + 6.5 * (c.altitud / 1000), 1)} °C</b>.</p>
        ${c.presion ? `<p>La presión baja con la altura: a ${fmt(c.altitud)} m el aire «pesa» menos (al nivel del mar es ~1013 hPa).</p>` : ''}
        <p class="dato">💡 ${e.dato}</p>`,
    });
    return;
  }
  if (app.capa === 'tectonica') {
    const z = ZONAS_SISMICAS[e.zona];
    abrirFicha({
      ...base, color: z.color,
      chips: [z.nombre],
      cuerpo: `<p class="dato">💡 ${e.dato}</p>`,
      acciones: [{ texto: '🎧 Escuchar el sismo desde aquí', fn: () => { ponerEscucha(id); audio.clic(); } }],
    });
    return;
  }
  abrirFicha({
    ...base,
    chips: [`🌿 ${BIOMAS[e.bioma].nombre}`, `📈 ${ZONAS_SISMICAS[e.zona].nombre}`],
    cuerpo: `<p class="dato">💡 ${e.dato}</p>`,
    acciones: [
      { texto: '🌍 Ver su sismicidad', fn: () => { cambiarCapa('tectonica'); } },
      { texto: '🦋 Ver su biodiversidad', fn: () => { cambiarCapa('biodiversidad'); fichaEstado(id); } },
    ],
  });
  audio.clic(990);
}

function rumbo(g) {
  if (g == null) return '';
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(g / 45) % 8];
}

function fichaObjeto(ud) {
  const d = ud.data;
  switch (ud.tipo) {
    case 'volcan': {
      const reg = mapa.volcanes.find((v) => v.v === d);
      abrirFicha({
        titulo: d.nombre, sub: d.tipo, color: '#e2622b',
        chips: [`⛰️ ${fmt(d.alt)} m`, d.estado],
        cuerpo: `<p>${d.dato}</p><p class="nota">Los volcanes del Eje Neovolcánico se forman porque la placa de Cocos, al hundirse a ~100 km, libera agua. El agua funde el manto y el magma sube.</p>`,
        acciones: [{ texto: '🌋 Simular erupción', clase: 'peligro', fn: () => { mapa.erupcion(reg); audio.erupcion((d.lon + 102.5) / 15); if (d.activo) guia.completar('erupcion'); } }],
      });
      audio.clic(500);
      break;
    }
    case 'geositio':
      abrirFicha({ titulo: d.nombre, sub: 'Sitio geológico', cuerpo: `<p>${d.dato}</p>`, color: '#7fa3ff' });
      break;
    case 'especie':
      abrirFicha({
        titulo: `${d.emoji} ${d.nombre}`, sub: d.cientifico, color: BIOMAS[d.bioma].color,
        chips: [d.estado, BIOMAS[d.bioma].nombre],
        cuerpo: `<p>${d.dato}</p>`,
        acciones: [{ texto: '🔊 Escuchar su hábitat', fn: () => audio.ambienteBioma(BIOMAS[d.bioma].sonido, (d.lon + 102.5) / 15) }],
      });
      audio.ambienteBioma(BIOMAS[d.bioma].sonido, (d.lon + 102.5) / 15);
      audio.reproducirGrabacion('especie-' + slug(d.nombre), (d.lon + 102.5) / 15);
      if (d.bioma === 'selvaHumeda') guia.completar('selva');
      break;
    case 'sensor':
      abrirFicha({ titulo: `Sensor ${d.nombre}`, sub: 'Red de alerta temprana (simplificada)', color: '#9ef0ff', cuerpo: '<p>Los sensores de la costa detectan la onda P, que es rápida pero débil. Calculan la magnitud en segundos y mandan la alerta por radio, que viaja a la velocidad de la luz. Así se gana tiempo antes de que llegue la onda S, que es la destructiva.</p>' });
      break;
    case 'limite':
      abrirFicha({
        titulo: d.nombre, sub: 'Límite de placas', color: { subduccion: '#ff3b3b', divergente: '#ffd23a', transformante: '#3ad1ff' }[d.tipo],
        cuerpo: {
          subduccion: '<p><b>Convergente (subducción):</b> una placa oceánica densa se hunde bajo otra. Genera los sismos más grandes del mundo y alimenta los volcanes.</p>',
          divergente: '<p><b>Divergente:</b> las placas se separan y el magma sube a llenar el hueco, creando corteza nueva. Así se abrió el Golfo de California.</p>',
          transformante: '<p><b>Transformante:</b> las placas se deslizan de lado. No se crea ni se destruye corteza, pero la fricción produce sismos (como la falla de San Andrés).</p>',
        }[d.tipo],
      });
      break;
    case 'placa':
      abrirFicha({
        titulo: 'Placa de Cocos bajo México', sub: 'Vista del subsuelo · profundidad ×4', color: '#3a5bff',
        chips: ['Subducción ~6 cm/año', 'Geometría esquemática'],
        cuerpo: `<p>La placa oceánica de Cocos se hunde bajo la Norteamericana. Bajo Guerrero avanza casi horizontal, a unos 50 km de profundidad, por cerca de 250 km (la «losa plana»). Luego se hunde con más pendiente.</p>
          <p>Donde la placa llega a unos <b>100 km</b> suelta agua que funde el manto: justo encima están los volcanes del Eje Neovolcánico. Compruébalo en la capa Volcanes.</p>
          <p class="nota">Los colores van de naranja (somero) a azul (profundo). Basado en Pérez-Campos et al. (2008). Es un modelo simplificado, no un mapa exacto de la placa.</p>`,
      });
      break;
    case 'eje':
      abrirFicha({ titulo: 'Eje Neovolcánico Transversal', sub: '~1,000 km de Nayarit a Veracruz', color: '#ff7a1a', cuerpo: '<p>Es una cadena de más de 8,000 estructuras volcánicas. Está inclinado respecto a la fosa porque la placa de Cocos se hunde con distintos ángulos: bajo Guerrero viaja casi plana (losa plana) antes de hundirse.</p>' });
      break;
    case 'museo':
      abrirFicha({ titulo: 'Museo El Rehilete', sub: 'Pachuca, Hidalgo', color: '#f2b21b', cuerpo: '<p>¡Aquí estamos! Prueba simular un sismo en la costa de Guerrero y mira cuánto tiempo de aviso tendría Pachuca.</p>', acciones: [{ texto: '🌍 Probar', fn: () => { cambiarCapa('tectonica'); ponerEscucha('MX-HID'); sim.configurar({ lat: 16.98, lon: -99.77, mag: 7.4, prof: 20 }); sim.iniciar(); } }] });
      break;
    case 'usgs':
      abrirFicha({
        titulo: `M${d.mag.toFixed(1)} · ${d.lugar}`, sub: new Date(d.tiempo).toLocaleString('es-MX'), color: '#ff8a3a',
        chips: [`Profundidad ${fmt(d.prof)} km`, 'Dato real · USGS'],
        cuerpo: '<p>Sismo real registrado por la red mundial. Puedes simular cómo se propagaron sus ondas.</p>',
        acciones: [{ texto: '▶ Simular este sismo', fn: () => { sim.configurar({ lat: d.lat, lon: d.lon, mag: d.mag, prof: Math.max(5, Math.round(d.prof)) }); sincronizarControles(); sim.iniciar(); } }],
      });
      break;
  }
}

// ---------------------------------------------------------------------
// Interacción (raycast) — sirve en modo mesa y en AR
// ---------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();

function visibleReal(o) {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}

function lanzarRayo(ev, cam, el) {
  const rect = el.getBoundingClientRect();
  ptr.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ptr.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(ptr, cam);
  const hits = ray.intersectObjects(mapa.pickables.filter(visibleReal), false);
  // punto del rayo sobre el plano del papel (para elegir epicentros incluso en el mar)
  const inv = new THREE.Matrix4().copy(mapa.root.matrixWorld).invert();
  const r = ray.ray.clone().applyMatrix4(inv);
  const pl = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const p = new THREE.Vector3();
  const enPapel = r.intersectPlane(pl, p) ? p : null;
  return { hit: hits[0]?.object || null, enPapel };
}

function alClic(ev, cam, el) {
  audio.iniciarAudio();
  const { hit, enPapel } = lanzarRayo(ev, cam, el);
  const ud = hit?.userData;
  // la placa está bajo el mapa: tocarla no debe impedir elegir el epicentro
  if (ud && ud.tipo && ud.tipo !== 'estado' && ud.tipo !== 'placa') return fichaObjeto(ud);
  if (app.capa === 'tectonica' && enPapel && Math.abs(enPapel.x) < 0.5 && Math.abs(enPapel.y) < 0.32) {
    const [lon, lat] = desproyectar(enPapel.x, enPapel.y);
    sim.detener();
    sim.configurar({ lat, lon });
    $('#epi-texto').textContent = `${lat.toFixed(2)}°N, ${(-lon).toFixed(2)}°O`;
    audio.clic(440);
    if (ud?.tipo === 'estado') fichaEstado(ud.id);
    return;
  }
  if (ud?.tipo === 'estado') return fichaEstado(ud.id);
  cerrarFicha();
}

let arrastre = null;
renderer.domElement.addEventListener('pointerdown', (e) => { arrastre = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (arrastre && Math.hypot(e.clientX - arrastre[0], e.clientY - arrastre[1]) < 6) alClic(e, camara, renderer.domElement);
  arrastre = null;
});
const tooltip = $('#tooltip');
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const { hit } = lanzarRayo(e, camara, renderer.domElement);
  const ud = hit?.userData;
  let txt = '';
  if (ud?.tipo === 'estado') txt = ud.nombre;
  else if (ud?.data?.nombre) txt = ud.data.nombre;
  else if (ud?.tipo === 'usgs') txt = `M${ud.data.mag.toFixed(1)} · ${ud.data.lugar}`;
  mapa.setHover(ud?.tipo === 'estado' ? ud.id : null);
  renderer.domElement.style.cursor = ud ? 'pointer' : app.capa === 'tectonica' ? 'crosshair' : 'grab';
  tooltip.hidden = !txt;
  if (txt) {
    tooltip.textContent = txt;
    tooltip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
  }
});
renderer.domElement.addEventListener('pointerleave', () => { tooltip.hidden = true; mapa.setHover(null); });

// ---------------------------------------------------------------------
// Controles de sismos
// ---------------------------------------------------------------------
function sincronizarControles() {
  $('#rng-mag').value = sim.cfg.mag;
  $('#val-mag').textContent = sim.cfg.mag.toFixed(1);
  $('#rng-prof').value = sim.cfg.prof;
  $('#val-prof').textContent = sim.cfg.prof;
  $('#epi-texto').textContent = `${sim.cfg.lat.toFixed(2)}°N, ${(-sim.cfg.lon).toFixed(2)}°O`;
}
$('#rng-mag').addEventListener('input', (e) => { sim.configurar({ mag: +e.target.value }); $('#val-mag').textContent = (+e.target.value).toFixed(1); });
$('#rng-prof').addEventListener('input', (e) => { sim.configurar({ prof: +e.target.value }); $('#val-prof').textContent = e.target.value; });
$('#rng-vel').addEventListener('input', (e) => { sim.velocidad = +e.target.value; $('#val-vel').textContent = e.target.value + '×'; });
$('#chk-alerta').addEventListener('change', (e) => { sim.alertaActiva = e.target.checked; });
const selEsc = $('#sel-escucha');
Object.entries(ESTADOS).sort((a, b) => a[1].capital.localeCompare(b[1].capital)).forEach(([id, e]) => {
  selEsc.add(new Option(e.capital, id, false, id === 'MX-HID'));
});
const ponerEscucha = (id) => { sim.escucha = id; selEsc.value = id; $('#poe-ciudad').textContent = ESTADOS[id].capital; sim._calcular(); };
selEsc.addEventListener('change', () => ponerEscucha(selEsc.value));
$('#rng-pred').addEventListener('input', (e) => { $('#val-pred').textContent = `${e.target.value} s`; });
$('#btn-sismo').addEventListener('click', () => {
  audio.iniciarAudio();
  if (sim.corriendo) { sim.detener(); sim.cb.onFin(); return; }
  sim.iniciar();
});
$('#historicos').innerHTML = SISMOS_HISTORICOS.map((s, i) => `<button class="btn mini" data-i="${i}" title="${s.nota}">${s.nombre}<small>M${s.mag}</small></button>`).join('');
$$('#historicos button').forEach((b) => b.addEventListener('click', () => {
  const s = SISMOS_HISTORICOS[b.dataset.i];
  sim.configurar({ lat: s.lat, lon: s.lon, mag: s.mag, prof: s.prof });
  sincronizarControles();
  abrirFicha({ titulo: `Sismo ${s.nombre}`, sub: s.fecha, color: '#ff4040', chips: [`M${s.mag}`, `${s.prof} km`], cuerpo: `<p>${s.nota}</p>` });
  sim.iniciar();
}));

// Sismos reales (USGS)
async function cargarUSGS() {
  const est = $('#usgs-estado');
  est.textContent = 'Consultando USGS…';
  const res = await obtenerSismosUSGS(30, 4);
  app.usgs = res;
  const g = mapa.capas.usgs;
  mapa.pickables = mapa.pickables.filter((o) => o.userData?.tipo !== 'usgs');
  liberar(g);
  for (const q of res.lista) {
    const r = 0.002 + (q.mag - 3.5) * 0.0018;
    const col = new THREE.Color().setHSL(Math.max(0, 0.13 - q.prof / 900), 1, 0.55);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
    m.position.copy(vec(q.lon, q.lat, 0.05));
    m.userData = { tipo: 'usgs', data: q };
    g.add(m);
    mapa.pickables.push(m);
  }
  const fuente = { vivo: 'en vivo', cache: 'guardado (sin conexión)', error: 'no disponible (sin conexión)' }[res.fuente];
  est.innerHTML = `<b>${res.lista.length}</b> sismos M≥4 en 30 días · ${fuente}`;
  const max = res.lista.slice().sort((a, b) => b.mag - a.mag).slice(0, 5);
  $('#usgs-lista').innerHTML = max.map((q, i) => `<li data-i="${res.lista.indexOf(q)}"><b>M${q.mag.toFixed(1)}</b> ${q.lugar}<small>${new Date(q.tiempo).toLocaleDateString('es-MX')}</small></li>`).join('');
  $$('#usgs-lista li').forEach((li) => li.addEventListener('click', () => fichaObjeto({ tipo: 'usgs', data: res.lista[li.dataset.i] })));
}
$('#chk-usgs').addEventListener('change', (e) => {
  mapa.capas.usgs.visible = e.target.checked && app.capa === 'tectonica';
  if (e.target.checked && !app.usgs) cargarUSGS();
});

// ---------------------------------------------------------------------
// Volcanes y biodiversidad: listas
// ---------------------------------------------------------------------
$('#lista-volcanes').innerHTML = VOLCANES.slice().sort((a, b) => b.alt - a.alt)
  .map((v) => `<li data-n="${v.nombre}"><span>${v.activo ? '🔥' : '⛰️'} ${v.nombre.split(' (')[0]}</span><small>${fmt(v.alt)} m</small></li>`).join('');
$$('#lista-volcanes li').forEach((li) => li.addEventListener('click', () => fichaObjeto({ tipo: 'volcan', data: VOLCANES.find((v) => v.nombre === li.dataset.n) })));
$('#lista-especies').innerHTML = ESPECIES.map((s, i) => `<li data-i="${i}"><span>${s.emoji} ${s.nombre}</span><small>${s.estado}</small></li>`).join('');
$$('#lista-especies li').forEach((li) => li.addEventListener('click', () => fichaObjeto({ tipo: 'especie', data: ESPECIES[li.dataset.i] })));

// ---------------------------------------------------------------------
// Clima en vivo
// ---------------------------------------------------------------------
const ESCALAS = {
  temp: { min: 0, max: 38, unidad: '°C', stops: ['#2b4cff', '#2fb4ff', '#38e0b0', '#c9f04a', '#ffd23a', '#ff8a2a', '#ff3030'], nombre: 'Temperatura' },
  humedad: { min: 10, max: 100, unidad: '%', stops: ['#c98a3a', '#e5d07a', '#8fd8a8', '#3fa8e0', '#2140c8'], nombre: 'Humedad relativa' },
  viento: { min: 0, max: 40, unidad: 'km/h', stops: ['#e8f3ff', '#9ad0ff', '#7c7bff', '#c43aff', '#ff2a8a'], nombre: 'Viento' },
  sensacion: { min: 0, max: 40, unidad: '°C', stops: ['#2b4cff', '#2fb4ff', '#38e0b0', '#c9f04a', '#ffd23a', '#ff8a2a', '#ff3030'], nombre: 'Sensación térmica' },
};
function colorEscala(v, esc) {
  const t = Math.max(0, Math.min(1, (v - esc.min) / (esc.max - esc.min)));
  const n = esc.stops.length - 1;
  const i = Math.min(n - 1, Math.floor(t * n));
  return '#' + new THREE.Color(esc.stops[i]).lerp(new THREE.Color(esc.stops[i + 1]), t * n - i).getHexString();
}
function escalaLeyenda() {
  const esc = ESCALAS[app.climaVar];
  const pasos = 5;
  return Array.from({ length: pasos }, (_, i) => {
    const v = esc.min + ((esc.max - esc.min) * i) / (pasos - 1);
    return [colorEscala(v, esc), `${fmt(v)} ${esc.unidad}`];
  });
}

async function cargarClima() {
  $('#clima-estado').textContent = 'Consultando Open-Meteo…';
  app.clima = await obtenerClima();
  pintarClima();
}

const lluvias = [];
// Vacía un grupo y libera la memoria de GPU (geometrías, materiales, texturas)
function liberar(g) {
  g.traverse((o) => {
    if (o === g) return;
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
  g.clear();
}
function pintarClima() {
  const { datos, fuente, hora } = app.clima;
  const esc = ESCALAS[app.climaVar];
  const g = mapa.capas.clima;
  liberar(g);
  lluvias.length = 0;
  for (const [id, c] of Object.entries(datos)) {
    const v = c[app.climaVar] ?? c.temp;
    const t = Math.max(0, Math.min(1, (v - esc.min) / (esc.max - esc.min)));
    mapa.setClimaEstado(id, colorEscala(v, esc), 0.004 + t * 0.04);
    const e = ESTADOS[id];
    const [ico] = describeTiempo(c.codigo);
    const lbl = crearEtiqueta(`${ico} ${fmt(v, app.climaVar === 'temp' || app.climaVar === 'sensacion' ? 0 : 0)}${esc.unidad === '°C' ? '°' : esc.unidad === '%' ? '%' : ''}`, { tam: 0.016, fondo: 'rgba(8,12,20,0.72)' });
    lbl.position.copy(vec(e.lon, e.lat, 0.055));
    g.add(lbl);
    // flecha de viento (apunta hacia donde va el viento)
    if (c.viento != null) {
      const ang = ((90 - (c.dirViento + 180)) * Math.PI) / 180;
      const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
      const largo = 0.01 + Math.min(c.viento, 40) * 0.0011;
      const fl = new THREE.ArrowHelper(dir, vec(e.lon, e.lat, 0.05), largo, 0xffffff, largo * 0.4, largo * 0.3);
      g.add(fl);
      const base = fl.position.clone();
      const vel = 0.2 + c.viento / 25;
      mapa.animables.push((tt) => {
        if (!g.children.includes(fl)) return false;
        fl.position.copy(base).addScaledVector(dir, ((tt * vel) % 1) * 0.008);
      });
    }
    if ((c.lluvia ?? 0) > 0 || (c.codigo >= 51 && c.codigo <= 99)) crearLluvia(g, e);
  }
  const fuenteTxt = { vivo: '🟢 En vivo', cache: '🟡 Último dato guardado', respaldo: '🟠 Sin internet: promedios anuales' }[fuente];
  $('#clima-estado').innerHTML = `${fuenteTxt}${hora ? ` · ${hora.replace('T', ' ')}` : ''} · Open-Meteo`;
  pintarGrafica();
  pintarLeyenda();
  if (app.seleccion && app.capa === 'clima') fichaEstado(app.seleccion);
}

function crearLluvia(g, e) {
  const n = 60;
  const pos = new Float32Array(n * 3);
  const [cx, cy] = [vec(e.lon, e.lat).x, vec(e.lon, e.lat).y];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = cx + (Math.random() - 0.5) * 0.04;
    pos[i * 3 + 1] = cy + (Math.random() - 0.5) * 0.04;
    pos[i * 3 + 2] = 0.05 + Math.random() * 0.06;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8fd0ff, size: 0.003, transparent: true, opacity: 0.85 }));
  g.add(pts);
  const nube = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 10), new THREE.MeshStandardMaterial({ color: 0xbfc8d6, transparent: true, opacity: 0.85 }));
  nube.scale.set(1.4, 1, 0.5);
  nube.position.set(cx, cy, 0.115);
  g.add(nube);
  mapa.animables.push((t, dt) => {
    if (!g.children.includes(pts)) return false;
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 2] -= dt * 0.12;
      if (pos[i * 3 + 2] < 0.04) pos[i * 3 + 2] = 0.11;
    }
    geo.attributes.position.needsUpdate = true;
  });
}

function pintarGrafica() {
  const cv = $('#grafica-clima');
  const { datos } = app.clima;
  const modo = $('#sel-grafica').value; // 'ahora' | 'ayer'
  const pts = Object.entries(datos)
    .map(([id, c]) => ({ id, x: c.altitud, y: modo === 'ayer' ? c.mediaAyer : c.temp, lat: ESTADOS[id].lat }))
    .filter((p) => p.x != null && p.y != null && Number.isFinite(p.y));
  if (pts.length < 5) {
    $('#clima-resultado').innerHTML = 'No hay datos suficientes para esta gráfica (sin conexión).';
    return;
  }
  const simple = regresion(pts.map((p) => p.x), pts.map((p) => p.y));
  // Regresión múltiple: T = a + b·altitud + c·latitud. Separa el efecto de la altura del de la latitud.
  const mult = regresion2(pts.map((p) => p.x), pts.map((p) => p.lat), pts.map((p) => p.y));
  const latMedia = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const a = mult.a + mult.c * latMedia, b = mult.b, r2 = mult.r2;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = { l: 34, r: 10, t: 10, b: 26 };
  const xMax = 3000;
  const yMin = Math.floor(Math.min(...pts.map((p) => p.y)) / 5) * 5 - 2;
  const yMax = Math.ceil(Math.max(...pts.map((p) => p.y)) / 5) * 5 + 2;
  const X = (x) => m.l + (x / xMax) * (W - m.l - m.r);
  const Y = (y) => H - m.b - ((y - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const css = getComputedStyle(document.body);
  c.strokeStyle = css.getPropertyValue('--linea');
  c.fillStyle = css.getPropertyValue('--texto-2');
  c.font = '10px system-ui, sans-serif';
  c.lineWidth = 1;
  for (let x = 0; x <= xMax; x += 500) { c.beginPath(); c.moveTo(X(x), m.t); c.lineTo(X(x), H - m.b); c.stroke(); if (x % 1000 === 0) c.fillText(`${x / 1000} km`, X(x) - 8, H - 8); }
  for (let y = Math.ceil(yMin / 5) * 5; y <= yMax; y += 5) { c.beginPath(); c.moveTo(m.l, Y(y)); c.lineTo(W - m.r, Y(y)); c.stroke(); c.fillText(`${y}°`, 6, Y(y) + 3); }
  // línea teórica -6.5 °C/km
  c.setLineDash([4, 4]);
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.beginPath(); c.moveTo(X(0), Y(a)); c.lineTo(X(xMax), Y(a - 6.5 * (xMax / 1000))); c.stroke();
  c.setLineDash([]);
  // regresión
  c.strokeStyle = '#ffc21a';
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(X(0), Y(a)); c.lineTo(X(xMax), Y(a + b * xMax)); c.stroke();
  pts.forEach((p) => {
    c.fillStyle = p.id === 'MX-HID' ? '#ffc21a' : p.id === app.seleccion ? '#fff' : 'rgba(80,190,255,0.9)';
    c.beginPath(); c.arc(X(p.x), Y(p.y), p.id === 'MX-HID' ? 5 : 3.5, 0, Math.PI * 2); c.fill();
  });
  const etiqueta = modo === 'ayer' ? 'temperatura media de ayer' : 'temperatura de este momento';
  $('#clima-resultado').innerHTML = `
    <b>Solo altitud:</b> ${fmt(simple.b * 1000, 1)} °C/km (R² = ${fmt(simple.r2, 2)})<br>
    <b>Altitud + latitud:</b> ${fmt(b * 1000, 1)} °C/km y ${fmt(mult.c, 2)} °C por grado de latitud (R² = ${fmt(r2, 2)})<br>
    <span class="nota">Datos: ${etiqueta}, ${pts.length} capitales. Referencia teórica: −6.5 °C/km (línea punteada). La diferencia viene de la humedad, la cercanía al mar, la nubosidad y, de noche, las inversiones térmicas. Es una medición observacional, no un experimento controlado.</span>`;
}

function regresion2(x1, x2, y) {
  const n = y.length, m = (v) => v.reduce((s, x) => s + x, 0) / n;
  const m1 = m(x1), m2 = m(x2), my = m(y);
  let s11 = 0, s22 = 0, s12 = 0, s1y = 0, s2y = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = x1[i] - m1, b = x2[i] - m2, c = y[i] - my;
    s11 += a * a; s22 += b * b; s12 += a * b; s1y += a * c; s2y += b * c; syy += c * c;
  }
  const den = s11 * s22 - s12 * s12;
  const b1 = (s22 * s1y - s12 * s2y) / den;
  const b2 = (s11 * s2y - s12 * s1y) / den;
  const a0 = my - b1 * m1 - b2 * m2;
  let res = 0;
  for (let i = 0; i < n; i++) res += (y[i] - (a0 + b1 * x1[i] + b2 * x2[i])) ** 2;
  return { a: a0, b: b1, c: b2, r2: 1 - res / syy };
}
$('#sel-grafica').addEventListener('change', () => app.clima && pintarGrafica());

$('#sel-clima').addEventListener('change', (e) => { app.climaVar = e.target.value; if (app.clima) pintarClima(); });
$('#btn-clima').addEventListener('click', () => cargarClima());

// ---------------------------------------------------------------------
// Reto (quiz)
// ---------------------------------------------------------------------
const dlg = $('#reto');
let reto = null;
function nuevaPregunta() {
  const q = reto.orden[reto.i];
  const pr = RETO[q];
  $('#reto-cont').innerHTML = `
    <p class="sub">Pregunta ${reto.i + 1} de ${reto.orden.length} · Aciertos: ${reto.ok}</p>
    <h2>${pr.p}</h2>
    <div class="opciones">${pr.o.map((o, i) => `<button class="btn opcion" data-i="${i}">${o}</button>`).join('')}</div>
    <p class="explica" hidden></p>
    <div class="acciones-ficha"><button class="btn" id="reto-sig" hidden>Siguiente →</button></div>`;
  $$('.opcion', dlg).forEach((b) => b.addEventListener('click', () => {
    if (reto.respondida) return;
    reto.respondida = true;
    const bien = +b.dataset.i === pr.r;
    if (bien) reto.ok++;
    b.classList.add(bien ? 'bien' : 'malo');
    $$('.opcion', dlg)[pr.r].classList.add('bien');
    const ex = $('.explica', dlg);
    ex.hidden = false;
    ex.innerHTML = `${bien ? '✅ ¡Correcto!' : '❌ Casi.'} ${pr.e}`;
    audio.clic(bien ? 1200 : 300);
    const sig = $('#reto-sig');
    sig.hidden = false;
    sig.onclick = () => {
      reto.i++;
      reto.respondida = false;
      if (reto.i >= reto.orden.length) finReto(); else nuevaPregunta();
    };
  }));
}
function finReto() {
  const n = reto.orden.length;
  $('#reto-cont').innerHTML = `<p class="sub">Resultado</p><h2>${reto.ok} de ${n} ${reto.ok === n ? '🏆' : reto.ok >= n / 2 ? '🎉' : '💪'}</h2>
    <p>${reto.ok === n ? '¡Dominas la ciencia de México!' : 'Explora las capas del mapa y vuelve a intentarlo.'}</p>
    <div class="acciones-ficha"><button class="btn" id="reto-otra">Otra vez</button><button class="btn sec" id="reto-cerrar">Cerrar</button></div>`;
  $('#reto-otra').onclick = iniciarReto;
  $('#reto-cerrar').onclick = () => dlg.close();
}
function iniciarReto() {
  const orden = RETO.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 5);
  reto = { orden, i: 0, ok: 0, respondida: false };
  nuevaPregunta();
  if (!dlg.open) dlg.showModal();
}
// --- Menú: reto libre o evaluación antes/después --------------------
function menuReto() {
  const pend = ev.pendientes();
  $('#reto-cont').innerHTML = `
    <p class="sub">Reto y evaluación</p>
    <h2>¿Qué quieres hacer?</h2>
    <div class="opciones">
      <button class="btn opcion" id="m-reto"><b>Reto libre</b>&nbsp;· 5 preguntas con explicación</button>
      <button class="btn opcion" id="m-antes"><b>Evaluación: ANTES</b>&nbsp;· el visitante aún no explora</button>
      <button class="btn opcion" id="m-despues" ${pend.length ? '' : 'disabled'}><b>Evaluación: DESPUÉS</b>&nbsp;· ${pend.length ? `${pend.length} visitante(s) pendiente(s)` : 'nadie pendiente'}</button>
      <button class="btn opcion" id="m-res"><b>Resultados</b>&nbsp;· estadística y CSV</button>
    </div>
    <p class="nota">La evaluación es anónima: solo guarda un número de visitante, un rango de edad y las respuestas, en este navegador.</p>`;
  $('#m-reto').onclick = iniciarReto;
  $('#m-antes').onclick = () => evalEdad();
  $('#m-despues').onclick = () => evalElegir(pend);
  $('#m-res').onclick = evalResultados;
  if (!dlg.open) dlg.showModal();
}

function evalEdad() {
  $('#reto-cont').innerHTML = `<p class="sub">Evaluación · antes</p><h2>¿Qué edad tienes?</h2>
    <div class="opciones">${['Menos de 12', '12 a 17', '18 a 29', '30 o más'].map((e) => `<button class="btn opcion" data-e="${e}">${e}</button>`).join('')}</div>`;
  $$('.opcion', dlg).forEach((b) => (b.onclick = () => evalPreguntas(ev.siguienteId(), 'antes', b.dataset.e)));
}

function evalElegir(pend) {
  $('#reto-cont').innerHTML = `<p class="sub">Evaluación · después</p><h2>¿Cuál es tu número de visitante?</h2>
    <div class="opciones numeros">${pend.map((id) => `<button class="btn opcion" data-id="${id}">#${id}</button>`).join('')}</div>`;
  $$('.opcion', dlg).forEach((b) => (b.onclick = () => {
    const id = +b.dataset.id;
    const a = ev.registros().find((r) => r.id === id && r.fase === 'antes');
    evalPreguntas(id, 'despues', a?.edad || '');
  }));
}

function evalPreguntas(id, fase, edad) {
  const resp = [];
  const paso = (i) => {
    if (i >= ev.PREGUNTAS.length) {
      const ok = ev.registrar(id, fase, edad, resp);
      $('#reto-cont').innerHTML = fase === 'antes'
        ? `<p class="sub">¡Gracias!</p><h2>Eres el visitante <span class="num-visitante">#${id}</span></h2>
           <p>Recuerda tu número. Ahora explora el mapa y, al terminar, contesta la parte DESPUÉS.</p>
           <div class="acciones-ficha"><button class="btn primario" id="ev-ok">Explorar</button></div>`
        : `<p class="sub">Visitante #${id}</p><h2>${ok} de ${ev.PREGUNTAS.length} correctas</h2>
           <p>Gracias por ayudarnos a medir si el prototipo enseña.</p>
           <div class="acciones-ficha"><button class="btn primario" id="ev-ok">Cerrar</button></div>`;
      $('#ev-ok').onclick = () => dlg.close();
      return;
    }
    const q = ev.PREGUNTAS[i];
    // en la evaluación NO se muestra si la respuesta es correcta (no "enseña" en el ANTES)
    $('#reto-cont').innerHTML = `<p class="sub">Evaluación · ${fase} · visitante #${id} · ${i + 1}/${ev.PREGUNTAS.length}</p>
      <h2>${q.p}</h2><div class="opciones">${q.o.map((o, j) => `<button class="btn opcion" data-j="${j}">${o}</button>`).join('')}
      <button class="btn opcion sec" data-j="-1">No sé</button></div>`;
    $$('.opcion', dlg).forEach((b) => (b.onclick = () => { resp.push(+b.dataset.j); audio.clic(); paso(i + 1); }));
  };
  paso(0);
}

function evalResultados() {
  const r = ev.resumen();
  const pct = (x) => `${Math.round(x * 100)} %`;
  const total = ev.registros();
  $('#reto-cont').innerHTML = `<p class="sub">Resultados de la evaluación</p>
    ${r.pares.length ? `<h2>${r.pares.length} visitantes con antes y después</h2>
    <div class="tarjetas">
      <div><b>${fmt(r.mA, 1)}/${r.n}</b><small>promedio ANTES</small></div>
      <div><b>${fmt(r.mD, 1)}/${r.n}</b><small>promedio DESPUÉS</small></div>
      <div><b>${fmt(r.g, 2)}</b><small>ganancia normalizada (Hake)</small></div>
    </div>
    <p>${r.mejoraron} de ${r.pares.length} visitantes mejoraron su puntaje.</p>
    <table><thead><tr><th>Pregunta</th><th>Antes</th><th>Después</th></tr></thead><tbody>
    ${ev.PREGUNTAS.map((q, i) => `<tr><td>${i + 1}. ${q.p}</td><td>${pct(r.porPregunta[i].antes)}</td><td>${pct(r.porPregunta[i].despues)}</td></tr>`).join('')}
    </tbody></table>
    <p class="nota">Muestra pequeña y sin grupo control: sirve como evidencia preliminar, no como prueba estadística.</p>`
    : `<h2>Aún no hay pares completos</h2><p>Registros guardados: ${total.length}. Cada visitante debe contestar ANTES y DESPUÉS.</p>`}
    <div class="acciones-ficha">
      <button class="btn primario" id="ev-csv" ${total.length ? '' : 'disabled'}>Descargar CSV</button>
      <button class="btn sec" id="ev-volver">Volver</button>
      <button class="btn sec" id="ev-borrar" ${total.length ? '' : 'disabled'}>Borrar datos</button>
    </div>`;
  $('#ev-csv').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ev.csv()], { type: 'text/csv' }));
    a.download = `evaluacion-mexico-vivo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  $('#ev-volver').onclick = menuReto;
  $('#ev-borrar').onclick = () => { if (confirm('¿Borrar todos los registros de evaluación de este navegador?')) { ev.borrarTodo(); evalResultados(); } };
}

$('#btn-reto').addEventListener('click', () => { audio.iniciarAudio(); menuReto(); });
$('#reto-x').addEventListener('click', () => dlg.close());

// ---------------------------------------------------------------------
// Sonido
// ---------------------------------------------------------------------
$('#btn-sonido').addEventListener('click', (e) => {
  audio.iniciarAudio();
  const on = !audio.sonidoActivo();
  audio.setSonido(on);
  e.currentTarget.setAttribute('aria-pressed', on);
  e.currentTarget.querySelector('span').textContent = on ? '🔊' : '🔇';
});

// ---------------------------------------------------------------------
// Realidad aumentada
// ---------------------------------------------------------------------
const arEstado = $('#ar-estado');
async function entrarAR() {
  if (app.modoAR) return salirAR();
  audio.iniciarAudio();
  const { iniciarAR } = await import('./ar.js');
  arEstado.hidden = false;
  arEstado.innerHTML = '<div class="spinner"></div><p>Cargando realidad aumentada…</p>';
  document.body.classList.add('modo-ar');
  plegarPanel(true); // que se vea todo el mapa; se abre solo al tocar algo
  try {
    app.modoAR = true;
    app.ar = await iniciarAR({
      contenedor: $('#ar-contenedor'),
      mapa,
      onEstado(txt, p) {
        arEstado.innerHTML = `<div class="spinner"></div><p>${txt}</p>${p > 0 && p < 100 ? `<progress max="100" value="${p}"></progress>` : ''}`;
      },
      onDetectado(ok) {
        // true = detectado · 'perdido' = se congela unos segundos · false = perdido del todo
        $('#ar-guia').hidden = ok !== false;
        $('#ar-aviso').hidden = ok !== 'perdido';
        if (ok === true) audio.clic(1320);
      },
      onFrame: frame,
    });
    arEstado.hidden = true;
    $('#ar-guia').hidden = false;
    $('#btn-ar span:last-child').textContent = 'Salir de AR';
    const el = $('#ar-contenedor');
    let ini = null;
    el.onpointerdown = (e) => (ini = [e.clientX, e.clientY]);
    el.onpointerup = (e) => {
      // El lienzo de MindAR es más grande que el contenedor (recorta el video para
      // llenar la pantalla): el rayo se calcula con SU rectángulo, no con el del contenedor.
      if (ini && Math.hypot(e.clientX - ini[0], e.clientY - ini[1]) < 10) alClic(e, app.ar.camera, app.ar.lienzo);
    };
  } catch (err) {
    console.error(err);
    app.ar = null;
    arEstado.innerHTML = `<p>⚠️ No se pudo iniciar la AR.</p><p class="nota">${err?.message || 'Error desconocido'}</p><button class="btn" id="ar-cerrar">Volver al modo 3D</button>`;
    $('#ar-cerrar').onclick = () => { arEstado.hidden = true; salirAR(); };
  }
}
async function salirAR() {
  if (app.ar) await app.ar.detener();
  app.ar = null;
  app.modoAR = false;
  document.body.classList.remove('modo-ar');
  $('#ar-guia').hidden = true;
  $('#ar-aviso').hidden = true;
  plegarPanel(false);
  $('#btn-ar span:last-child').textContent = 'Realidad aumentada';
  mesa.add(mapa.root);
  reloj.getDelta();
  renderer.setAnimationLoop(bucle);
}
$('#btn-ar').addEventListener('click', () => {
  if (!app.modoAR) renderer.setAnimationLoop(null);
  entrarAR();
});

// ---------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------
const reloj = new THREE.Clock();
const corte = $('#corte');
let acumCorte = 0;
function frame(dt) {
  mapa.update(dt);
  sim.update(dt);
  acumCorte += dt;
  if (app.capa === 'tectonica' && acumCorte > 1 / 30) {
    acumCorte = 0;
    dibujarCorte(corte, sim.cfg, sim.t, sim.corriendo);
  }
}
function bucle() {
  const dt = Math.min(0.05, reloj.getDelta());
  frame(dt);
  controles.update();
  renderer.render(escena, camara);
}
function redimensionar() {
  const w = vista.clientWidth, h = vista.clientHeight;
  renderer.setSize(w, h, false);
  camara.aspect = w / h;
  // en pantallas angostas alejamos la cámara para que quepa el país
  camara.fov = w / h < 1 ? 55 : 38;
  camara.updateProjectionMatrix();
  if (!encuadrado && w > 0) {
    // distancia para que quepa todo el país (≈1 unidad de ancho)
    const hfov = 2 * Math.atan(Math.tan((camara.fov * Math.PI) / 360) * camara.aspect);
    const dist = Math.min(1.7, 0.5 / Math.tan(hfov / 2) + 0.12);
    camara.position.copy(controles.target).addScaledVector(new THREE.Vector3(0, 0.8, 0.6), dist);
    controles.update();
    encuadrado = true;
  }
}
let encuadrado = false;
new ResizeObserver(redimensionar).observe(vista);
redimensionar();
renderer.setAnimationLoop(bucle);

function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------
// Escucha un sismo real (registros de la estación G.UNM, UNAM)
// ---------------------------------------------------------------------
const REALES = SISMOS_HISTORICOS.filter((s) => s.archivo);
const cvSis = $('#sismograma');
let sisActual = null, sisInicio = 0, sisDur = 0, sisMarcas = [];
$('#reales').innerHTML = REALES.map((s, i) => `<button class="btn mini" data-i="${i}">${s.nombre}<small>M${s.mag}</small></button>`).join('');
$$('#reales button').forEach((b) => b.addEventListener('click', () => mostrarReal(REALES[b.dataset.i], b)));

async function mostrarReal(s, boton) {
  $$('#reales button').forEach((x) => x.classList.toggle('activo', x === boton));
  $('#sismograma-info').textContent = 'Cargando el registro…';
  try {
    const reg = await cargarSismograma(s.archivo);
    const origen = Date.parse(s.origen);
    const tOrigen = (origen - reg.t0) / 1000; // ~60 s
    // Predicción del MISMO modelo del simulador para la estación UNM
    const d = distanciaKm(s.lat, s.lon, ESTACION_UNM.lat, ESTACION_UNM.lon);
    const R = Math.hypot(d, s.prof);
    const tP = tOrigen + R / VEL_P, tS = tOrigen + R / VEL_S;
    // Detección automática (STA/LTA), como hacen los sensores de verdad
    const det = staLta(reg.datos, reg.fs, { sta: 1, lta: 30, umbral: 5, desde: Math.max(0, Math.floor((tOrigen - 30) * reg.fs)) });
    const tDet = det ? det.indice / reg.fs : null;
    sisMarcas = [
      { t: tOrigen, color: '#ffffff', texto: 'Origen', punteada: true, y: 12 },
      { t: tP, color: '#4fc3ff', texto: 'P modelo', punteada: true, y: 24 },
      { t: tS, color: '#ff6060', texto: 'S modelo', punteada: true, y: 36 },
    ];
    if (tDet !== null) sisMarcas.push({ t: tDet, color: '#3ddc97', texto: 'P detectada', y: 48 });
    sisActual = { s, reg, tOrigen };
    dibujarSismograma(cvSis, reg, { marcas: sisMarcas, titulo: `${ESTACION_UNM.codigo} · ${ESTACION_UNM.nombre} · componente vertical` });
    const err = tDet !== null ? tDet - tP : null;
    $('#sismograma-info').innerHTML = `
      <b>${s.nombre}</b> · M${s.mag} a ${fmt(d)} km de la estación.<br>
      Modelo: onda P a los <b>${fmt(tP - tOrigen, 1)} s</b> y S a los <b>${fmt(tS - tOrigen, 1)} s</b> del origen.
      ${tDet !== null ? `STA/LTA detectó la P a los <b>${fmt(tDet - tOrigen, 1)} s</b> (diferencia con el modelo: ${err >= 0 ? '+' : ''}${fmt(err, 1)} s).` : 'STA/LTA no encontró un inicio claro.'}
      <span class="nota">Registro real: estación G.UNM (red GEOSCOPE), servicio FDSN de EarthScope. El sensor puede saturarse con sismos muy fuertes.</span>`;
    $('#btn-escuchar').disabled = false;
  } catch (e) {
    $('#sismograma-info').textContent = '⚠️ ' + e.message;
  }
}

$('#btn-escuchar').addEventListener('click', () => {
  if (!sisActual) return;
  const factor = +$('#sel-acelerar').value;
  sisDur = sonificar(sisActual.reg, factor, () => { sisInicio = 0; });
  sisInicio = performance.now();
  guia.completar('sismoReal');
});

function animarSismograma() {
  if (sisActual && sisInicio && app.capa === 'tectonica') {
    const f = (performance.now() - sisInicio) / 1000 / sisDur;
    if (f <= 1) dibujarSismograma(cvSis, sisActual.reg, { marcas: sisMarcas, cursor: f * (sisActual.reg.datos.length / sisActual.reg.fs) });
  }
  requestAnimationFrame(animarSismograma);
}
animarSismograma();

// ---------------------------------------------------------------------
// Haz tu propio sismo (acelerómetro / micrófono)
// ---------------------------------------------------------------------
const cvSen = $('#sensor-cv');
const disparos = [];
$('#btn-sensor').addEventListener('click', async () => {
  if (sensorActivo()) {
    detenerSensor();
    $('#btn-sensor').textContent = '📳 Activar mi sismógrafo';
    return;
  }
  $('#sensor-info').textContent = 'Pidiendo permiso…';
  try {
    const tipo = await iniciarSensor({
      onDatos: (st) => {
        dibujarSensor(cvSen, st, disparos);
        const u = st.tipo === 'acelerometro' ? ' m/s²' : ' (nivel)';
        $('#sensor-info').innerHTML = `${st.tipo === 'acelerometro' ? '📳 Acelerómetro' : '🎙️ Micrófono'} · ahora: <b>${fmt(st.buf.at(-1)[1], 2)}${u}</b> · máximo: <b>${fmt(st.pico, 2)}${u}</b>`;
      },
      onDeteccion: (d) => {
        disparos.push(d);
        audio.golpeP(0.6);
        $('#sensor-alerta').hidden = false;
        $('#sensor-alerta').textContent = `¡Sismo detectado! STA/LTA = ${fmt(d.cociente, 1)}`;
        setTimeout(() => ($('#sensor-alerta').hidden = true), 1500);
        guia.completar('tuSismo');
      },
    });
    $('#btn-sensor').textContent = '■ Detener sismógrafo';
    guia.decir(tipo === 'acelerometro' ? '¡Listo! Pon la tablet en la mesa y da un salto o un golpe junto a ella.' : 'Esta computadora no tiene acelerómetro, así que usamos el micrófono. ¡Aplaude o golpea la mesa!');
  } catch (e) {
    const motivo = e?.name === 'NotAllowedError' ? 'diste «no permitir» o el navegador lo bloqueó'
      : e?.name === 'NotFoundError' ? 'este equipo no tiene micrófono ni acelerómetro'
        : !window.isSecureContext ? 'abre la página con https:// o desde localhost'
          : e?.message || 'error desconocido';
    $('#sensor-info').textContent = '⚠️ No se pudo usar el sensor: ' + motivo;
  }
});

// ---------------------------------------------------------------------
// Simulacro: agáchate, cúbrete y sujétate
// ---------------------------------------------------------------------
const PASOS = [
  { id: 'agachate', ico: '🧎', txt: 'Agáchate', ok: true },
  { id: 'cubrete', ico: '🛡️', txt: 'Cúbrete bajo una mesa firme', ok: true },
  { id: 'sujetate', ico: '✊', txt: 'Sujétate de la mesa', ok: true },
  { id: 'elevador', ico: '🛗', txt: 'Usar el elevador', ok: false, porque: 'El elevador puede detenerse o atorarse. Nunca lo uses durante un sismo.' },
  { id: 'correr', ico: '🏃', txt: 'Correr y empujar', ok: false, porque: 'Correr y empujar causa caídas. Recuerda: no corro, no grito, no empujo.' },
  { id: 'foto', ico: '📸', txt: 'Tomar un video', ok: false, porque: 'Primero tu seguridad. El video puede esperar.' },
];
function iniciarSimulacro(ciudad) {
  const d = $('#simulacro');
  const orden = ['agachate', 'cubrete', 'sujetate'];
  let paso = 0;
  const t0 = performance.now();
  const opciones = [...PASOS].sort(() => Math.random() - 0.5);
  d.innerHTML = `<p class="sub">¡Suena la alerta en ${ciudad.nombre}!</p>
    <h2>Protégete: elige los 3 pasos en orden</h2>
    <p class="nota">Si no puedes salir rápido y seguro, quédate y protégete. Tienes <b>${fmt(ciudad.aviso)} s</b> antes de que llegue la onda S.</p>
    <div class="pasos-hechos"><span>1</span><span>2</span><span>3</span></div>
    <div class="opciones-sim">${opciones.map((p) => `<button class="btn opcion-sim" data-id="${p.id}"><span>${p.ico}</span>${p.txt}</button>`).join('')}</div>
    <p class="explica" id="sim-msg" hidden></p>`;
  d.hidden = false;
  audio.clic(700);
  $$('.opcion-sim', d).forEach((b) => (b.onclick = () => {
    const p = PASOS.find((x) => x.id === b.dataset.id);
    const msg = $('#sim-msg');
    if (!p.ok) { b.classList.add('malo'); msg.hidden = false; msg.textContent = '✋ ' + p.porque; audio.clic(250); return; }
    if (p.id !== orden[paso]) { msg.hidden = false; msg.textContent = 'Casi: el orden es agáchate, cúbrete y sujétate.'; audio.clic(300); return; }
    b.classList.add('bien'); b.disabled = true;
    $$('.pasos-hechos span', d)[paso].classList.add('hecho');
    $$('.pasos-hechos span', d)[paso].textContent = p.ico;
    paso++;
    audio.clic(900 + paso * 200);
    if (paso === 3) {
      const t = (performance.now() - t0) / 1000;
      const aTiempo = t < ciudad.aviso;
      d.innerHTML = `<p class="sub">Simulacro</p><h2>${aTiempo ? '¡A salvo! 🛡️' : 'No alcanzaste ⏱️'}</h2>
        <p>Te tomó <b>${fmt(t, 1)} s</b> protegerte. Tenías <b>${fmt(ciudad.aviso)} s</b> de aviso${aTiempo ? `: te sobraron ${fmt(ciudad.aviso - t)} s.` : '.'}</p>
        <p class="nota">Por eso la alerta sirve: unos segundos bastan para protegerte si sabes qué hacer.</p>
        <div class="acciones-ficha"><button class="btn primario" id="sim-ok">Seguir</button></div>`;
      $('#sim-ok').onclick = () => (d.hidden = true);
      if (aTiempo) guia.completar('simulacro');
    }
  }));
}

// ---------------------------------------------------------------------
// Encabezado: voz, pasaporte, créditos
// ---------------------------------------------------------------------
$('#btn-voz').hidden = !guia.vozDisponible();
$('#btn-voz').addEventListener('click', (e) => {
  const on = !guia.vozEncendida();
  guia.setVoz(on);
  e.currentTarget.setAttribute('aria-pressed', String(on));
  if (on) guia.hablar('Voz activada. Leeré cada ficha en voz alta.');
});
$('#btn-pasaporte').addEventListener('click', () => guia.abrirPasaporte());
guia.montarGuia();
guia.onProgreso((n, total) => { $('#btn-pasaporte span:last-child').textContent = `${n}/${total}`; });
audio.cargarManifiesto().then(() => {
  const cr = audio.creditos();
  $('#creditos-sonido').innerHTML = cr.length
    ? cr.map((c) => `<li><b>${c.titulo || c.clave}</b>: ${c.autor || '¿autor?'}, ${c.licencia || '¿licencia?'}${c.fuente ? ` · <a href="${c.fuente}" target="_blank" rel="noopener">fuente</a>` : ''}</li>`).join('')
    : '<li>Todos los sonidos actuales están sintetizados por la aplicación (Web Audio API).</li>';
});

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
document.body.dataset.capa = '';
cambiarCapa('estados');
sincronizarControles();
const inicio = $('#inicio');
$('#btn-empezar').addEventListener('click', () => { audio.iniciarAudio(); inicio.classList.add('fuera'); setTimeout(() => (inicio.hidden = true), 600); });
$('#btn-empezar-ar').addEventListener('click', () => {
  audio.iniciarAudio();
  inicio.classList.add('fuera');
  setTimeout(() => (inicio.hidden = true), 600);
  renderer.setAnimationLoop(null);
  entrarAR();
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  const mapaTeclas = { 1: 'estados', 2: 'tectonica', 3: 'volcanes', 4: 'biodiversidad', 5: 'clima' };
  if (mapaTeclas[e.key]) cambiarCapa(mapaTeclas[e.key]);
  if (e.key === ' ' && app.capa === 'tectonica') { e.preventDefault(); $('#btn-sismo').click(); }
  if (e.key === 'Escape') cerrarFicha();
});

// Exponer para depuración
window.mexicoVivo = { mapa, sim, app, camara, renderer, escena, controles };
