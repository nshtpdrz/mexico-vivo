// =====================================================================
//  México Vivo — aplicación principal
// =====================================================================
import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';
import { MapaMexico, crearEtiqueta, vec } from './mapa3d.js';
import { SimuladorSismo, dibujarCorte, ROMANOS, DESC_MMI, energia } from './sismo.js';
import { obtenerClima, obtenerSismosUSGS, regresion } from './apis.js';
import { montarSismosVivo } from './sismos-vivo.js';
import { ERAS, SITIOS, EVENTOS, INMATERIAL, CULTURA_ESTADOS } from './cultura.js';
import { abrirVolcan, cerrarVolcan } from './volcan3d.js';
import { abrirEspecie, cerrarEspecie } from './especie3d.js';
import { Tsunami } from './tsunami.js';
import { Meteoros, SAFFIR } from './meteoros.js';
import { VientoVivo } from './viento-vivo.js';
import { crearVisor } from './visor-vr.js';
import { crearRecorrido } from './recorrido.js';
import { PATRONES } from './patrones.js';
const pi = (id) => `<img class="pi" loading="lazy" src="assets/pegatinas/ui/${id}.png" alt="">`;
import { LENGUA_ESTADOS, RESUMEN_LENGUAS, TOP_LENGUAS, FAMILIAS, FUENTES_LENGUAS } from './lenguas.js';
import { MARAVILLAS, TIPOS_MARAVILLA, FUENTES_MARAVILLAS } from './maravillas.js';
import { FUENTES_SABORES, ORIGENES, LINEA_SABORES, PASOS_NIXTAMAL, EFECTOS_NIXTAMAL, OTROS_ALIMENTOS, PENDIENTES_SABORES } from './sabores.js';
import { colorLenguas } from './mapa3d.js';
import { desproyectar, distanciaKm, proyectar } from './geo.js';
import * as audio from './audio.js';
import * as ev from './evaluacion.js';
import * as guia from './guia.js';
import { organizarPanel, mostrarPestana, pintarMisiones, reiniciarPanel, actualizarPestanas } from './panel.js';
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
// 1.5 como máximo: en tablets con pantalla de densidad 2–3 dibujar al doble cuesta hasta 4× más
// pixeles y con el antialias casi no se nota la diferencia
renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
// las sombras se recalculan unas 20 veces por segundo, no en cada cuadro (ver bucle())
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
vista.appendChild(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(38, 1, 0.01, 20);
camara.position.set(0.0, 0.86, 0.66);
const controles = new OrbitControls(camara, renderer.domElement);
controles.target.set(0.0, 0, 0.04);
controles.enableDamping = true;
controles.minDistance = 0.06;
controles.maxDistance = 2.2;
controles.maxPolarAngle = Math.PI * 0.47;
controles.zoomSpeed = 0.8; // (pellizco en pantallas táctiles)

// Zoom suave con la rueda del ratón, hacia el punto donde está el cursor.
// La rueda manda "saltos"; los acumulamos y los aplicamos poco a poco en cada cuadro.
let zoomPendiente = 0;
const puntoZoom = new THREE.Vector3();
let hayPuntoZoom = false;
$('#vista').addEventListener('wheel', (e) => {
  e.preventDefault();
  e.stopPropagation(); // que OrbitControls no haga su zoom a saltos
  const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
  zoomPendiente = Math.max(-900, Math.min(900, zoomPendiente + d));
  const r = renderer.domElement.getBoundingClientRect();
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
  hayPuntoZoom = !!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), puntoZoom);
}, { capture: true, passive: false });

function aplicarZoom(dt) {
  if (Math.abs(zoomPendiente) < 0.5) { zoomPendiente = 0; return; }
  const paso = zoomPendiente * Math.min(1, dt * 9);
  zoomPendiente -= paso;
  const dist = camara.position.distanceTo(controles.target);
  const nueva = Math.max(controles.minDistance, Math.min(controles.maxDistance, dist * Math.exp(paso * 0.0013)));
  const fr = nueva / dist;
  if (hayPuntoZoom && fr < 1) {
    // acercarse hacia el cursor: el punto bajo el ratón se queda bajo el ratón
    const mover = puntoZoom.clone().sub(controles.target).multiplyScalar(1 - fr);
    controles.target.add(mover);
    camara.position.add(mover);
  }
  controles.target.x = Math.max(-0.5, Math.min(0.5, controles.target.x));
  controles.target.z = Math.max(-0.35, Math.min(0.35, controles.target.z));
  const off = camara.position.clone().sub(controles.target).multiplyScalar(fr);
  camara.position.copy(controles.target).add(off);
}

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
const vientoVivo = new VientoVivo(mapa);
mesa.add(mapa.root);

// ---------------------------------------------------------------------
// Estado de la aplicación
// ---------------------------------------------------------------------
const app = {
  capa: 'estados',
  maravillasVistas: new Set(), // expedición de Maravillas (se reinicia en modo exhibición)
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
    cuentaS.llego(c);
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
    if ($('#chk-tsunami').checked) tsunami.iniciar(sim.cfg); else { tsunami.detener(); $('#tsunami-res').innerHTML = ''; }
    app.prediccion = +$('#rng-pred').value;
    $('#poe-res').hidden = true;
    log.innerHTML = '';
    $('#btn-sismo').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/detener.png" alt="">Detener';
    $('#btn-sismo').classList.add('peligro');
    $('#btn-sismo-flotante').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/detener.png" alt="">Detener';
    $('#btn-sismo-flotante').classList.add('peligro');
    cuentaS.preparar(sim.res);
  },
  onEvento(texto, tipo, t) {
    const li = document.createElement('li');
    li.className = 'ev-' + tipo;
    li.innerHTML = `<span class="t">${t.toFixed(1)} s</span>${texto}`;
    log.prepend(li);
  },
  onTiempo(t, rP, rS) {
    $('#sismo-reloj').textContent = `${t.toFixed(1)} s`;
    cuentaS.tic(t);
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
    $('#btn-sismo').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/ruptura.png" alt="">Simular sismo';
    $('#btn-sismo').classList.remove('peligro');
    $('#btn-sismo-flotante').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/ruptura.png" alt="">Simular';
    $('#btn-sismo-flotante').classList.remove('peligro');
    cuentaS.ocultar();
  },
  onResultados(res, cfg) {
    pintarResultados(res, cfg);
  },
});

// ---------------------------------------------------------------------
// Tsunami (sismos en el mar)
// ---------------------------------------------------------------------
const minutos = (h) => (h < 1 ? `${fmt(h * 60)} min` : `${Math.floor(h)} h ${fmt((h % 1) * 60)} min`);
const tsunami = new Tsunami(mapa, {
  onResultado(res) {
    const el = $('#tsunami-res');
    if (!res.genera) { el.innerHTML = `<b>Sin tsunami.</b> ${res.razon}`; return; }
    el.innerHTML = `<b>¡Tsunami en el ${res.oceano === 'golfo' ? 'Golfo de México y el Caribe' : 'Pacífico'}!</b> Llegada estimada y altura aproximada de la ola:
      <table class="tabla-tsunami"><thead><tr><th>Puerto</th><th>km</th><th>Llega en</th><th>Ola</th></tr></thead><tbody>
      ${res.ciudades.slice(0, 7).map((c) => `<tr><td>${c.nombre}</td><td>${fmt(c.d)}</td><td>${minutos(c.horas)}</td><td><span class="ola ${c.altura >= 3 ? 'alta' : c.altura >= 1 ? 'media' : ''}">~${fmt(c.altura, 1)} m</span></td></tr>`).join('')}
      </tbody></table>
      <span class="nota">Si estás en la playa y sientes un sismo fuerte, no esperes la alerta: aléjate del mar y sube a una zona alta.</span>`;
  },
  onLlegada(c) {
    const li = document.createElement('li');
    li.className = 'ev-tsunami';
    li.innerHTML = `<span class="t">${minutos(c.horas)}</span>Tsunami llega a ${c.nombre}: ola de ~${fmt(c.altura, 1)} m`;
    log.prepend(li);
    audio.ola(Math.min(1, c.altura / 4), (c.lon + 102.5) / 15);
    guia.completar('tsunami');
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
  estados: () => Object.values(REGIONES).map((r) => [r.color, r.nombre]).concat([['#f2b21b', 'Hidalgo (nuestro estado)']]),
  tectonica: () => Object.values(ZONAS_SISMICAS).map((z) => [z.color, z.nombre])
    .concat([['#ff3b3b', 'Subducción'], ['#ffd23a', 'Divergente'], ['#3ad1ff', 'Transformante']]),
  volcanes: () => [['#5b3a2a', 'Volcán (altura proporcional)'], ['#ff7a1a', 'Eje Neovolcánico'], ['#2b2f3a', 'Sitio geológico']],
  biodiversidad: () => Object.values(BIOMAS).map((b) => [b.color, b.nombre]),
  clima: () => escalaLeyenda(),
  historia: () => [['#c9b48a', 'Zona arqueológica'], ['#e0b9a0', 'Ciudad virreinal'], ['#ffc21a', 'Historia moderna'], ['#e0a21b', 'Hidalgo']],
  lenguas: () => [0.2, 2, 8, 16, 31.2].map((p) => [colorLenguas(p), `${p} %`]),
  cultura: () => Object.values(REGIONES).map((r) => [r.color, r.nombre]).concat([['#e2b8a0', 'Cada tradición indica su región o comunidad']]),
  maravillas: () => Object.values(TIPOS_MARAVILLA).map((t) => [t.color, t.nombre]),
  sabores: () => [['#f2c23a', 'Maíz'], ['#e2873a', 'Calabaza'], ['#d23a2a', 'Chile'], ['#7a4a2a', 'Cacao'], ['#6a2335', 'Frijol (región genética)'], ['#c7ab84', 'Ubicación aproximada de la evidencia']],
};

function cambiarCapa(capa) {
  if (app.modoAR === false && capa === app.capa && document.body.dataset.capa === capa) return;
  app.capa = capa;
  document.body.dataset.capa = capa;
  mapa.setCapa(capa);
  mapa.capas.usgs.visible = capa === 'tectonica' && $('#chk-usgs').checked;
  $$('.capas button').forEach((b) => b.setAttribute('aria-selected', b.dataset.capa === capa));
  $(`.capas button[data-capa="${capa}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); // con 10 pestañas o letra grande, la activa siempre a la vista
  $$('.panel-capa').forEach((s) => (s.hidden = s.dataset.capa !== capa));
  cerrarFicha();
  audio.detenerAmbiente();
  audio.detenerGrabacion();
  if (capa !== 'tectonica') { sim.detener(); tsunami.detener(); }
  if (capa !== 'clima') meteorosRef?.detener(); // var: puede llamarse antes de crear los meteoros
  if (capa === 'tectonica') { sim._calcular(); pintarAvisoSeguro(); }
  if (capa === 'clima' && !app.clima) cargarClima();
  if (capa === 'historia') ponerAnio(app.anio ?? null);
  pintarLeyenda();
  audio.clic(660);
  guia.alEntrarCapa(capa);
  if (capa !== 'tectonica') { detenerSensor(); detenerSonido(); }
}

// barra de capas: difumina la orilla mientras haya pestañas escondidas, para que se note que se desliza
const barraCapas = $('.capas');
function marcarDesliz() {
  const { scrollLeft: x, scrollWidth: w, clientWidth: c } = barraCapas;
  barraCapas.classList.toggle('mas-izq', x > 4);
  barraCapas.classList.toggle('mas-der', x + c < w - 4);
}
barraCapas.addEventListener('scroll', marcarDesliz, { passive: true });
addEventListener('resize', marcarDesliz);
requestAnimationFrame(marcarDesliz);

function pintarLeyenda() {
  const items = LEYENDAS[app.capa]();
  const ley = $('#leyenda');
  const abierta = ley.classList.contains('abierta');
  // en celular la leyenda empieza plegada (un botón con las muestras de color) para no tapar el mapa
  ley.innerHTML = `<button class="ley-boton" aria-expanded="${abierta}" aria-controls="ley-items"><span class="ley-muestras">${items.slice(0, 5).map(([c]) => `<i style="background:${c}"></i>`).join('')}</span>Leyenda</button>
    <div class="ley-items" id="ley-items">${items.map(([c, t]) => `<div><i style="background:${c}"></i>${t}</div>`).join('')}</div>`;
  $('.ley-boton', ley).onclick = () => {
    const ab = ley.classList.toggle('abierta');
    $('.ley-boton', ley).setAttribute('aria-expanded', String(ab));
  };
}

$$('.capas button').forEach((b) => b.addEventListener('click', () => cambiarCapa(b.dataset.capa)));
// la orilla desvanecida de la barra de capas desaparece al llegar al final
{
  const barraCapas = $('.capas');
  const revisarFinal = () => barraCapas.classList.toggle('al-final', barraCapas.scrollLeft + barraCapas.clientWidth >= barraCapas.scrollWidth - 4);
  barraCapas.addEventListener('scroll', revisarFinal, { passive: true });
  addEventListener('resize', revisarFinal);
  setTimeout(revisarFinal, 500);
}

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

// Niveles de explicación (evolución del antiguo «modo sencillo"):
//  · exploradores (6–11): letra grande, poco texto, una frase sencilla por capa
//  · aventureros (12–17): la vista normal
//  · descubridores (adultos): además, ecuaciones, supuestos y límites de los modelos
// Los tres usan los MISMOS hechos: cambia la profundidad, no la exactitud.
const NIVELES = { exploradores: 'Exploradores', aventureros: 'Aventureros', descubridores: 'Descubridores' };
function ponerNivel(nivel, avisar = false) {
  if (!NIVELES[nivel]) nivel = 'aventureros';
  app.nivel = nivel;
  document.body.classList.remove('nivel-exploradores', 'nivel-aventureros', 'nivel-descubridores');
  document.body.classList.add('nivel-' + nivel);
  document.body.classList.toggle('sencillo', nivel === 'exploradores'); // reutiliza los estilos del modo sencillo
  $$('.panel details:not([data-tab="comprende"])').forEach((d) => { d.open = nivel === 'descubridores'; });
  actualizarPestanas();
  $$('.niveles .nivel').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.nivel === nivel)));
  const b = $('#btn-sencillo');
  b.setAttribute('aria-pressed', String(nivel !== 'aventureros'));
  b.title = `Nivel: ${NIVELES[nivel]} (toca para cambiar)`;
  b.dataset.nivel = nivel[0].toUpperCase();
  try { sessionStorage.setItem('mv-nivel', nivel); } catch (_) {}
  if (avisar) guia.decir(`Nivel ${NIVELES[nivel]}: ${nivel === 'exploradores' ? 'explicaciones cortas y botones grandes.' : nivel === 'descubridores' ? 'con ecuaciones, supuestos y límites de los modelos.' : 'la vista completa.'}`, { ms: 4000 });
}
$('#btn-sencillo').addEventListener('click', () => {
  const orden = Object.keys(NIVELES);
  ponerNivel(orden[(orden.indexOf(app.nivel) + 1) % orden.length], true);
});
$$('.niveles .nivel').forEach((b) => b.addEventListener('click', () => { ponerNivel(b.dataset.nivel); audio.clic(880); }));
let nivelGuardado = null;
try { nivelGuardado = sessionStorage.getItem('mv-nivel') || (localStorage.getItem('mv-sencillo') === '1' ? 'exploradores' : null); } catch (_) {}
ponerNivel(nivelGuardado || 'aventureros');

// ---------------------------------------------------------------------
// Ficha de información
// ---------------------------------------------------------------------
const ficha = $('#ficha');
function abrirFicha({ titulo, sub = '', cuerpo = '', chips = [], acciones = [], color = null, revision = false, patron = null }) {
  const pat = patron && PATRONES[patron];
  if (!(document.body.classList.contains("en-recorrido") && innerWidth <= 900)) plegarPanel(false);
  ficha.hidden = false;
  ficha.style.setProperty('--acento', color || 'var(--oro)');
  ficha.innerHTML = `
    <button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sub">${sub}</p>
    <h2>${titulo}</h2>
    ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>` : ''}
    <div class="cuerpo">${cuerpo}</div>
    
    <div class="acciones-ficha">${acciones.map((a, i) => `<button class="btn ${a.clase || ''}" data-i="${i}">${a.texto}</button>`).join('')}</div>`;
  $('.cerrar', ficha).onclick = cerrarFicha;
  $$('.acciones-ficha button[data-i]', ficha).forEach((b) => (b.onclick = () => acciones[b.dataset.i].fn()));
  ficha.classList.remove('entra');
  void ficha.offsetWidth;
  ficha.classList.add('entra');
  $('#panel').scrollTo({ top: 0, behavior: 'smooth' });
}
function cerrarFicha() {
  ficha.hidden = true;
  fondoEstado(null);
  audio.detenerGrabacion();
  mapa.seleccionar(null);
  app.seleccion = null;
}

// ---------------------------------------------------------------------
// Fondo según el estado: al tocar un estado, la página se viste con el patrón artesanal de ese
// estado (dos capas que se cruzan suavemente). Al cerrar la ficha vuelve el fondo tranquilo.
// ---------------------------------------------------------------------
// El patrón del estado viste toda la página (el fondo detrás del mapa y del panel);
// el tablero del mapa queda limpio encima.
let fondoVR = null; // lo asigna el visor VR (pared con el patrón)
function fondoEstado(id) {
  const pagina = document.body;
  if (id && !PATRONES[id]) id = null;
  mapa.setPatron(id); // también sobre el relieve del estado: se ve en AR y en el visor VR
  fondoVR?.(id); // y en el visor VR, como pared tapizada alrededor
  if ((app.fondoPatron ?? null) === id) return;
  app.fondoPatron = id;
  pagina.classList.toggle('con-patron', !!id);
  if (id) {
    pagina.style.setProperty('--patron', `url("${new URL(`assets/patrones/${id}.jpg`, location.href).href}")`);
    pagina.classList.remove('patron-entra'); void pagina.offsetWidth; pagina.classList.add('patron-entra');
  }
}

function fichaEstado(id) {
  const r = mapa.estados.get(id);
  if (!r) return;
  const e = r.info;
  mapa.seleccionar(id);
  app.seleccion = id;
  fondoEstado(id);
  const pan = (e.lon + 102.5) / 15;
  if (id === 'MX-HID') guia.completar('hidalgo');
  const base = {
    patron: id,
    titulo: r.nombre,
    sub: `Capital: ${e.capital} · ${REGIONES[e.region].nombre}`,
    color: REGIONES[e.region].color,
  };
  if (app.capa === 'historia') {
    // sitios dentro del estado o a menos de 120 km de su capital, del más antiguo al más reciente
    const sitios = SITIOS.filter((s) => distanciaKm(s.lat, s.lon, e.lat, e.lon) < 120).sort((a, b) => a.desde - b.desde);
    abrirFicha({
      ...base,
      cuerpo: `${sitios.length
        ? `<h3>Sitios históricos cercanos</h3><ul class="lista-sp lista-sitios-ficha">${sitios.map((s) => `<li data-id="${s.id}"><b>${s.nombre}</b> <i>${fechaAnio(s.desde)}${s.hasta < 2026 ? ' – ' + fechaAnio(s.hasta) : ''}</i></li>`).join('')}</ul>`
        : '<p>No hay sitios de la línea del tiempo cerca de este estado todavía.</p>'}
        <p class="dato">${e.dato}</p>`,
    });
    $$('.lista-sitios-ficha li', ficha).forEach((li) => (li.onclick = () => fichaObjeto({ tipo: 'sitio', data: SITIOS.find((s) => s.id === li.dataset.id) })));
    if (id === 'MX-HID') guia.completar('hidalgo');
    return;
  }
  if (app.capa === 'lenguas') {
    guia.completar('lenguas');
    const d = LENGUA_ESTADOS[id];
    const rango = Object.values(LENGUA_ESTADOS).filter((x) => x.pct2020 > d.pct2020).length + 1;
    const cambio = d.pct2020 - d.pct2010;
    abrirFicha({
      ...base, revision: false, color: colorLenguas(d.pct2020),
      chips: [`${fmt(d.pct2020, 1)} % en 2020`, `Lugar ${rango} de 32`],
      cuerpo: `<p>En 2020, el <b>${fmt(d.pct2020, 1)} %</b> de la población de 3 años y más de ${r.nombre} hablaba alguna lengua indígena${d.hab2020 ? ` (<b>${fmt(d.hab2020)}</b> personas)` : ''}. En 2010 era el ${fmt(d.pct2010, 1)} %${d.hab2010 ? ` (${fmt(d.hab2010)} personas)` : ''}.</p>
        <p>${Math.abs(cambio) < 0.05 ? 'El porcentaje se mantuvo igual.' : cambio > 0 ? `El porcentaje subió ${fmt(cambio, 1)} puntos.` : `El porcentaje bajó ${fmt(-cambio, 1)} puntos.`} Un porcentaje menor no siempre significa menos hablantes: también cambia el total de la población.</p>
        <p class="nota">Fuente: INEGI, Censo de Población y Vivienda 2020, presentación de resultados de la entidad (consulta: 18 nov 2026). Este dato no indica qué lenguas se hablan en la entidad.</p>`,
    });
    return;
  }
  if (app.capa === 'maravillas') {
    const cerca = MARAVILLAS.filter((m) => distanciaKm(m.lat, m.lon, e.lat, e.lon) < 350);
    abrirFicha({
      ...base, revision: false, color: '#2fae7a',
      cuerpo: cerca.length
        ? `<p>Maravillas cerca de aquí:</p><ul class="lista-sp lista-maravilla-ficha">${cerca.map((m) => `<li data-id="${m.id}"><b>${m.nombre}</b> · ${TIPOS_MARAVILLA[m.tipo].nombre}</li>`).join('')}</ul>`
        : '<p>Todavía no hay una maravilla registrada cerca de este estado. México tiene muchas más áreas naturales protegidas; aquí solo mostramos las que tienen reconocimiento de la UNESCO o estudios científicos que pudimos consultar.</p>',
    });
    $$('.lista-maravilla-ficha li', ficha).forEach((li) => (li.onclick = () => fichaObjeto({ tipo: 'maravilla', data: MARAVILLAS.find((m) => m.id === li.dataset.id) })));
    return;
  }
  if (app.capa === 'sabores') {
    // sitios a menos de 250 km de la capital; los platillos viven en la capa Cultura
    const cerca = ORIGENES.filter((o) => distanciaKm(o.lat, o.lon, e.lat, e.lon) < 250);
    const k = CULTURA_ESTADOS[id] || {};
    abrirFicha({
      ...base, revision: false, color: '#c7ab84',
      cuerpo: `${cerca.length
        ? `<p>Cerca de aquí hay evidencia arqueológica de alimentos antiguos:</p><ul class="lista-sp lista-origen-ficha">${cerca.map((o) => `<li data-id="${o.id}"><b>${o.alimento}</b> · ${o.nombre}</li>`).join('')}</ul>`
        : '<p>En esta capa todavía no hay sitios registrados cerca de este estado. Eso no significa que aquí no haya historia alimentaria.</p>'}
        ${k.platillo ? '<p class="nota">Los platillos de la región están en la capa Cultura.</p>' : ''}`,
      acciones: k.platillo ? [{ texto: 'Ver su platillo en Cultura', fn: () => { cambiarCapa('cultura'); fichaEstado(id); } }] : [],
    });
    $$('.lista-origen-ficha li', ficha).forEach((li) => (li.onclick = () => fichaObjeto({ tipo: 'origen', data: ORIGENES.find((o) => o.id === li.dataset.id) })));
    return;
  }
  if (app.capa === 'cultura') {
    const k = CULTURA_ESTADOS[id] || {};
    if (k.sonido) { audio.reproducirGrabacion(k.sonido, pan); guia.completar('musica'); }
    const rasgos = [['Platillo', k.platillo], ['Artesanía', k.artesania], ['Tradición', k.tradicion]].filter(([, v]) => v);
    abrirFicha({
      ...base,
      cuerpo: `${rasgos.length ? rasgos.map(([t, v]) => `<p class="rasgo"><b>${t}:</b> ${v}</p>`).join('') : '<p>Todavía no hay rasgos culturales registrados para este estado.</p>'}
        ${k.sonido && audio.tieneGrabacion(k.sonido) ? '<p class="nota">Suena música tradicional de la región.</p>' : ''}`,
      acciones: k.sonido ? [{ texto: 'Escuchar su música', fn: () => audio.reproducirGrabacion(k.sonido, pan) }, { texto: 'Detener', clase: 'sec', fn: () => audio.detenerGrabacion() }] : [],
    });
    if (id === 'MX-HID') guia.completar('hidalgo');
    return;
  }
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
      chips: [`<img class="pi" loading="lazy" src="assets/pegatinas/ui/hoja.png" alt="">${b.nombre}`, '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sonido.png" alt="">Paisaje sonoro'],
      cuerpo: `<p>${b.texto}</p>${sp.length ? `<h3>Especies cercanas</h3><ul class="lista-sp">${sp.map((s) => `<li>${pi(s.icono)}<b>${s.nombre}</b> <i>${s.cientifico}</i></li>`).join('')}</ul>` : ''}<p class="dato"><img class="pi" loading="lazy" src="assets/pegatinas/ui/idea.png" alt="">${e.dato}</p>`,
      acciones: [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/silencio.png" alt="">Silenciar ambiente', fn: () => audio.detenerAmbiente() }],
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
      ...base, revision: false,
      chips: [`${pi(ico)}${desc}`, `<img class="pi" loading="lazy" src="assets/pegatinas/ui/termometro.png" alt="">${fmt(c.temp, 1)} °C`, c.humedad != null ? `<img class="pi" loading="lazy" src="assets/pegatinas/ui/humedad.png" alt="">${c.humedad}%` : '', `<img class="pi" loading="lazy" src="assets/pegatinas/ui/viento.png" alt="">${fmt(c.viento)} km/h ${rumbo(c.dirViento)}`, `<img class="pi" loading="lazy" src="assets/pegatinas/ui/relieve.png" alt="">${fmt(c.altitud)} m`].filter(Boolean),
      cuerpo: `<p>Sensación térmica: <b>${fmt(c.sensacion, 1)} °C</b>${c.presion ? ` · Presión: <b>${fmt(c.presion)} hPa</b>` : ''}${c.lluvia ? ` · Lluvia: <b>${c.lluvia} mm</b>` : ''}</p>
        <p>Con el gradiente de −6.5 °C/km, a nivel del mar ${e.capital} tendría unos <b>${fmt(c.temp + 6.5 * (c.altitud / 1000), 1)} °C</b>.</p>
        ${c.presion ? `<p>La presión baja con la altura: a ${fmt(c.altitud)} m el aire «pesa» menos (al nivel del mar es ~1013 hPa).</p>` : ''}
        <p class="dato"><img class="pi" loading="lazy" src="assets/pegatinas/ui/idea.png" alt="">${e.dato}</p>`,
    });
    return;
  }
  if (app.capa === 'tectonica') {
    const z = ZONAS_SISMICAS[e.zona];
    abrirFicha({
      ...base, color: z.color, revision: false,
      chips: [z.nombre],
      cuerpo: `<p class="dato"><img class="pi" loading="lazy" src="assets/pegatinas/ui/idea.png" alt="">${e.dato}</p>`,
      acciones: [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/audifonos.png" alt="">Escuchar el sismo desde aquí', fn: () => { ponerEscucha(id); audio.clic(); } }],
    });
    return;
  }
  abrirFicha({
    ...base, revision: false,
    chips: [`<img class="pi" loading="lazy" src="assets/pegatinas/ui/hoja.png" alt="">${BIOMAS[e.bioma].nombre}`, `<img class="pi" loading="lazy" src="assets/pegatinas/ui/sismicidad.png" alt="">${ZONAS_SISMICAS[e.zona].nombre}`],
    cuerpo: `<p class="dato"><img class="pi" loading="lazy" src="assets/pegatinas/ui/idea.png" alt="">${e.dato}</p>`,
    acciones: [
      { texto: 'Ver todo de este estado', clase: 'primario', fn: () => fichaMiEstado(id) },
      { texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sismicidad.png" alt="">Ver su sismicidad', fn: () => { cambiarCapa('tectonica'); } },
      { texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/monarca.png" alt="">Ver su biodiversidad', fn: () => { cambiarCapa('biodiversidad'); fichaEstado(id); } },
    ],
  });
  audio.clic(990);
}

// «Mi estado»: una sola ficha que une lo que cada capa sabe del estado.
// Solo reúne datos que ya existen en la app (con su fuente o su aviso).
function fichaMiEstado(id) {
  const r = mapa.estados.get(id);
  if (!r) return;
  const e = r.info;
  mapa.seleccionar(id);
  app.seleccion = id;
  fondoEstado(id);
  const cerca = (lista, km) => lista.filter((x) => distanciaKm(x.lat, x.lon, e.lat, e.lon) < km);
  const volc = cerca(VOLCANES, 150);
  const lengua = LENGUA_ESTADOS[id];
  const sab = cerca(ORIGENES, 250);
  const mar = cerca(MARAVILLAS, 350);
  const k = CULTURA_ESTADOS[id] || {};
  const fila = (capa, titulo, texto) => `<li class="me-fila" data-capa="${capa}"><b>${titulo}</b><span>${texto}</span><i aria-hidden="true">›</i></li>`;
  abrirFicha({
    titulo: r.nombre, sub: `Mi estado · Capital: ${e.capital}`, color: REGIONES[e.region].color, revision: false,
    cuerpo: `<p>Toca un renglón para ir a esa capa.</p><ul class="mi-estado">
      ${fila('tectonica', 'Sismos', ZONAS_SISMICAS[e.zona].nombre)}
      ${fila('volcanes', 'Volcanes', volc.length ? `Cerca de su capital: ${volc.map((v) => v.nombre).join(', ')}` : 'No hay volcanes de la app a menos de 150 km de su capital')}
      ${fila('biodiversidad', 'Naturaleza', `Ecosistema predominante: ${BIOMAS[e.bioma].nombre}`)}
      ${lengua ? fila('lenguas', 'Lenguas', `${fmt(lengua.pct2020, 1)} % habla una lengua indígena (INEGI 2020)`) : ''}
      ${k.platillo ? fila('cultura', 'Cultura', k.platillo) : ''}
      ${fila('sabores', 'Sabores', sab.length ? sab.map((o) => `${o.alimento} en ${o.nombre}`).join('; ') : 'Aún no hay evidencia registrada cerca')}
      ${fila('maravillas', 'Maravillas', mar.length ? mar.map((m) => m.nombre).join('; ') : 'Aún no hay maravillas registradas cerca')}
    </ul><p class="nota">«Cerca» se mide desde la capital.</p>`,
  });
  $$('.mi-estado .me-fila', ficha).forEach((li) => (li.onclick = () => { cambiarCapa(li.dataset.capa); fichaEstado(id); }));
  if (id === 'MX-HID') guia.completar('hidalgo');
  audio.clic(880);
}

// Regla: dos toques en el mapa → distancia y tiempos de viaje de las ondas
const medida = { puntos: [], objetos: [] };
function limpiarMedida() {
  medida.objetos.forEach((o) => { mapa.root.remove(o); o.geometry?.dispose(); });
  medida.objetos = [];
  medida.puntos = [];
}
function activarMedida(on) {
  app.midiendo = on;
  limpiarMedida();
  $('#btn-medir').textContent = on ? 'Dejar de medir' : 'Empezar a medir';
  $('#btn-medir').classList.toggle('primario', on);
  const res = $('#medida-res');
  res.hidden = !on;
  res.innerHTML = on ? 'Toca el <b>primer punto</b> en el mapa.' : '';
}
function puntoMedida(p) {
  if (medida.puntos.length === 2) limpiarMedida();
  medida.puntos.push(p.clone());
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.006, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffc21a }));
  bola.position.set(p.x, p.y, 0.03);
  mapa.root.add(bola);
  medida.objetos.push(bola);
  audio.clic(medida.puntos.length === 1 ? 700 : 940);
  if (medida.puntos.length === 1) { $('#medida-res').innerHTML = 'Ahora toca el <b>segundo punto</b>.'; return; }
  const [a, b] = medida.puntos;
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, a.y, 0.03), new THREE.Vector3(b.x, b.y, 0.03)]);
  const linea = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffc21a }));
  mapa.root.add(linea);
  medida.objetos.push(linea);
  const [lon1, lat1] = desproyectar(a.x, a.y), [lon2, lat2] = desproyectar(b.x, b.y);
  const d = distanciaKm(lat1, lon1, lat2, lon2);
  const tiempo = (s) => (s < 90 ? `${fmt(s)} s` : s < 5400 ? `${fmt(s / 60)} min` : `${fmt(s / 3600, 1)} h`);
  $('#medida-res').innerHTML = `<b>${fmt(d)} km</b> en línea recta.<br>
    Onda P (≈6.5 km/s): <b>${tiempo(d / 6.5)}</b> · Onda S (≈3.6 km/s): <b>${tiempo(d / 3.6)}</b><br>
    <span class="no-exploradores">Tsunami en mar abierto (≈713 km/h, si el camino fuera por el océano): <b>${tiempo((d / 713) * 3600)}</b>.<br></span>
    <small>Toca otros dos puntos para medir de nuevo. Velocidades del modelo de la app.</small>`;
}

function rumbo(g) {
  if (g == null) return '';
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(g / 45) % 8];
}

// pegatina de cada tradición (capa Cultura)
const PEG_TRADICION = { voladores: 'celebracion', parachicos: 'celebracion', muertos: 'celebracion', charreria: 'celebracion', pirekua: 'mision-musica', mariachi: 'mision-musica', cocina: 'mision-nixtamal', talavera: 'ciudad-virreinal' };
function fichaObjeto(ud) {
  const d = ud.data;
  switch (ud.tipo) {
    case 'volcan': {
      const reg = mapa.volcanes.find((v) => v.v === d);
      abrirFicha({
        titulo: d.nombre, sub: d.tipo, color: '#e2622b',
        chips: [`<img class="pi" loading="lazy" src="assets/pegatinas/ui/relieve.png" alt="">${fmt(d.alt)} m`, d.estado],
        cuerpo: `<p>${d.dato}</p><p class="nota">Los volcanes del Eje Neovolcánico se forman porque la placa de Cocos, al hundirse a ~100 km, libera agua. El agua funde el manto y el magma sube.</p>`,
        acciones: [
          ...(d.relieve ? [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/relieve.png" alt="">Explorar su relieve real', clase: 'primario', fn: () => { abrirVolcan(d, VOLCANES.filter((o) => o !== d && o.relieve === d.relieve)); guia.completar('relieve'); } }] : []),
          { texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/erupcion.png" alt="">Simular erupción', clase: 'peligro', fn: () => { mapa.erupcion(reg); audio.erupcion((d.lon + 102.5) / 15); if (d.activo) guia.completar('erupcion'); } },
          ...(d.nombre === 'Popocatépetl' ? [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sonido.png" alt="">¿Cómo se pronuncia?', fn: () => audio.reproducirGrabacion('nombre-popocatepetl') }] : []),
        ],
      });
      audio.clic(500);
      break;
    }
    case 'sitio':
      abrirFicha({
        titulo: d.nombre, sub: `${d.cultura ? d.cultura + ' · ' : ''}${fechaAnio(d.desde)}${d.hasta < 2026 ? ' – ' + fechaAnio(d.hasta) : ''}`,
        color: d.tipo === 'arqueologico' ? '#c9b48a' : d.tipo === 'virreinal' ? '#e0b9a0' : '#ffc21a',
        chips: [d.tipo === 'arqueologico' ? '<img class="pi" loading="lazy" src="assets/pegatinas/ui/zona-arqueologica.png" alt="">Zona arqueológica' : d.tipo === 'virreinal' ? '<img class="pi" loading="lazy" src="assets/pegatinas/ui/ciudad-virreinal.png" alt="">Virreinato' : '<img class="pi" loading="lazy" src="assets/pegatinas/ui/historia-moderna.png" alt="">Historia moderna', ...(d.unesco ? [`<img class="pi" loading="lazy" src="assets/pegatinas/ui/region.png" alt="">Patrimonio Mundial UNESCO (${d.unesco})`] : [])],
        cuerpo: `<p>${d.dato}</p>`,
        acciones: [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/tiempo.png" alt="">Viajar a esa época', fn: () => { const a = Math.round((d.desde + Math.min(d.hasta, 2026)) / 2); $('#rng-anio').value = a; ponerAnio(a); } }],
      });
      if (d.id === 'tula') guia.completar('tula');
      audio.clic(800);
      break;
    case 'tradicion':
      abrirFicha({
        titulo: `${pi(PEG_TRADICION[d.id] ?? 'celebracion')}${d.nombre}`, sub: `Patrimonio Cultural Inmaterial (UNESCO) · ${d.anio}`, color: '#b3261e',
        chips: ['<img class="pi" loading="lazy" src="assets/pegatinas/cultura.png" alt="">Patrimonio Inmaterial', d.lugar],
        cuerpo: `<p>${d.dato}</p>`,
      });
      audio.clic(760);
      break;
    case 'maravilla': {
      // Expedición: primero quien explora adivina «¿por qué existe?», luego lee la respuesta
      const t = TIPOS_MARAVILLA[d.tipo];
      const yaVisitada = app.maravillasVistas.has(d.id);
      abrirFicha({
        titulo: d.nombre, sub: `${t.nombre}${d.anio ? ` · ${d.anio}` : ''}`, color: t.color, revision: false,
        chips: [d.lugar, ...(d.peligro ? ['En la Lista del Patrimonio en Peligro'] : []), 'Ubicación aproximada'],
        cuerpo: `<p class="m-pregunta"><b>Expedición:</b> ${d.pregunta.p}</p>
          <div class="m-opciones">${d.pregunta.o.map((o, i) => `<button class="btn sec" data-o="${i}">${o}</button>`).join('')}</div>
          <div class="m-respuesta" ${yaVisitada ? '' : 'hidden'}>
            <p class="rasgo m-resultado"></p>
            <p class="rasgo solo-exploradores">${d.nino}</p>
            <p class="rasgo no-exploradores"><b>¿Por qué existe?</b> ${d.porque}</p>
            <p class="dato">${d.dato}</p>
            <p class="nota">Fuente (nivel ${d.fuente.nivel}): <a href="${d.fuente.url}" target="_blank" rel="noopener">${d.fuente.cita}</a> Consulta: 18 nov 2026.</p>
          </div>`,
        acciones: d.enlace ? [{ texto: d.enlace.texto, clase: 'sec', fn: () => cambiarCapa(d.enlace.capa) }] : [],
      });
      const resp = $('.m-respuesta', ficha);
      $$('.m-opciones button', ficha).forEach((b) => (b.onclick = () => {
        const bien = Number(b.dataset.o) === d.pregunta.r;
        $$('.m-opciones button', ficha).forEach((x) => { x.disabled = true; x.classList.toggle('correcta', Number(x.dataset.o) === d.pregunta.r); });
        if (!bien) b.classList.add('incorrecta');
        $('.m-resultado', ficha).textContent = bien ? '¡Exacto!' : `Casi. La respuesta es: ${d.pregunta.o[d.pregunta.r]}.`;
        resp.hidden = false;
        audio.clic(bien ? 980 : 330);
        app.maravillasVistas.add(d.id);
        mapa.marcarMaravilla(d.id);
        pintarExpedicion();
        if (d.id === 'comarca') guia.completar('geoparque');
        if (app.maravillasVistas.size >= 3) guia.completar('expedicion');
      }));
      audio.clic(760);
      break;
    }
    case 'origen': {
      const citas = d.fuentes.map((k) => FUENTES_SABORES[k]);
      abrirFicha({
        titulo: d.nombre, sub: `${d.alimento} · ${d.lugar}`, color: d.color, revision: false,
        chips: [d.alimento, d.hace ? `Hace unos ${fmt(d.hace)} años` : 'La fuente no da fecha', 'Ubicación aproximada'],
        cuerpo: `<p class="solo-exploradores">${d.nino}</p>
          <p class="no-exploradores">${d.texto}</p>
          <p class="solo-descubridores">${d.avanzado}</p>
          <p class="nota">Fuente${citas.length > 1 ? 's' : ''}: ${citas.map((c) => `<a href="${c.url}" target="_blank" rel="noopener">${c.cita.match(/^[\p{L}'-]+/u)[0]}${/^[^.]*,/.test(c.cita) ? ' et al.' : ''} ${(c.cita.match(/(19|20)\d\d/) || [''])[0]}</a> (nivel ${c.nivel})`).join('; ')}. Consulta: ${citas[0].consulta}.</p>`,
      });
      guia.completar('sabores');
      audio.clic(720);
      break;
    }
    case 'geositio':
      abrirFicha({ titulo: d.nombre, sub: 'Sitio geológico', cuerpo: `<p>${d.dato}</p>`, color: '#7fa3ff' });
      break;
    case 'especie':
      abrirFicha({
        titulo: `${pi(d.icono)}${d.nombre}`, sub: d.cientifico, color: BIOMAS[d.bioma].color,
        chips: [d.estado, BIOMAS[d.bioma].nombre],
        cuerpo: `<p>${d.dato}</p>`,
        acciones: [
          { texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/relieve.png" alt="">Ver a tamaño real en 3D', clase: 'primario', fn: () => abrirEspecie(d) },
          { texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sonido.png" alt="">Escuchar su hábitat', fn: () => audio.ambienteBioma(BIOMAS[d.bioma].sonido, (d.lon + 102.5) / 15) },
        ],
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
    case 'pachuca':
      abrirFicha({ revision: false, titulo: 'Pachuca, Hidalgo', sub: 'Capital de nuestro estado', color: '#f2b21b', cuerpo: '<p>Prueba simular un sismo en la costa de Guerrero y mira cuánto tiempo de aviso tendría Pachuca.</p>', acciones: [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sismicidad.png" alt="">Probar', fn: () => { cambiarCapa('tectonica'); ponerEscucha('MX-HID'); sim.configurar({ lat: 16.98, lon: -99.77, mag: 7.4, prof: 20 }); sim.iniciar(); } }] });
      break;
    case 'usgs':
      abrirFicha({ revision: false,
        titulo: `M${d.mag.toFixed(1)} · ${d.lugar}`, sub: new Date(d.tiempo).toLocaleString('es-MX'), color: '#ff8a3a',
        chips: [`Profundidad ${fmt(d.prof)} km`, 'Dato real · USGS'],
        cuerpo: '<p>Sismo real registrado por la red mundial. Puedes simular cómo se propagaron sus ondas.</p>',
        acciones: [{ texto: '<img class="pi" loading="lazy" src="assets/pegatinas/ui/ruptura.png" alt="">Simular este sismo', fn: () => { sim.configurar({ lat: d.lat, lon: d.lon, mag: d.mag, prof: Math.max(5, Math.round(d.prof)) }); sincronizarControles(); sim.iniciar(); } }],
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
  // Las franjas grandes y translúcidas (Eje Neovolcánico, placa) no deben tapar lo que
  // está encima o dentro de ellas: un volcán, un sensor o un estado tienen prioridad.
  const fondo = new Set(['eje', 'placa']);
  const hit = (hits.find((h) => !fondo.has(h.object.userData?.tipo)) || hits[0])?.object || null;
  return { hit, enPapel };
}

function alClic(ev, cam, el) {
  audio.iniciarAudio();
  const { hit, enPapel } = lanzarRayo(ev, cam, el);
  const ud = hit?.userData;
  // la placa está bajo el mapa: tocarla no debe impedir elegir el epicentro
  if (app.midiendo && enPapel && Math.abs(enPapel.x) < 0.5 && Math.abs(enPapel.y) < 0.32) return puntoMedida(enPapel);
  if (ud && ud.tipo && ud.tipo !== 'estado' && ud.tipo !== 'placa') return fichaObjeto(ud);
  if (app.capa === 'tectonica' && enPapel && Math.abs(enPapel.x) < 0.5 && Math.abs(enPapel.y) < 0.32) {
    const [lon, lat] = desproyectar(enPapel.x, enPapel.y);
    sim.detener();
    sim.configurar({ lat, lon });
    $('#epi-texto').textContent = `${lat.toFixed(2)}°N, ${(-lon).toFixed(2)}°O`;
    audio.clic(440);
    pintarAviso();
    if (ud?.tipo === 'estado') fichaEstado(ud.id);
    return;
  }
  if (ud?.tipo === 'estado') return fichaEstado(ud.id);
  cerrarFicha();
}

// ---------------------------------------------------------------------
// Epicentro arrastrable: al mover la estrella, el mapa se pinta al instante con los segundos
// de aviso de cada estado (manipulación directa, sin oprimir «Simular»).
// ---------------------------------------------------------------------
var pintarAvisoListo = true; // eslint-disable-line no-var
const COLOR_AVISO = (a) => (a == null || a <= 0 ? '#d6343a' : a < 15 ? '#f08a2c' : a < 40 ? '#f2c94c' : a < 70 ? '#7fd36b' : '#2fa37a');
function pintarAviso() {
  if (app.capa !== 'tectonica' || !$('#chk-aviso-mapa').checked || !sim.res) return;
  for (const c of sim.res.ciudades) {
    const r = mapa.estados.get(c.id);
    if (!r) continue;
    r.colorObj.set(COLOR_AVISO(c.aviso));
    r.alturaObj = 0.006 + Math.max(0, Math.min(90, c.aviso ?? 0)) * 0.00035;
  }
  const esc = sim.res.ciudades.find((c) => c.id === sim.escucha);
  const conAviso = sim.res.ciudades.filter((c) => c.aviso > 0).length;
  if (sim.res.tAlerta == null) {
    $('#aviso-vivo').innerHTML = sim.cfg.mag < 5.5
      ? '<b>No se activa la alerta:</b> con magnitud menor a 5.5 no se emite aviso.'
      : '<b>No hay alerta:</b> el epicentro está a más de 300 km de los sensores de la costa; nadie recibe aviso.';
    return;
  }
  $('#aviso-vivo').innerHTML = esc
    ? `${esc.nombre}: <b>${esc.aviso > 0 ? `${Math.round(esc.aviso)} s de aviso` : 'sin aviso (la onda S llega antes que la alerta)'}</b> · ${conAviso} de 32 capitales con aviso`
    : '';
}
function quitarAviso() { if (app.capa === 'tectonica') mapa.setCapa('tectonica'); $('#aviso-vivo').textContent = ''; }
$('#chk-aviso-mapa').addEventListener('change', (e) => (e.target.checked ? pintarAviso() : quitarAviso()));
let arrastrandoEpi = false;
function cercaDelEpicentro(e) {
  const p = sim.estrella.getWorldPosition(new THREE.Vector3()).project(camara);
  const r = renderer.domElement.getBoundingClientRect();
  const sx = ((p.x + 1) / 2) * r.width + r.left, sy = ((1 - p.y) / 2) * r.height + r.top;
  return Math.hypot(e.clientX - sx, e.clientY - sy) < (e.pointerType === 'mouse' ? 26 : 40);
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (app.capa !== 'tectonica' || sim.corriendo || !cercaDelEpicentro(e)) return;
  arrastrandoEpi = true;
  e.stopImmediatePropagation(); // que OrbitControls no gire el mapa mientras se arrastra
  renderer.domElement.setPointerCapture?.(e.pointerId);
  renderer.domElement.style.cursor = 'grabbing';
}, { capture: true });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!arrastrandoEpi) return;
  e.stopImmediatePropagation();
  const { enPapel } = lanzarRayo(e, camara, renderer.domElement);
  if (!enPapel || Math.abs(enPapel.x) > 0.5 || Math.abs(enPapel.y) > 0.32) return;
  const [lon, lat] = desproyectar(enPapel.x, enPapel.y);
  sim.configurar({ lat, lon });
  $('#epi-texto').textContent = `${lat.toFixed(2)}°N, ${(-lon).toFixed(2)}°O`;
  pintarAviso();
}, { capture: true });
const soltarEpi = (e) => {
  if (!arrastrandoEpi) return;
  arrastrandoEpi = false;
  e.stopImmediatePropagation();
  renderer.domElement.style.cursor = 'crosshair';
  audio.clic(520);
  arrastre = null; // no contar el arrastre como un toque
};
renderer.domElement.addEventListener('pointerup', soltarEpi, { capture: true });
renderer.domElement.addEventListener('pointercancel', soltarEpi, { capture: true });

let arrastre = null;
function pintarAvisoSeguro() { if (typeof pintarAvisoListo !== 'undefined' && pintarAvisoListo) setTimeout(() => pintarAviso(), 0); }
renderer.domElement.addEventListener('pointerdown', (e) => { arrastre = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (arrastre && Math.hypot(e.clientX - arrastre[0], e.clientY - arrastre[1]) < 6) alClic(e, camara, renderer.domElement);
  arrastre = null;
});
// ---------------------------------------------------------------------
// Modo visor (VR con celular, tipo Cardboard): ver js/visor-vr.js
// ---------------------------------------------------------------------
const rayoVR = new THREE.Raycaster();
function rayoCentro(cam) {
  rayoVR.setFromCamera(new THREE.Vector2(0, 0), cam);
  const hits = rayoVR.intersectObjects(mapa.pickables.filter(visibleReal), false);
  const fondo = new Set(['eje', 'placa']);
  return { hit: (hits.find((h) => !fondo.has(h.object.userData?.tipo)) || hits[0])?.object || null };
}
function infoVR(ud) {
  const r = infoVRTexto(ud);
  if (!r) return null;
  const d = ud.data || {};
  const ui = (id) => `assets/pegatinas/ui/${id}.png`;
  r.imagen = {
    estado: `assets/pegatinas/${app.capa}.png`, volcan: ui(d.activo ? 'erupcion' : 'relieve'), especie: d.icono && ui(d.icono),
    sitio: ui(d.tipo === 'arqueologico' ? 'zona-arqueologica' : d.tipo === 'virreinal' ? 'ciudad-virreinal' : 'historia-moderna'),
    maravilla: 'assets/pegatinas/maravillas.png', tradicion: ui(PEG_TRADICION[d.id] ?? 'celebracion'), origen: 'assets/pegatinas/sabores.png',
  }[ud.tipo] ?? null;
  return r;
}
function infoVRTexto(ud) {
  const d = ud.data || {};
  switch (ud.tipo) {
    case 'estado': {
      fondoEstado(ud.id); // el estado elegido con la mirada: su patrón en el relieve y en la pared del visor
      const e = ESTADOS[ud.id];
      const k = CULTURA_ESTADOS[ud.id] || {};
      if (app.capa === 'cultura' && (k.platillo || k.tradicion)) return { titulo: ud.nombre, sub: 'Cultura', texto: [k.platillo && `Platillo: ${k.platillo}.`, k.tradicion && `Tradición: ${k.tradicion}.`].filter(Boolean).join(' ') };
      const c = app.clima?.datos?.[ud.id];
      if (app.capa === 'clima' && c) return { titulo: ud.nombre, sub: 'Clima ahora', texto: `${fmt(c.temp, 1)} °C · humedad ${c.humedad ?? '—'} % · viento ${fmt(c.viento ?? 0)} km/h.` };
      return { titulo: ud.nombre, sub: `Capital: ${e?.capital ?? ''}`, texto: e?.dato ?? '' };
    }
    case 'volcan': return { titulo: d.nombre, sub: `${fmt(d.alt)} m · ${d.estado ?? ''}`, texto: d.dato };
    case 'especie': return { titulo: d.nombre, sub: `${d.cientifico ?? ''} · ${d.estado ?? ''}`, texto: d.dato };
    case 'sitio': return { titulo: d.nombre, sub: d.cultura ?? 'Historia', texto: d.dato };
    case 'maravilla': return { titulo: d.nombre, sub: d.lugar, texto: d.nino ?? d.dato };
    case 'tradicion': return { titulo: d.nombre, sub: `Patrimonio Inmaterial (UNESCO) · ${d.anio}`, texto: d.dato };
    case 'origen': return { titulo: `${d.alimento} · ${d.nombre}`, sub: d.lugar, texto: d.nino ?? d.texto };
    default: return d.nombre || ud.nombre ? { titulo: d.nombre || ud.nombre, sub: '', texto: d.dato || '' } : null;
  }
}
const visor = crearVisor({
  renderer, escena, mapa, rayoCentro, infoDe: infoVR, mesa, sol,
  capas: [['estados', 'Estados'], ['tectonica', 'Sismos'], ['volcanes', 'Volcanes'], ['biodiversidad', 'Biodiv.'], ['clima', 'Clima'], ['historia', 'Historia'], ['cultura', 'Cultura'], ['lenguas', 'Lenguas'], ['sabores', 'Sabores'], ['maravillas', 'Maravillas']],
  cambiarCapa: (c) => cambiarCapa(c), capaActual: () => app.capa, fondoActual: () => app.fondoPatron ?? null,
  alCambiarTamano: () => setTimeout(() => { ultimoAncho = 0; redimensionar(); }, 60),
});
$('#btn-vr')?.addEventListener('click', () => { audio.iniciarAudio(); visor.entrar(); });
fondoVR = (id) => visor.setFondo(id);
if (new URLSearchParams(location.search).has('dev')) window.__visor = visor; // solo para pruebas

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
$('#rng-mag').addEventListener('input', (e) => { sim.configurar({ mag: +e.target.value }); $('#val-mag').textContent = (+e.target.value).toFixed(1); pintarAviso(); });
$('#rng-prof').addEventListener('input', (e) => { sim.configurar({ prof: +e.target.value }); $('#val-prof').textContent = e.target.value; pintarAviso(); });
$('#rng-vel').addEventListener('input', (e) => { sim.velocidad = +e.target.value; $('#val-vel').textContent = e.target.value + '×'; });
$('#chk-alerta').addEventListener('change', (e) => { sim.alertaActiva = e.target.checked; });
const selEsc = $('#sel-escucha');
Object.entries(ESTADOS).sort((a, b) => a[1].capital.localeCompare(b[1].capital)).forEach(([id, e]) => {
  selEsc.add(new Option(e.capital, id, false, id === 'MX-HID'));
});
const ponerEscucha = (id) => { sim.escucha = id; selEsc.value = id; $('#poe-ciudad').textContent = ESTADOS[id].capital; sim._calcular(); pintarAviso(); };
selEsc.addEventListener('change', () => ponerEscucha(selEsc.value));
$('#rng-pred').addEventListener('input', (e) => { $('#val-pred').textContent = `${e.target.value} s`; });
$('#btn-sismo').addEventListener('click', () => {
  audio.iniciarAudio();
  if (sim.corriendo) { tsunami.detener(); sim.detener(); sim.cb.onFin(); return; }
  sim.iniciar();
});
// Cuenta regresiva grande: desde que sale la alerta hasta que la onda S llega a la ciudad
// que escucha (segundos del sismo real, no del reloj acelerado). Al llegar, vibra la tablet.
const cuentaS = {
  el: $('#cuenta-s'), esc: null, tAlerta: null, timer: 0,
  preparar(res) {
    this.ocultar();
    this.esc = res?.ciudades.find((c) => c.id === sim.escucha) || null;
    this.tAlerta = sim.alertaActiva ? res?.tAlerta ?? null : null;
  },
  tic(t) {
    const c = this.esc;
    if (!c || this.tAlerta === null || c.aviso <= 0 || t < this.tAlerta || t >= c.tS || this.el.classList.contains('llego')) return;
    this.el.hidden = false;
    $('#cs-ciudad').innerHTML = `<img class="pi" loading="lazy" src="assets/pegatinas/ui/alerta.png" alt="">Alerta en ${c.nombre}`;
    $('#cs-num').textContent = Math.ceil(c.tS - t);
    $('#cs-txt').textContent = 'segundos para que llegue la onda S';
  },
  llego(c) {
    const sin = this.tAlerta === null || !(c.aviso > 0);
    this.el.hidden = false;
    this.el.classList.add('llego');
    this.el.classList.toggle('sin-aviso', sin);
    $('#cs-ciudad').textContent = c.nombre;
    $('#cs-num').textContent = '¡Llegó la onda S!';
    $('#cs-txt').textContent = sin ? 'Sin alerta: el sismo llegó sin aviso.' : `Tuviste ${Math.round(c.aviso)} s de aviso para protegerte.`;
    navigator.vibrate?.([400, 120, 400, 120, 800]);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.ocultar(), 4500);
  },
  ocultar() {
    clearTimeout(this.timer);
    this.el.hidden = true;
    this.el.classList.remove('llego', 'sin-aviso');
  },
};
// el mismo botón, flotando sobre el mapa: en tablet el del panel queda abajo, fuera de la vista
$('#btn-sismo-flotante').addEventListener('click', () => $('#btn-sismo').click());
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
  .map((v) => `<li data-n="${v.nombre}"><span>${pi(v.activo ? 'erupcion' : 'relieve')}${v.nombre.split(' (')[0]}</span><small>${fmt(v.alt)} m</small></li>`).join('');
$$('#lista-volcanes li').forEach((li) => li.addEventListener('click', () => fichaObjeto({ tipo: 'volcan', data: VOLCANES.find((v) => v.nombre === li.dataset.n) })));
$('#lista-especies').innerHTML = ESPECIES.map((s, i) => `<li data-i="${i}"><span>${pi(s.icono)}${s.nombre}</span><small>${s.estado}</small></li>`).join('');
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
        const lbl = crearEtiqueta(`${fmt(v, app.climaVar === 'temp' || app.climaVar === 'sensacion' ? 0 : 0)}${esc.unidad === '°C' ? '°' : esc.unidad === '%' ? '%' : ''}`, { prioridad: id === 'MX-HID' ? 4 : 2, tam: 0.016, fondo: 'rgba(8,12,20,0.72)' });
    lbl.position.copy(vec(e.lon, e.lat, 0.055));
    g.add(lbl);
    // flecha de viento (apunta hacia donde va el viento)
    if (c.viento != null && !vientoVivo.verViento) {
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
    if (!vientoVivo.verLluvia && ((c.lluvia ?? 0) > 0 || (c.codigo >= 51 && c.codigo <= 99))) crearLluvia(g, e);
  }
  const fuenteTxt = { vivo: '<i class="punto vivo"></i>En vivo', cache: '<i class="punto cache"></i>Último dato guardado', respaldo: '<i class="punto respaldo"></i>Sin internet: promedios anuales' }[fuente];
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
  app.gradHoy = b * 1000;
  pintarMonte();
}

// ---------------------------------------------------------------------
// Termómetro en la montaña: del nivel del mar a la cumbre del Pico de Orizaba (5,636 m).
// T(h) = T0 + g·h, con g el gradiente medido hoy (si es razonable) o el teórico −6.5 °C/km.
// T0 se estima con la temperatura de Xalapa (1,420 m) llevada al nivel del mar con el mismo gradiente.
// ---------------------------------------------------------------------
const CUMBRE = 5636;
const PISOS = [[0, 1000, '#3f9a57', 'Selva y cafetales'], [1000, 2500, '#5a8f4a', 'Bosque de niebla y encino'], [2500, 4000, '#2f6b45', 'Bosque de pino y oyamel'], [4000, 4600, '#a99d6b', 'Zacatonal alpino'], [4600, CUMBRE, '#eef3fb', 'Roca, nieve y glaciar']];
let monteH = 0;
const monte = {};
function gradienteMonte() { const g = app.gradHoy; return g && g < -3 && g > -10 ? g : -6.5; }
function pintarMonte() {
  const cv = $('#monte');
  if (!cv || !cv.offsetWidth) return;
  const W = cv.clientWidth, H = cv.clientHeight, dpr = devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const izq = 18, der = W - 18, base = H - 18, cima = 16;
  const yDe = (h) => base - (h / CUMBRE) * (base - cima);
  // perfil del volcán: ladera cóncava de la costa (izquierda) a la cumbre (derecha)
  const perfil = (u) => Math.pow(u, 1.8) * CUMBRE;
  const xDe = (h) => izq + Math.pow(h / CUMBRE, 1 / 1.8) * (der - izq - 40);
  g.fillStyle = '#0d1424'; g.fillRect(0, 0, W, H);
  // pisos de vegetación por altitud
  for (const [h0, h1, col] of PISOS) {
    g.beginPath();
    g.moveTo(izq, base);
    for (let u = 0; u <= 1.0001; u += 0.01) { const h = Math.min(h1, Math.max(h0, perfil(u))); g.lineTo(izq + u * (der - izq - 40), yDe(h)); }
    g.lineTo(der - 40, yDe(h0)); g.lineTo(der, base); g.closePath();
    g.save(); g.clip();
    g.fillStyle = col; g.fillRect(0, yDe(h1), W, yDe(h0) - yDe(h1));
    g.restore();
  }
  g.beginPath(); for (let u = 0; u <= 1.0001; u += 0.01) g.lineTo(izq + u * (der - izq - 40), yDe(perfil(u))); g.lineTo(der, base); g.strokeStyle = '#1a1530'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#4fc3ff'; g.fillRect(0, base, izq + 6, 18); // el mar
  // termómetro
  const T0 = (app.clima?.datos?.['MX-VER']?.temp ?? 19) - gradienteMonte() * 1.42;
  const T = T0 + gradienteMonte() * (monteH / 1000);
  const x = xDe(monteH), y = yDe(monteH) - 4;
  g.fillStyle = '#fff'; g.strokeStyle = '#1a1530'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(x - 5, y - 34, 10, 30, 5); g.fill(); g.stroke();
  const lleno = Math.max(0.08, Math.min(1, (T + 10) / 45));
  g.fillStyle = T < 0 ? '#4fc3ff' : '#e0473a';
  g.fillRect(x - 2.5, y - 6 - 24 * lleno, 5, 24 * lleno);
  g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.stroke();
  g.font = '600 13px Inter, sans-serif'; g.fillStyle = '#fff'; g.textAlign = x > W - 90 ? 'right' : 'left';
  g.fillText(`${fmt(T, 1)} °C · ${fmt(monteH)} m`, x + (g.textAlign === 'right' ? -12 : 12), y - 18);
  const piso = PISOS.find(([a, b]) => monteH >= a && monteH <= b);
  const fuente = app.gradHoy && gradienteMonte() === app.gradHoy ? `el gradiente que medimos hoy con las 32 capitales (${fmt(gradienteMonte(), 1)} °C/km)` : 'el gradiente teórico (−6.5 °C/km)';
  $('#monte-res').innerHTML = `A <b>${fmt(monteH)} m</b>: unos <b>${fmt(T, 1)} °C</b> · ${piso[3]}. Calculado con ${fuente}.${T < 0 ? ' <b>Bajo cero:</b> por eso hay nieve y glaciar en la cumbre.' : ''}`;
  monte.x = xDe; monte.y = yDe;
}
function moverMonte(e) {
  const cv = $('#monte'), r = cv.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  // buscar la altitud cuyo punto de la ladera está más cerca del dedo
  let mejor = 0, dist = Infinity;
  for (let h = 0; h <= CUMBRE; h += 20) { const d = Math.hypot(monte.x(h) - px, monte.y(h) - py); if (d < dist) { dist = d; mejor = h; } }
  monteH = mejor; $('#rng-monte').value = mejor; pintarMonte();
}
$('#monte').addEventListener('pointerdown', (e) => { $('#monte').setPointerCapture(e.pointerId); moverMonte(e); });
$('#monte').addEventListener('pointermove', (e) => { if (e.buttons) moverMonte(e); });
$('#rng-monte').addEventListener('input', (e) => { monteH = +e.target.value; pintarMonte(); });
new ResizeObserver(() => pintarMonte()).observe($('#monte'));

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
// Viento y lluvia en vivo (rejilla de Open-Meteo sobre todo el mapa)
function textoVientoVivo() {
  const el = $('#viento-estado');
  const r = vientoVivo.resumen();
  if (!vientoVivo.verViento && !vientoVivo.verLluvia) { el.textContent = ''; return; }
  if (!r) { el.textContent = vientoVivo.cargando ? 'Consultando viento y lluvia…' : 'Sin datos de viento todavía'; return; }
  const hora = r.hora ? r.hora.slice(11, 16) : '';
  const fuente = r.fuente === 'vivo' ? '<i class="punto vivo"></i>En vivo' : '<i class="punto cache"></i>Último dato guardado';
  const lluvia = r.conLluvia ? `${pi('lluvia')}llueve en ${r.conLluvia} zona${r.conLluvia === 1 ? '' : 's'}` : `${pi('despejado')}sin lluvia por ahora`;
  el.innerHTML = `${fuente}${hora ? ` · ${hora} h` : ''} · ${pi('viento')}máx. ${fmt(r.max)} km/h · ${lluvia}${r.cargando ? ' · actualizando…' : ''}`;
}
vientoVivo.alCambiar = textoVientoVivo;
$('#chk-viento-vivo').addEventListener('change', (e) => { vientoVivo.verViento = e.target.checked; textoVientoVivo(); if (app.clima) pintarClima(); });
$('#chk-lluvia-vivo').addEventListener('change', (e) => { vientoVivo.verLluvia = e.target.checked; textoVientoVivo(); if (app.clima) pintarClima(); });
textoVientoVivo();

// ---------------------------------------------------------------------
// Fenómenos meteorológicos: huracanes y frentes fríos (simulación didáctica)
// ---------------------------------------------------------------------
const nombreEstado = (id) => mapa.estados.get(id)?.nombre ?? id;
const meteoros = new Meteoros(mapa, {
  onInicio(e) {
    meteoros.lista = [];
    $('#meteoro-res').innerHTML = e.tipo === 'huracan'
      ? `<b>Huracán categoría ${e.cat}</b> formándose en el ${e.oceano}, sobre mar cálido. Observa hacia dónde gira.`
      : '<b>Frente frío</b> entrando por el norte: una masa de aire polar baja hacia el sur.';
  },
  onTierra() { $('#meteoro-res').insertAdjacentHTML('beforeend', '<br>Tocó tierra: sin el mar cálido empieza a perder fuerza.'); },
  onEstado(e) { meteoros.lista.push(nombreEstado(e.id)); },
  onNorte() { $('#meteoro-res').insertAdjacentHTML('beforeend', '<br>Llegó a la costa del Golfo: soplan los <b>nortes</b>.'); },
  onFin(e) {
    const n = meteoros.lista.length;
    const lista = meteoros.lista.join(', ');
    $('#meteoro-res').innerHTML = e.tipo === 'huracan'
      ? `<b>Fin del recorrido.</b> Vientos y lluvias alcanzaron ${n} estado${n === 1 ? '' : 's'}: ${lista || 'ninguno'}. Al entrar a tierra se debilitó porque perdió su fuente de energía, el mar cálido.`
      : `<b>El frente cruzó el país.</b> Bajó la temperatura en ${n} estados. En la costa del Golfo (Tamaulipas, Veracruz, Tabasco, Campeche) provocó nortes.`;
    guia.completar?.('meteoro');
  },
});
const textoCat = () => { const s = SAFFIR[+$('#rng-cat').value - 1]; return `${s.cat} · ${s.min}${s.cat === 5 ? ' km/h o más' : `–${s.max} km/h`}`; };
$('#rng-cat').addEventListener('input', () => { $('#cat-txt').textContent = textoCat(); });
$('#btn-huracan').addEventListener('click', () => meteoros.huracan($('#sel-oceano').value, +$('#rng-cat').value));
$('#btn-frente').addEventListener('click', () => meteoros.frente());
var meteorosRef = meteoros; // eslint-disable-line no-var

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
    <div class="acciones-ficha"><button class="btn" id="reto-sig" hidden><img class="pi" loading="lazy" src="assets/pegatinas/ui/siguiente.png" alt="">Siguiente</button></div>`;
  $$('.opcion', dlg).forEach((b) => b.addEventListener('click', () => {
    if (reto.respondida) return;
    reto.respondida = true;
    $('.opciones', dlg).classList.add('respondida');
    const bien = +b.dataset.i === pr.r;
    if (bien) reto.ok++;
    contarStand('preguntas'); if (bien) contarStand('aciertos');
    b.classList.add(bien ? 'bien' : 'malo');
    $$('.opcion', dlg)[pr.r].classList.add('bien');
    const ex = $('.explica', dlg);
    ex.hidden = false;
    ex.innerHTML = `${bien ? '<img class="pi" loading="lazy" src="assets/pegatinas/ui/correcto.png" alt="">¡Correcto!' : '<img class="pi" loading="lazy" src="assets/pegatinas/ui/incorrecto.png" alt="">Casi.'} ${pr.e}`;
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
  contarStand('retos');
  $('#reto-cont').innerHTML = `<p class="sub">Resultado</p><h2>${reto.ok} de ${n} ${reto.ok === n ? '<img class="pi" loading="lazy" src="assets/pegatinas/ui/trofeo.png" alt="">' : reto.ok >= n / 2 ? '<img class="pi" loading="lazy" src="assets/pegatinas/ui/celebracion.png" alt="">' : '<img class="pi" loading="lazy" src="assets/pegatinas/ui/fuerza.png" alt="">'}</h2>
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
      <button class="btn opcion" id="m-antes"><b>Evaluación: ANTES</b>&nbsp;· la persona aún no explora</button>
      <button class="btn opcion" id="m-despues" ${pend.length ? '' : 'disabled'}><b>Evaluación: DESPUÉS</b>&nbsp;· ${pend.length ? `${pend.length} participante(s) pendiente(s)` : 'nadie pendiente'}</button>
      <button class="btn opcion" id="m-res"><b>Resultados</b>&nbsp;· estadística y CSV</button>
    </div>
    <p class="nota">La evaluación es anónima: solo guarda un número de participante, un rango de edad y las respuestas, en este navegador.</p>`;
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
  $('#reto-cont').innerHTML = `<p class="sub">Evaluación · después</p><h2>¿Cuál es tu número de participante?</h2>
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
        ? `<p class="sub">¡Gracias!</p><h2>Eres el participante <span class="num-visitante">#${id}</span></h2>
           <p>Recuerda tu número. Ahora explora el mapa y, al terminar, contesta la parte DESPUÉS.</p>
           <div class="acciones-ficha"><button class="btn primario" id="ev-ok">Explorar</button></div>`
        : `<p class="sub">Participante #${id}</p><h2>${ok} de ${ev.PREGUNTAS.length} correctas</h2>
           <p>Gracias por ayudarnos a medir si el prototipo enseña.</p>
           <div class="acciones-ficha"><button class="btn primario" id="ev-ok">Cerrar</button></div>`;
      $('#ev-ok').onclick = () => dlg.close();
      return;
    }
    const q = ev.PREGUNTAS[i];
    // en la evaluación NO se muestra si la respuesta es correcta (no "enseña" en el ANTES)
    $('#reto-cont').innerHTML = `<p class="sub">Evaluación · ${fase} · participante #${id} · ${i + 1}/${ev.PREGUNTAS.length}</p>
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
    ${r.pares.length ? `<h2>${r.pares.length} participantes con antes y después</h2>
    <div class="tarjetas">
      <div><b>${fmt(r.mA, 1)}/${r.n}</b><small>promedio ANTES</small></div>
      <div><b>${fmt(r.mD, 1)}/${r.n}</b><small>promedio DESPUÉS</small></div>
      <div><b>${fmt(r.g, 2)}</b><small>ganancia normalizada (Hake)</small></div>
    </div>
    <p>${r.mejoraron} de ${r.pares.length} participantes mejoraron su puntaje.</p>
    <table><thead><tr><th>Pregunta</th><th>Antes</th><th>Después</th></tr></thead><tbody>
    ${ev.PREGUNTAS.map((q, i) => `<tr><td>${i + 1}. ${q.p}</td><td>${pct(r.porPregunta[i].antes)}</td><td>${pct(r.porPregunta[i].despues)}</td></tr>`).join('')}
    </tbody></table>
    <p class="nota">Muestra pequeña y sin grupo control: sirve como evidencia preliminar, no como prueba estadística.</p>`
    : `<h2>Aún no hay pares completos</h2><p>Registros guardados: ${total.length}. Cada participante debe contestar ANTES y DESPUÉS.</p>`}
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
  e.currentTarget.classList.toggle('apagado', !on);
});

// ---------------------------------------------------------------------
// Realidad aumentada
// ---------------------------------------------------------------------
const arEstado = $('#ar-estado');
async function entrarAR() {
  if (app.modoAR) return salirAR();
  audio.iniciarAudio();
  // iOS: el permiso del giroscopio solo se puede pedir dentro del toque (antes de cualquier await)
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
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
      onFrame: (dt) => { frame(dt); rayosX(); },
    });
    arEstado.hidden = true;
    $('#ar-guia').hidden = false;
    $('#btn-ar .etq').textContent = 'Salir de AR';
    const el = $('#ar-contenedor');
    let ini = null, sostener = 0, sostenido = false;
    el.onpointerdown = (e) => {
      ini = [e.clientX, e.clientY];
      sostenido = false;
      clearTimeout(sostener);
      // mantener presionado: nombre rápido de lo que está bajo el dedo, sin abrir el panel
      sostener = setTimeout(() => { sostenido = true; vistazoAR(e); }, 550);
    };
    el.onpointermove = (e) => { if (ini && Math.hypot(e.clientX - ini[0], e.clientY - ini[1]) > 10) clearTimeout(sostener); };
    el.onpointerup = (e) => {
      clearTimeout(sostener);
      // El lienzo de MindAR es más grande que el contenedor (recorta el video para
      // llenar la pantalla): el rayo se calcula con SU rectángulo, no con el del contenedor.
      if (!sostenido && ini && Math.hypot(e.clientX - ini[0], e.clientY - ini[1]) < 10) alClic(e, app.ar.camera, app.ar.lienzo);
      ini = null;
    };
    $('#btn-foto-ar').hidden = !app.ar.foto;
  } catch (err) {
    console.error(err);
    app.ar = null;
    arEstado.innerHTML = `<p><img class="pi" loading="lazy" src="assets/pegatinas/ui/advertencia.png" alt="">No se pudo iniciar la AR.</p><p class="nota">${err?.message || 'Error desconocido'}</p><button class="btn" id="ar-cerrar">Volver al modo 3D</button>`;
    $('#ar-cerrar').onclick = () => { arEstado.hidden = true; salirAR(); };
  }
}
// Vistazo en AR: al mantener presionado, el nombre aparece junto al dedo unos segundos.
let vistazoT = 0;
function vistazoAR(e) {
  if (!app.ar) return;
  const { hit } = lanzarRayo(e, app.ar.camera, app.ar.lienzo);
  const ud = hit?.userData;
  const txt = ud?.tipo === 'estado' ? ud.nombre : ud?.data?.nombre || (ud?.tipo === 'usgs' ? `M${ud.data.mag.toFixed(1)} · ${ud.data.lugar}` : '');
  if (!txt) return;
  audio.clic(990);
  navigator.vibrate?.(15);
  tooltip.textContent = txt;
  tooltip.style.transform = `translate(${Math.min(innerWidth - 180, e.clientX + 14)}px, ${Math.max(10, e.clientY - 46)}px)`;
  tooltip.hidden = false;
  clearTimeout(vistazoT);
  vistazoT = setTimeout(() => { tooltip.hidden = true; }, 2600);
}
// Foto en AR: video + mapa + sello; se puede guardar o compartir.
async function fotoAR() {
  if (!app.ar?.foto) return;
  audio.clic(1500);
  const destello = document.createElement('div');
  destello.className = 'destello-foto';
  document.body.appendChild(destello);
  setTimeout(() => destello.remove(), 450);
  const blob = await app.ar.foto();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const nombre = `mexico-vivo-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.jpg`;
  const caja = document.createElement('div');
  caja.className = 'foto-ar';
  caja.innerHTML = `<img src="${url}" alt="Tu foto con el mapa en realidad aumentada">
    <div class="fila"><a class="btn primario" href="${url}" download="${nombre}">Guardar foto</a>
    ${navigator.canShare?.({ files: [new File([blob], nombre, { type: 'image/jpeg' })] }) ? '<button class="btn" data-a="compartir">Compartir</button>' : ''}
    <button class="btn sec" data-a="cerrar">Cerrar</button></div>`;
  document.body.appendChild(caja);
  caja.addEventListener('click', async (ev) => {
    const a = ev.target.closest('[data-a]')?.dataset.a;
    if (a === 'compartir') { try { await navigator.share({ files: [new File([blob], nombre, { type: 'image/jpeg' })], title: 'México Vivo' }); } catch (_) {} }
    if (a === 'cerrar' || ev.target === caja) { caja.remove(); URL.revokeObjectURL(url); }
  });
}
$('#btn-foto-ar').addEventListener('click', fotoAR);
// precarga de la AR solo cuando se va a usar (al acercar o apoyar el dedo en un botón de AR):
// antes se bajaban ~1.2 MB a los 5 s aunque nadie la usara, compitiendo con el mapa
if (navigator.mediaDevices?.getUserMedia) {
  let pedida = false;
  const precargar = () => { if (pedida) return; pedida = true; import('./ar.js').then((m) => m.precargarAR()).catch(() => { pedida = false; }); };
  for (const id of ['#btn-ar', '#btn-empezar-ar']) for (const ev of ['pointerenter', 'pointerdown', 'focus']) $(id)?.addEventListener(ev, precargar, { passive: true });
}

async function salirAR() {
  $('#btn-foto-ar').hidden = true;
  document.querySelector('.foto-ar')?.remove();
  if (app.ar) await app.ar.detener();
  app.ar = null;
  if (rayosXActivo !== null) { rayosXActivo = null; $('#chk-subsuelo').checked = true; mapa.setSubsuelo(true); } // fuera de AR vuelve la vista normal
  app.modoAR = false;
  document.body.classList.remove('modo-ar');
  $('#ar-guia').hidden = true;
  $('#ar-aviso').hidden = true;
  plegarPanel(false);
  $('#btn-ar .etq').textContent = 'Realidad aumentada';
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
let acumEtiq = 1;
function frame(dt) {
  mapa.update(dt);
  sim.update(dt);
  tsunami.update(dt, sim.velocidad * 0.02); // horas de tsunami por segundo
  meteorosRef?.update(dt);
  vientoVivo.update(dt);
  acumEtiq += dt;
  if (acumEtiq > 0.12) {
    acumEtiq = 0;
    const enAR = app.modoAR && app.ar;
    const lienzo = enAR ? app.ar.lienzo : renderer.domElement;
    const cam = enAR ? app.ar.camera : visor?.activo ? visor.camara : camara;
    cam.updateMatrixWorld();
    mapa.root.updateMatrixWorld();
    mapa.ordenarEtiquetas(cam, lienzo.clientWidth, lienzo.clientHeight);
  }
  acumCorte += dt;
  if (app.capa === 'tectonica' && acumCorte > 1 / 30) {
    acumCorte = 0;
    dibujarCorte(corte, sim.cfg, sim.t, sim.corriendo);
  }
}
// Vuelo suave de la cámara hacia un lugar (lo usa el recorrido guiado).
// El mapa está acostado: el punto (x, y) del mapa queda en (x, 0, −y) del mundo.
let vuelo = null;
function volarA(lon, lat, dist = 0.5, ms = 1600) {
  if (app.modoAR) return; // en AR manda la cámara de quien explora
  const [x, y] = proyectar(lon, lat);
  const haciaT = new THREE.Vector3(x, 0, -y);
  const dir = new THREE.Vector3(0, 0.8, 0.6).normalize();
  vuelo = {
    t0: performance.now(), ms,
    desdeT: controles.target.clone(), desdeP: camara.position.clone(),
    haciaT, haciaP: haciaT.clone().addScaledVector(dir, dist),
  };
}
function aplicarVuelo() {
  if (!vuelo) return;
  const k = Math.min(1, (performance.now() - vuelo.t0) / vuelo.ms);
  const s = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // suave al inicio y al final
  controles.target.lerpVectors(vuelo.desdeT, vuelo.haciaT, s);
  camara.position.lerpVectors(vuelo.desdeP, vuelo.haciaP, s);
  if (k >= 1) vuelo = null;
}
// Calidad automática: si el equipo no sostiene ~40 cuadros por segundo, baja
// primero la resolución y las sombras, y después apaga las sombras. Nunca sube
// de nuevo (evita parpadeos). «?ligero» en la URL fuerza la calidad baja.
const calidad = { nivel: 0, muestras: [], ultimo: 0 };
function bajarCalidad() {
  calidad.nivel++;
  if (calidad.nivel === 1) {
    renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio));
    renderer.shadowMap.type = THREE.PCFShadowMap;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.map?.dispose(); sol.shadow.map = null;
  } else if (calidad.nivel === 2) {
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    escena.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }
  redimensionar();
  console.info('Calidad ajustada al nivel', calidad.nivel);
}
if (new URLSearchParams(location.search).has('ligero')) setTimeout(() => { bajarCalidad(); bajarCalidad(); }, 0);
// tablets y celulares con pocos núcleos empiezan en calidad media (menos pixeles y sombras más simples)
else if ((navigator.hardwareConcurrency || 8) <= 4 && matchMedia('(pointer: coarse)').matches) setTimeout(() => bajarCalidad(), 0);

// En reposo (nadie toca la pantalla hace 6 s y no hay simulación, vuelo, investigación, AR ni visor)
// se dibuja a 30 cuadros por segundo: la mitad de trabajo y menos calor en la tablet.
let ultimaInteraccion = performance.now(), cuadroPar = false;
for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) addEventListener(ev, () => { ultimaInteraccion = performance.now(); }, { passive: true, capture: true });
function enReposo() {
  return performance.now() - ultimaInteraccion > 6000 && !sim.corriendo && !vuelo && !visor.activo && !app.modoAR
    && !document.body.classList.contains('en-recorrido');
}
function vigilarCalidad(dtReal) {
  if (calidad.nivel >= 2 || document.hidden || app.modoAR) { calidad.muestras = []; return; }
  if (dtReal > 0.25) return; // pausa (pestaña oculta, alerta del sistema): no cuenta
  calidad.muestras.push(dtReal);
  if (calidad.muestras.length < 60) return;
  const orden = calidad.muestras.slice().sort((a, b) => a - b);
  const mediana = orden[orden.length >> 1];
  calidad.muestras = [];
  if (mediana > 1 / 40) bajarCalidad();
}

let cuadroSombra = 0;
function bucle() {
  const reposo = enReposo();
  if (reposo && (cuadroPar = !cuadroPar)) return; // un cuadro sí y uno no (el tiempo se acumula)
  const dtReal = reloj.getDelta();
  if (!reposo) vigilarCalidad(dtReal); // a 30 cps a propósito no cuenta como «equipo lento»
  const dt = Math.min(0.05, dtReal);
  frame(dt);
  if ((cuadroSombra = (cuadroSombra + 1) % 3) === 0) renderer.shadowMap.needsUpdate = true;
  aplicarZoom(dt);
  aplicarVuelo();
  if (visor.activo) { visor.render(); return; }
  controles.update();
  renderer.render(escena, camara);
}
let ultimoAncho = 0, ultimaForma = '', reencuadre = 0;
function redimensionar() {
  const w = vista.clientWidth, h = vista.clientHeight;
  if (!w || !h) return; // vista oculta (modo AR): no deformar la cámara
  // al girar el celular o cambiar mucho el ancho, se vuelve a encuadrar el país completo
  const forma = w / h < 1 ? 'vertical' : 'horizontal';
  if (ultimoAncho && (forma !== ultimaForma || Math.abs(w - ultimoAncho) / ultimoAncho > 0.3)) {
    // esperar a que termine el giro o la animación del panel: con tamaños intermedios el encuadre sale mal
    clearTimeout(reencuadre);
    reencuadre = setTimeout(() => { encuadrado = false; redimensionar(); }, 250);
  }
  ultimoAncho = w; ultimaForma = forma;
  renderer.setSize(w, h, false);
  camara.aspect = w / h;
  // en pantallas angostas alejamos la cámara para que quepa el país
  camara.fov = w / h < 1 ? 55 : 38;
  camara.updateProjectionMatrix();
  if (!encuadrado && w > 0) {
    // distancia para que quepa todo el país (≈1 unidad de ancho); conserva el ángulo en que el usuario lo dejó
    // que quepa a lo ancho (≈1 unidad) y a lo alto (≈0.72 unidades vistas en ángulo)
    const tv = Math.tan((camara.fov * Math.PI) / 360);
    const dist = Math.min(1.7, Math.max(0.5 / (tv * camara.aspect), 0.36 / tv) + 0.12);
    const dir = camara.position.clone().sub(controles.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.8, 0.6);
    camara.position.copy(controles.target).addScaledVector(dir.normalize(), dist);
    controles.update();
    encuadrado = true;
  }
}
let encuadrado = false;
new ResizeObserver(redimensionar).observe(vista);
redimensionar();
renderer.setAnimationLoop(bucle);

// ---------------------------------------------------------------------
// Cultura e historia: línea del tiempo
// ---------------------------------------------------------------------
function fechaAnio(a) {
  if (a < 0) return `${Math.abs(a).toLocaleString('es-MX')} a.C.`;
  return a >= 2026 ? 'hoy' : `${a}${a < 1000 ? ' d.C.' : ''}`;
}
function ponerAnio(anio) {
  app.anio = anio;
  mapa.setAnio(anio);
  if (anio === null) {
    $('#anio-texto').textContent = 'Todas las épocas';
    $('#era-texto').innerHTML = 'Mueve la línea del tiempo para viajar al pasado: los sitios que existían en esa época se encienden en el mapa.';
    $('#eventos-cerca').innerHTML = '';
    return;
  }
  const era = ERAS.filter((e) => anio >= e.desde && anio <= e.hasta).at(-1) || ERAS[0];
  const activos = SITIOS.filter((s) => anio >= s.desde && anio <= s.hasta);
  $('#anio-texto').textContent = fechaAnio(anio);
  $('#era-texto').innerHTML = `<b>${era.nombre}.</b> ${era.texto}`;
  const cerca = EVENTOS.filter((e) => Math.abs(e.anio - anio) <= 60).slice(0, 4);
  $('#eventos-cerca').innerHTML = (cerca.length ? cerca.map((e) => `<li><b>${fechaAnio(e.anio)}</b> ${e.texto}</li>`).join('') : '')
    + `<li class="nota">${activos.length} sitio(s) en el mapa en esa época.</li>`;
  if (anio === 1325) guia.completar('tenochtitlan');
}
$('#rng-anio').addEventListener('input', (e) => { ponerAnio(+e.target.value); });
$('#btn-todas-epocas').addEventListener('click', () => ponerAnio(null));
$('#eras').innerHTML = ERAS.map((e) => `<button class="btn mini" data-a="${Math.round((e.desde + e.hasta) / 2)}">${e.nombre}<small>${fechaAnio(e.desde)} – ${fechaAnio(e.hasta)}</small></button>`).join('');
$$('#eras button').forEach((b) => b.addEventListener('click', () => { $('#rng-anio').value = b.dataset.a; ponerAnio(+b.dataset.a); audio.clic(700); }));
$('#lista-sitios').innerHTML = SITIOS.slice().sort((a, b) => a.desde - b.desde)
  .map((s, i) => `<li data-id="${s.id}"><span>${pi(s.tipo === 'arqueologico' ? 'zona-arqueologica' : s.tipo === 'virreinal' ? 'ciudad-virreinal' : 'historia-moderna')}${s.nombre}</span><small>${fechaAnio(s.desde)}</small></li>`).join('');
$$('#lista-sitios li').forEach((li) => li.addEventListener('click', () => fichaObjeto({ tipo: 'sitio', data: SITIOS.find((s) => s.id === li.dataset.id) })));
$('#inmaterial').innerHTML = INMATERIAL.map(([n, a]) => `<li><span>${n}</span><small>${a}</small></li>`).join('');

// ---------------------------------------------------------------------
// Lenguas: gráfica de las 10 con más hablantes, familias y fuentes
// ---------------------------------------------------------------------
{
  const max = TOP_LENGUAS[0][1];
  const colorFam = Object.fromEntries(FAMILIAS.map((f) => [f.nombre.toLowerCase(), f.color]));
  $('#barras-lenguas').innerHTML = TOP_LENGUAS.map(([n, h, fam]) => `
    <div class="barra-l" title="Familia ${fam}">
      <span class="bl-nom">${n}</span>
      <span class="bl-pista"><i style="width:${(h / max) * 100}%;background:${colorFam[fam]}"></i></span>
      <span class="bl-num">${fmt(h)}</span>
    </div>`).join('') + '<p class="nota">Personas de 3 años y más. Fuente: INEGI, Censo 2020. El color indica la familia lingüística.</p>';
  $('#familias-lenguas').innerHTML = FAMILIAS.map((f) => `
    <details class="familia">
      <summary><i style="background:${f.color}"></i>${f.num}. ${f.nombre} <small>${f.agrupaciones.length} ${f.agrupaciones.length === 1 ? 'agrupación' : 'agrupaciones'}</small></summary>
      <p>${f.agrupaciones.join(' · ')}</p>
    </details>`).join('') + '<p class="nota">Nombres de las agrupaciones como aparecen en el Catálogo del INALI (2008). Cada agrupación puede tener varias variantes y autodenominaciones.</p>';
  ($('#fuentes-lenguas') || {}).innerHTML = Object.values(FUENTES_LENGUAS).map((s) => `
    <li><a href="${s.url}" target="_blank" rel="noopener">${s.titulo}</a>. ${s.institucion}, ${s.fecha}. Consulta: ${s.consulta}. Nivel ${s.nivel}.
      <br><small>Uso: ${s.usado} <i>Limitaciones:</i> ${s.limitaciones}</small></li>`).join('');
}

// ---------------------------------------------------------------------
// Sabores: línea del tiempo, laboratorio de nixtamalización y fuentes
// ---------------------------------------------------------------------
{
  const autor = (k) => FUENTES_SABORES[k].cita.match(/^[\p{L}'-]+/u)[0];
  const anio = (k) => (FUENTES_SABORES[k].cita.match(/(19|20)\d\d/) || [''])[0];
  $('#linea-sabores').innerHTML = LINEA_SABORES.map((l) => `
    <li><b>${l.hace > 100 ? `Hace ~${fmt(l.hace)} años` : 'Hoy'}</b><span>${l.texto}</span><small>${autor(l.fuente)} ${anio(l.fuente)}</small></li>`).join('');
  $('#efectos-nixtamal').innerHTML = EFECTOS_NIXTAMAL.map((x) => `
    <div class="efecto"><b>${x.titulo}</b><p>${x.texto}</p><small>Fuente: ${autor(x.fuente)} ${anio(x.fuente)} (nivel ${FUENTES_SABORES[x.fuente].nivel})</small></div>`).join('');
  ($('#fuentes-sabores') || {}).innerHTML = Object.values(FUENTES_SABORES).map((s) => `
    <li><a href="${s.url}" target="_blank" rel="noopener">${s.cita}</a> Consulta: ${s.consulta}. Nivel ${s.nivel}.
      <br><small>Uso: ${s.usado} <i>Limitaciones:</i> ${s.limitaciones}</small></li>`).join('');
  $('#otros-alimentos').innerHTML = OTROS_ALIMENTOS.map((x) => `
    <div class="efecto"><b>${x.nombre}</b><p>${x.texto}</p><small>Fuente: ${autor(x.fuente)} ${anio(x.fuente)} (nivel ${FUENTES_SABORES[x.fuente].nivel})</small></div>`).join('');
  $('#btn-ir-platillos').onclick = () => cambiarCapa('cultura');

  // Laboratorio: quien explora avanza paso a paso y la olla cambia de estado
  const lab = $('#lab-nixtamal');
  let paso = 0;
  const pintarLab = () => {
    const p = PASOS_NIXTAMAL[paso];
    lab.dataset.paso = p.id;
    $('#lab-pasos').innerHTML = PASOS_NIXTAMAL.map((q, i) => `<span role="listitem" class="${i < paso ? 'hecho' : i === paso ? 'actual' : ''}">${i + 1}. ${q.titulo}</span>`).join('');
    $('#lab-texto').innerHTML = `<b>${p.titulo}.</b> ${p.texto}`;
    $('#lab-atras').disabled = paso === 0;
    $('#lab-sig').textContent = paso === PASOS_NIXTAMAL.length - 1 ? 'Empezar de nuevo' : 'Siguiente paso';
    if (paso === PASOS_NIXTAMAL.length - 1) guia.completar('nixtamal');
  };
  $('#lab-sig').onclick = () => { paso = (paso + 1) % PASOS_NIXTAMAL.length; pintarLab(); audio.clic(600 + paso * 60); };
  $('#lab-atras').onclick = () => { if (paso > 0) { paso--; pintarLab(); audio.clic(520); } };
  $('#lab-sin-cal').onchange = (e) => {
    lab.classList.toggle('sin-cal', e.target.checked);
    const c = $('#lab-compara');
    c.hidden = !e.target.checked;
    c.innerHTML = 'Sin cal no hay nixtamalización: el agua no se vuelve alcalina, el grano no gana el calcio de la cal y no se obtienen los beneficios que describe «Comprende». Esta comparación es cualitativa: no simula cantidades reales.';
  };
  pintarLab();
}

// ---------------------------------------------------------------------
// Maravillas: lista por tipo, progreso de la expedición y fuentes
// ---------------------------------------------------------------------
function pintarExpedicion() {
  const n = app.maravillasVistas.size, total = MARAVILLAS.length;
  $('#expedicion-num').textContent = `${n} de ${total}`;
  $('#expedicion-barra').style.width = `${(n / total) * 100}%`;
  $$('#lista-maravillas li').forEach((li) => li.classList.toggle('vista', app.maravillasVistas.has(li.dataset.id)));
}
{
  $('#lista-maravillas').innerHTML = Object.entries(TIPOS_MARAVILLA).map(([k, t]) => {
    const items = MARAVILLAS.filter((m) => m.tipo === k);
    return `<li class="m-grupo"><span><i style="background:${t.color}"></i>${t.nombre}</span><ul>${items.map((m) => `<li data-id="${m.id}"><b>${m.nombre}</b><small>${m.lugar}${m.anio ? ` · ${m.anio}` : ''}</small></li>`).join('')}</ul></li>`;
  }).join('');
  $$('#lista-maravillas li[data-id]').forEach((li) => (li.onclick = () => {
    const m = MARAVILLAS.find((x) => x.id === li.dataset.id);
    volarA(m.lon, m.lat, 0.5);
    fichaObjeto({ tipo: 'maravilla', data: m });
  }));
  ($('#fuentes-maravillas') || {}).innerHTML = FUENTES_MARAVILLAS.map((s) => `
    <li><a href="${s.url}" target="_blank" rel="noopener">${s.cita}</a> Consulta: ${s.consulta}. Nivel ${s.nivel}.<br><small><i>Limitaciones:</i> ${s.limitaciones}</small></li>`).join('');
  pintarExpedicion();
}

// ---------------------------------------------------------------------
// Panel didáctico: tarjeta «Adivina primero», misión y pestañas por capa
// ---------------------------------------------------------------------
organizarPanel({ onResponder: (capa, bien) => audio.clic(bien ? 980 : 330) });
{
  const nombres = [...mapa.estados.values()].map((r) => [r.id, r.nombre]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  $('#sel-mi-estado').innerHTML = nombres.map(([id, n]) => `<option value="${id}" ${id === 'MX-HID' ? 'selected' : ''}>${n}</option>`).join('');
  $('#btn-mi-estado').onclick = () => fichaMiEstado($('#sel-mi-estado').value);
  $('#btn-medir').onclick = () => activarMedida(!app.midiendo);
  // Barra de capas: avisa cuando hay más pestañas fuera de la vista
  const nav = $('.capas');
  const revisarMas = () => {
    nav.classList.toggle('mas-derecha', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4);
    nav.classList.toggle('mas-izquierda', nav.scrollLeft > 4);
  };
  nav.addEventListener('scroll', revisarMas, { passive: true });
  addEventListener('resize', revisarMas);
  setInterval(revisarMas, 1500);
  revisarMas();
}

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
    $('#sismograma-info').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/advertencia.png" alt="">' + e.message;
  }
}

$('#btn-escuchar').addEventListener('click', () => {
  if (!sisActual) return;
  const factor = +$('#sel-acelerar').value;
  mostrarSubtitulo(`Sismograma real · ${sisActual.s.nombre}, estación CU de la UNAM, acelerado ×${factor}. Primero un golpe seco (onda P) y después la sacudida fuerte (onda S).`, 12000);
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
    $('#btn-sensor').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sensor.png" alt="">Activar mi sismógrafo';
    return;
  }
  $('#sensor-info').textContent = 'Pidiendo permiso…';
  try {
    const tipo = await iniciarSensor({
      onDatos: (st) => {
        dibujarSensor(cvSen, st, disparos);
        const u = st.tipo === 'acelerometro' ? ' m/s²' : ' (nivel)';
        $('#sensor-info').innerHTML = `${st.tipo === 'acelerometro' ? '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sensor.png" alt="">Acelerómetro' : '<img class="pi" loading="lazy" src="assets/pegatinas/ui/microfono.png" alt="">Micrófono'} · ahora: <b>${fmt(st.buf.at(-1)[1], 2)}${u}</b> · máximo: <b>${fmt(st.pico, 2)}${u}</b>`;
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
    $('#btn-sensor').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/detener.png" alt="">Detener sismógrafo';
    guia.decir(tipo === 'acelerometro' ? '¡Listo! Pon la tablet en la mesa y da un salto o un golpe junto a ella.' : 'Esta computadora no tiene acelerómetro, así que usamos el micrófono. ¡Aplaude o golpea la mesa!');
  } catch (e) {
    const motivo = e?.name === 'NotAllowedError' ? 'diste «no permitir» o el navegador lo bloqueó'
      : e?.name === 'NotFoundError' ? 'este equipo no tiene micrófono ni acelerómetro'
        : !window.isSecureContext ? 'abre la página con https:// o desde localhost'
          : e?.message || 'error desconocido';
    $('#sensor-info').innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/advertencia.png" alt="">No se pudo usar el sensor: ' + motivo;
  }
});

// ---------------------------------------------------------------------
// Simulacro: agáchate, cúbrete y sujétate
// ---------------------------------------------------------------------
const PASOS = [
  { id: 'agachate', ico: pi('simulacro-agachate'), txt: 'Agáchate', ok: true },
  { id: 'cubrete', ico: pi('simulacro-cubrete'), txt: 'Cúbrete bajo una mesa firme', ok: true },
  { id: 'sujetate', ico: pi('simulacro-sujetate'), txt: 'Sujétate de la mesa', ok: true },
  { id: 'elevador', ico: pi('simulacro-elevador'), txt: 'Usar el elevador', ok: false, porque: 'El elevador puede detenerse o atorarse. Nunca lo uses durante un sismo.' },
  { id: 'correr', ico: pi('simulacro-correr'), txt: 'Correr y empujar', ok: false, porque: 'Correr y empujar causa caídas. Recuerda: no corro, no grito, no empujo.' },
  { id: 'foto', ico: pi('simulacro-video'), txt: 'Tomar un video', ok: false, porque: 'Primero tu seguridad. El video puede esperar.' },
];
let simulacroReloj = 0;
function terminarSimulacro() {
  clearInterval(simulacroReloj);
  simulacroReloj = 0;
  sim.tiempoReal = false;
}
function iniciarSimulacro(ciudad) {
  const d = $('#simulacro');
  const orden = ['agachate', 'cubrete', 'sujetate'];
  let paso = 0;
  // el tiempo se mide con el reloj de la simulación (puesto a tiempo real mientras dura el simulacro)
  terminarSimulacro();
  sim.tiempoReal = true;
  const t0 = sim.t;
  const restante = () => Math.max(0, ciudad.tS - sim.t);
  const opciones = [...PASOS].sort(() => Math.random() - 0.5);
  d.innerHTML = `<div class="sim-tarjeta"><p class="sub">¡Suena la alerta en ${ciudad.nombre}!</p>
    <h2>Protégete: elige los 3 pasos en orden</h2>
    <p class="nota">Si no puedes salir rápido y seguro, quédate y protégete. La onda S llega en <b id="sim-cuenta">${fmt(restante())} s</b>.</p>
    <div class="pasos-hechos"><span>1</span><span>2</span><span>3</span></div>
    <div class="opciones-sim">${opciones.map((p) => `<button class="btn opcion-sim" data-id="${p.id}"><span>${p.ico}</span>${p.txt}</button>`).join('')}</div>
    <p class="explica" id="sim-msg" hidden></p></div>`;
  d.hidden = false;
  audio.clic(700);
  const resultado = (aTiempo, t) => {
    terminarSimulacro();
    contarStand(aTiempo ? 'simulacrosATiempo' : 'simulacrosTarde');
    d.innerHTML = `<div class="sim-tarjeta"><p class="sub">Simulacro</p><h2>${aTiempo ? '¡A salvo! <img class="pi" loading="lazy" src="assets/pegatinas/ui/simulacro-cubrete.png" alt="">' : 'No alcanzaste <img class="pi" loading="lazy" src="assets/pegatinas/ui/tiempo.png" alt="">'}</h2>
      <p>${aTiempo ? `Te tomó <b>${fmt(t, 1)} s</b> protegerte. Tenías <b>${fmt(ciudad.aviso)} s</b> de aviso: te sobraron ${fmt(ciudad.aviso - t)} s.` : `La onda S llegó antes de que terminaras los tres pasos. Tenías <b>${fmt(ciudad.aviso)} s</b> de aviso.`}</p>
      <p class="nota">Por eso la alerta sirve: unos segundos bastan para protegerte si sabes qué hacer.</p>
      <div class="acciones-ficha"><button class="btn primario" id="sim-ok">Seguir</button></div></div>`;
    $('#sim-ok').onclick = () => (d.hidden = true);
    if (aTiempo) guia.completar('simulacro');
  };
  // cuenta regresiva y cierre automático si llega la onda S (o si se detiene la simulación)
  simulacroReloj = setInterval(() => {
    if (d.hidden) return terminarSimulacro();
    if (!sim.corriendo) { terminarSimulacro(); d.hidden = true; return; }
    const c = $('#sim-cuenta');
    if (c) c.textContent = `${fmt(restante())} s`;
    if (paso < 3 && sim.t >= ciudad.tS) resultado(false, sim.t - t0);
  }, 200);
  $$('.opcion-sim', d).forEach((b) => (b.onclick = () => {
    const p = PASOS.find((x) => x.id === b.dataset.id);
    const msg = $('#sim-msg');
    if (!p.ok) { b.classList.add('malo'); msg.hidden = false; msg.innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/advertencia.png" alt="">' + p.porque; audio.clic(250); return; }
    if (p.id !== orden[paso]) { msg.hidden = false; msg.textContent = 'Casi: el orden es agáchate, cúbrete y sujétate.'; audio.clic(300); return; }
    b.classList.add('bien'); b.disabled = true;
    $$('.pasos-hechos span', d)[paso].classList.add('hecho');
    $$('.pasos-hechos span', d)[paso].innerHTML = p.ico;
    paso++;
    audio.clic(900 + paso * 200);
    if (paso === 3) {
      const t = sim.t - t0;
      resultado(sim.t < ciudad.tS, t);
    }
  }));
}

// ---------------------------------------------------------------------
// Encabezado: pasaporte
// ---------------------------------------------------------------------
$('#btn-pasaporte').addEventListener('click', () => guia.abrirPasaporte());
guia.montarGuia();
guia.onProgreso((n, total) => { $('#btn-pasaporte .cuenta').textContent = `${n}/${total}`; pintarMisiones(); });
audio.cargarManifiesto();

// ---------------------------------------------------------------------
// Barra superior: si las pestañas no caben en una fila, pasan a una segunda.
// Se mide de verdad, así funciona con cualquier ancho y con la escala de Windows.
// ---------------------------------------------------------------------
function acomodarBarra() {
  const barra = $('.barra');
  const estilo = getComputedStyle(barra);
  const natural = (el) => [...el.children].reduce((s, h) => s + h.offsetWidth, 0) + 12; // sin estiramiento
  const necesario = natural($('.marca')) + natural($('.acciones'))
    + $$('.capas button').reduce((s, b) => s + b.offsetWidth + 4, 0)
    + parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight) + 32;
  document.body.classList.toggle('barra-doble', necesario > barra.clientWidth);
}
// se vuelve a medir si cambia la ventana, el zoom (Ctrl +) o el tamaño de letra
const obsBarra = new ResizeObserver(() => setTimeout(acomodarBarra, 0));
['body', '.barra', '.marca', '.capas', '.acciones'].forEach((s) => obsBarra.observe($(s)));
addEventListener('resize', acomodarBarra);
setInterval(acomodarBarra, 1500); // respaldo por si el navegador no avisa del cambio de letra
document.fonts?.ready.then(acomodarBarra);
acomodarBarra();

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
document.body.dataset.capa = '';
cambiarCapa('estados');
sincronizarControles();
const inicio = $('#inicio');
$('#btn-empezar').addEventListener('click', () => { audio.iniciarAudio(); inicio.classList.add('fuera'); setTimeout(() => (inicio.hidden = true), 600); });
// ---------------------------------------------------------------------
// Rayos X al inclinar la tablet (realidad aumentada, capa Sismos): si la cámara mira el mapa
// de lado (a menos de ~35° sobre el papel), se activa sola la vista bajo la superficie con la
// placa de Cocos y el hipocentro; al volver a mirar desde arriba, regresa a lo que eligió el usuario.
// ---------------------------------------------------------------------
let rayosXActivo = null; // null = aún no se decide en esta sesión de AR
const _n = new THREE.Vector3(), _c = new THREE.Vector3(), _o = new THREE.Vector3();
function rayosX() {
  if (!app.ar || app.capa !== 'tectonica' || !mapa.root.parent) return;
  mapa.root.updateWorldMatrix(true, false);
  _o.setFromMatrixPosition(mapa.root.matrixWorld);
  _n.set(0, 0, 1).transformDirection(mapa.root.matrixWorld);
  app.ar.camera.getWorldPosition(_c);
  const elev = 90 - THREE.MathUtils.radToDeg(_n.angleTo(_c.sub(_o).normalize())); // grados sobre el papel
  // histéresis: se enciende bajo 35° y se apaga sobre 45°, para que no parpadee
  const quiero = elev < 35 ? true : elev > 45 ? false : rayosXActivo;
  if (quiero === null || quiero === rayosXActivo) return;
  rayosXActivo = quiero;
  $('#chk-subsuelo').checked = quiero; mapa.setSubsuelo(quiero);
  if (quiero) mostrarSubtitulo('Rayos X: estás viendo bajo la superficie. La placa de Cocos se hunde y ahí nacen los sismos.', 5000);
}

// Subtítulos de los sonidos
let subTimer = 0;
function mostrarSubtitulo(texto, ms = 7000) {
  const el = $('#subtitulo');
  el.innerHTML = '<img class="pi" loading="lazy" src="assets/pegatinas/ui/sonido.png" alt="">' + texto;
  el.hidden = false;
  el.classList.remove('sale'); void el.offsetWidth; el.classList.add('entra');
  clearTimeout(subTimer);
  subTimer = setTimeout(() => { el.classList.add('sale'); setTimeout(() => (el.hidden = true), 300); }, ms);
}
audio.avisos.addEventListener('subtitulo', (e) => mostrarSubtitulo(e.detail));

// Inicio de un toque: el primer contacto es un sismo, no una pantalla de opciones.
$('#btn-un-toque').addEventListener('click', () => {
  audio.iniciarAudio();
  inicio.classList.add('fuera');
  setTimeout(() => (inicio.hidden = true), 600);
  cambiarCapa('tectonica');
  ponerEscucha('MX-HID');
  sim.configurar({ lat: 16.98, lon: -99.77, mag: 7.4, prof: 20 });
  sincronizarControles();
  pintarAviso();
  setTimeout(() => sim.iniciar(), 900);
});
$('#btn-empezar-ar').addEventListener('click', () => {
  audio.iniciarAudio();
  inicio.classList.add('fuera');
  setTimeout(() => (inicio.hidden = true), 600);
  renderer.setAnimationLoop(null);
  entrarAR();
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches?.('input, select, textarea')) return;
  const mapaTeclas = { 1: 'estados', 2: 'tectonica', 3: 'volcanes', 4: 'biodiversidad', 5: 'clima', 6: 'historia', 7: 'cultura', 8: 'lenguas', 9: 'sabores', 0: 'maravillas' };
  if (mapaTeclas[e.key]) cambiarCapa(mapaTeclas[e.key]);
  if (e.key === ' ' && app.capa === 'tectonica') { e.preventDefault(); $('#btn-sismo').click(); }
  if (e.key === 'Escape') cerrarFicha();
});

// ---------------------------------------------------------------------
// Recorrido guiado (4 minutos)
// ---------------------------------------------------------------------
let simulacroAntes = true;
const limpiarPaso = () => {
  sim.detener(); sim.cb.onFin(); tsunami.detener();
  detenerSonido(); audio.detenerAmbiente(); audio.detenerGrabacion();
  cerrarFicha();
  $$('.resaltar').forEach((x) => x.classList.remove('resaltar'));
};
const recorrido = crearRecorrido({
  mostrarPestana,
  cambiarCapa, fichaEstado, volarA, ponerAnio(a) { mostrarPestana('historia', 'experimenta', false); ponerAnio(a); },
  abrirBitacora: () => guia.abrirPasaporte(),
  clic: () => audio.clic(700),
  verSubsuelo(on) { $('#chk-subsuelo').checked = on; mapa.setSubsuelo(on); },
  prepararPrediccion() {
    mostrarPestana('tectonica', 'experimenta', false);
    plegarPanel(false);
    ponerEscucha('MX-HID');
    sim.configurar({ lat: 16.98, lon: -99.77, mag: 7.4, prof: 20 });
    sincronizarControles();
    const poe = $('.poe');
    poe.classList.add('resaltar');
    poe.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  simularAcapulco() {
    $('#chk-simulacro').checked = false; // el simulacro interrumpiría la explicación
    ponerEscucha('MX-HID');
    sim.configurar({ lat: 16.98, lon: -99.77, mag: 7.4, prof: 20 });
    sim.iniciar();
    volarA(-99.3, 18.2, 0.75);
  },
  async escucharReal(archivo) {
    mostrarPestana('tectonica', 'descubre', false);
    plegarPanel(false);
    const k = REALES.findIndex((s) => s.archivo === archivo);
    await mostrarReal(REALES[k], $$('#reales button')[k]);
    $('#sismograma').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#btn-escuchar').click();
  },
  erupcion(nombre) {
    const reg = mapa.volcanes.find((r) => r.v.nombre === nombre);
    if (reg) { mapa.erupcion(reg); audio.erupcion(0); }
  },
  antesDePaso: limpiarPaso,
  alSalir() { $('#chk-simulacro').checked = simulacroAntes; },
});
function empezarRecorrido() {
  audio.iniciarAudio();
  simulacroAntes = $('#chk-simulacro').checked;
  if (innerWidth <= 900) plegarPanel(true); // en celular, que se vea el mapa
  inicio.classList.add('fuera');
  setTimeout(() => (inicio.hidden = true), 600);
  recorrido.iniciar();
}
$('#btn-recorrido').addEventListener('click', empezarRecorrido);
$('#btn-recorrido-panel').addEventListener('click', empezarRecorrido);
renderer.domElement.addEventListener('pointerdown', () => { vuelo = null; }); // quien explora toma el control

// ---------------------------------------------------------------------
// Modo sin conexión: service worker (no se activa con ?dev, para desarrollar)
// ---------------------------------------------------------------------
const params = new URLSearchParams(location.search);
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !params.has('dev')) {
  // Se registra cuando la app ya arrancó (no compite con la carga inicial). Lo opcional (patrones,
  // modelos, sonidos, AR) se baja después, de dos en dos, para que todo funcione sin internet.
  const registrar = () => navigator.serviceWorker.register('sw.js').then(() => {
    const ahorro = navigator.connection && navigator.connection.saveData;
    if (ahorro) return;
    setTimeout(() => navigator.serviceWorker.ready.then((r) => r.active && r.active.postMessage('precargar')),
      params.has('exhibicion') ? 5000 : 25000);
  }).catch((e) => console.warn('Sin modo sin conexión:', e));
  if (document.readyState === 'complete') setTimeout(registrar, 4000);
  else addEventListener('load', () => setTimeout(registrar, 4000), { once: true });
  // Cuando se instala una versión nueva, la página se recarga sola una vez para usarla (si no, la copia
  // guardada se seguía mostrando hasta una segunda recarga). No interrumpe el visor VR ni la AR.
  const habiaControl = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaControl || recargando) return;
    const recargar = () => { if (recargando) return; recargando = true; location.reload(); };
    if (!visor.activo && !app.modoAR) recargar();
    else { const t = setInterval(() => { if (!visor.activo && !app.modoAR) { clearInterval(t); recargar(); } }, 2000); }
  });
}

// ---------------------------------------------------------------------
// Modo exhibición (?exhibicion): para dejar la app sola en una presentación continua.
// Tras 90 s sin que nadie la toque, todo vuelve al inicio para la siguiente
// persona: se cierran fichas y ventanas, se detienen sonidos y simulaciones
// y se reinicia la bitácora.
// ---------------------------------------------------------------------
const EXHIBICION = params.has('exhibicion'); // modo de presentación continua (reinicio por inactividad)
const INACTIVIDAD_S = 90;
const PREGUNTAS_INICIO = [
  '¿Cuántos segundos de aviso tendría Pachuca si tiembla en Acapulco?',
  '¿Por qué hay volcanes en el centro de México?',
  '¿Qué tan rápido viaja un tsunami en mar abierto?',
  '¿Cómo suena un sismo real registrado en la UNAM?',
  '¿Por qué hace más frío en Toluca que en Villahermosa?',
];
function volverAlInicio() {
  cerrarFicha();
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  $('#simulacro').hidden = true;
  cerrarVolcan(); cerrarEspecie();
  sim.detener(); sim.cb.onFin(); tsunami.detener();
  detenerSensor(); detenerSonido();
  audio.detenerAmbiente(); audio.detenerGrabacion();
  if (app.modoAR) salirAR();
  if (recorrido.activo()) recorrido.salir();
  guia.reiniciar();
  reiniciarPanel(); activarMedida(false);
  app.maravillasVistas.clear(); for (const m of MARAVILLAS) { const r = mapa.maravillas?.get(m.id); if (r) r.mat.emissiveIntensity = 0; } pintarExpedicion();
  ponerNivel('aventureros');
  cambiarCapa('estados');
  encuadrado = false; redimensionar();
  inicio.hidden = false;
  inicio.classList.remove('fuera');
}
if (EXHIBICION) {
  document.body.classList.add('exhibicion');
  let ultimo = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, () => { ultimo = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (inicio.hidden && Date.now() - ultimo > INACTIVIDAD_S * 1000) volverAlInicio();
  }, 2000);
  // pantalla de atracción: una pregunta nueva cada 10 s
  const p = $('#inicio-pregunta');
  let k = 0;
  p.hidden = false;
  p.textContent = PREGUNTAS_INICIO[0];
  setInterval(() => { k = (k + 1) % PREGUNTAS_INICIO.length; p.textContent = PREGUNTAS_INICIO[k]; }, 10000);
  addEventListener('contextmenu', (e) => e.preventDefault());
} else {
  // Exponer para depuración (no en modo presentación)
  window.mexicoVivo = { mapa, sim, app, camara, renderer, escena, controles, aplicarZoom, tsunami, volverAlInicio };
}


// ---------------------------------------------------------------------
// Portada: sismos reales de las últimas 24 h (USGS)
// ---------------------------------------------------------------------
montarSismosVivo(inicio);

// ---------------------------------------------------------------------
// Modo guía para el equipo del proyecto (no lo ve quien explora).
// Se abre manteniendo presionado el sello de la barra 1.5 s, o con la tecla G.
// Escenarios listos para demostrar, controles rápidos y lo que pasó hoy en la presentación.
// ---------------------------------------------------------------------
const CLAVE_STAND = 'mv-stand';
function leerStand() {
  const hoy = new Date().toISOString().slice(0, 10);
  let d = null;
  try { d = JSON.parse(localStorage.getItem(CLAVE_STAND)); } catch (_) {}
  if (!d || d.dia !== hoy) d = { dia: hoy, visitas: 0, simulaciones: 0, simulacrosATiempo: 0, simulacrosTarde: 0, retos: 0, aciertos: 0, preguntas: 0 };
  return d;
}
function contarStand(campo, n = 1) {
  const d = leerStand();
  d[campo] = (d[campo] || 0) + n;
  try { localStorage.setItem(CLAVE_STAND, JSON.stringify(d)); } catch (_) {}
}
// visitas: cada vez que alguien sale de la portada
new MutationObserver(() => { if (inicio.hidden) contarStand('visitas'); }).observe(inicio, { attributes: true, attributeFilter: ['hidden'] });
// simulaciones lanzadas
{
  const iniciarOriginal = sim.iniciar.bind(sim);
  sim.iniciar = (...a) => { contarStand('simulaciones'); return iniciarOriginal(...a); };
}

const ESCENARIOS = [
  { id: 'acapulco', titulo: 'Acapulco M8 → ¿aviso en Pachuca?', nota: 'El clásico: 90 s de aviso en Pachuca.', fn: () => sismoGuia({ lat: 16.6, lon: -99.6, mag: 8.0, prof: 20 }, 'MX-HID') },
  { id: 'puebla', titulo: 'Puebla–Morelos 2017 (M7.1)', nota: 'Cerca de la CDMX: casi sin aviso.', fn: () => sismoGuia({ lat: 18.55, lon: -98.49, mag: 7.1, prof: 57 }, 'MX-CMX') },
  { id: 'michoacan', titulo: 'Michoacán 1985 (M8.1)', nota: 'El origen de la alerta sísmica.', fn: () => sismoGuia({ lat: 18.19, lon: -102.53, mag: 8.1, prof: 17 }, 'MX-CMX') },
  { id: 'tsunami', titulo: 'Tsunami en Guerrero (M8.4)', nota: 'Epicentro en el mar y poco profundo.', fn: () => sismoGuia({ lat: 16.2, lon: -99.9, mag: 8.4, prof: 10 }, 'MX-GRO') },
  { id: 'popo', titulo: 'Erupción del Popocatépetl', nota: 'Abre su ficha y lo hace hacer erupción.', fn: () => {
    cambiarCapa('volcanes');
    const v = VOLCANES.find((x) => /Popocat/.test(x.nombre));
    if (v) { fichaObjeto({ tipo: 'volcan', data: v }); setTimeout(() => $('#panel .ficha .btn.peligro')?.click(), 400); }
  } },
  { id: 'clima', titulo: 'Clima en vivo de las 32 capitales', nota: 'Datos de hace unos minutos.', fn: () => cambiarCapa('clima') },
  { id: 'recorrido', titulo: 'Investigación guiada', nota: 'Para presentar el proyecto paso a paso.', fn: () => $('#btn-recorrido').click() },
];
function sismoGuia(cfg, escucha) {
  if (!inicio.hidden) { inicio.classList.add('fuera'); setTimeout(() => (inicio.hidden = true), 600); }
  audio.iniciarAudio();
  cambiarCapa('tectonica');
  sim.detener(); tsunami.detener();
  ponerEscucha(escucha);
  sim.configurar(cfg);
  sincronizarControles();
  pintarAviso();
  setTimeout(() => sim.iniciar(), 350);
}
let dlgGuia = null;
function abrirGuia() {
  if (!dlgGuia) {
    dlgGuia = document.createElement('dialog');
    dlgGuia.className = 'reto guia-stand';
    dlgGuia.setAttribute('aria-label', 'Modo guía del equipo');
    document.body.appendChild(dlgGuia);
  }
  const d = leerStand();
  const sims = d.simulacrosATiempo + d.simulacrosTarde;
  dlgGuia.innerHTML = `<button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sub">Solo para el equipo del proyecto</p><h2>Modo guía</h2>
    <h3>Demostraciones listas</h3>
    <div class="gs-escenarios">${ESCENARIOS.map((e) => `<button class="btn" data-e="${e.id}"><b>${e.titulo}</b><small>${e.nota}</small></button>`).join('')}</div>
    <h3>Controles rápidos</h3>
    <div class="fila gs-controles">
      <button class="btn primario" data-a="reiniciar">Reiniciar para la siguiente persona</button>
      <button class="btn" data-a="vel" data-v="1">Velocidad 1×</button><button class="btn" data-a="vel" data-v="10">10×</button><button class="btn" data-a="vel" data-v="40">40×</button>
      <label class="switch"><input type="checkbox" data-a="simulacro" ${$('#chk-simulacro')?.checked ? 'checked' : ''}><span></span>Simulacro al sonar la alerta</label>
    </div>
    <h3>Hoy <small>(${d.dia})</small></h3>
    <div class="tarjetas gs-cifras">
      <div><b>${d.visitas}</b><span>sesiones</span></div>
      <div><b>${d.simulaciones}</b><span>sismos simulados</span></div>
      <div><b>${sims ? Math.round((d.simulacrosATiempo / sims) * 100) + ' %' : '—'}</b><span>simulacros a tiempo (${d.simulacrosATiempo} de ${sims})</span></div>
      <div><b>${d.preguntas ? Math.round((d.aciertos / d.preguntas) * 100) + ' %' : '—'}</b><span>aciertos en el reto (${d.retos} retos)</span></div>
    </div>
    <p class="nota">Se abre manteniendo presionado el sello de la barra o con la tecla G. Las cifras se guardan solo en este equipo y empiezan de cero cada día.</p>
    <div class="acciones-ficha"><button class="btn sec" data-a="borrar">Poner las cifras de hoy en cero</button></div>`;
  dlgGuia.querySelector('.cerrar').onclick = () => dlgGuia.close();
  dlgGuia.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => { dlgGuia.close(); ESCENARIOS.find((e) => e.id === b.dataset.e).fn(); }));
  dlgGuia.querySelectorAll('[data-a="vel"]').forEach((b) => (b.onclick = () => {
    const v = +b.dataset.v; sim.velocidad = v;
    const r = $('#rng-vel'); if (r) { r.value = v; $('#val-vel').textContent = `${v}×`; }
    audio.clic(900);
  }));
  dlgGuia.querySelector('[data-a="reiniciar"]').onclick = () => { dlgGuia.close(); volverAlInicio(); };
  dlgGuia.querySelector('[data-a="simulacro"]').onchange = (e) => { const c = $('#chk-simulacro'); if (c) c.checked = e.target.checked; };
  dlgGuia.querySelector('[data-a="borrar"]').onclick = () => { try { localStorage.removeItem(CLAVE_STAND); } catch (_) {} abrirGuia(); };
  if (!dlgGuia.open) dlgGuia.showModal();
}
{
  const sello = $('.barra .marca');
  let t = 0;
  const cancelar = () => clearTimeout(t);
  sello?.addEventListener('pointerdown', () => { cancelar(); t = setTimeout(() => { navigator.vibrate?.(30); abrirGuia(); }, 1500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => sello?.addEventListener(ev, cancelar));
  sello?.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, select, textarea')) return;
    if (e.key === 'g' || e.key === 'G') abrirGuia();
  });
}

// la app terminó de arrancar (js/compat.js muestra un aviso si esto no ocurre)
window.__mvListo = true;
setTimeout(() => mapa.armarEnReposo(), 2500); // capas pendientes, de una en una, en ratos libres
