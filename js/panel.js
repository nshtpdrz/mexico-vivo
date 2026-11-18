// Panel lateral didáctico. Reorganiza (sin borrar) el contenido de cada capa en:
//   1. Una tarjeta de entrada: «Adivina primero» (pregunta con 3 opciones) y,
//      al responder, un dato breve y una acción concreta.
//   2. La misión de la capa, siempre visible.
//   3. Pestañas Descubre · Experimenta · Comprende · Fuentes. Solo una visible.
//
// En el HTML, cada bloque indica su pestaña con data-tab; sin atributo va a
// «Descubre». Los datos de las tarjetas ya existen en la app con su fuente.

import { MISIONES, estaHecha } from './guia.js';

export const TARJETAS = {
  estados: { p: '¿Cuántas placas tectónicas se juntan en México?', o: ['2', '5', '12'], r: 1,
    sabias: 'México está donde se juntan 5 placas. Por eso tiene sismos, volcanes y montañas.', accion: 'Toca tu estado para conocerlo, o ve a Experimenta y elige «Mi estado».' },
  tectonica: { p: '¿Qué onda de un sismo llega primero?', o: ['La onda P', 'La onda S', 'Llegan juntas'], r: 0,
    sabias: 'La onda P viaja a unos 6.5 km/s y la S, la que más sacude, a unos 3.6 km/s. Esa diferencia da segundos de aviso.', accion: 'Ve a Experimenta y simula un sismo en 3 pasos.' },
  volcanes: { p: '¿De dónde sale el magma de los volcanes del centro de México?', o: ['Del Sol', 'De una placa que se hunde y suelta agua', 'De los ríos'], r: 1,
    sabias: 'La placa de Cocos se hunde bajo México. A unos 100 km de profundidad suelta agua que funde el manto, y el magma sube.', accion: 'Toca un volcán y pulsa «Simular erupción».' },
  biodiversidad: { p: '¿Dónde vive el ajolote en la naturaleza?', o: ['En todo el mundo', 'Solo en los canales de Xochimilco', 'En el mar'], r: 1,
    sabias: 'El ajolote solo vive en los canales de Xochimilco y está en peligro crítico.', accion: 'Toca un estado y escucha su paisaje sonoro.' },
  clima: { p: '¿Dónde suele hacer más frío: en Toluca (2,660 m) o en Villahermosa (10 m)?', o: ['En Toluca', 'En Villahermosa', 'Igual en las dos'], r: 0,
    sabias: 'El aire que sube se expande y se enfría. Por eso las ciudades altas suelen ser más frías.', accion: 'En Experimenta, cada punto de la gráfica es una capital con datos de hace minutos.' },
  historia: { p: '¿Qué ciudad florecía en Hidalgo hacia el año 950?', o: ['Tula', 'Cancún', 'Monterrey'], r: 0,
    sabias: 'Tula fue la capital tolteca, aquí en Hidalgo.', accion: 'En Experimenta, mueve la línea del tiempo y mira qué lugares se encienden.' },
  cultura: { p: '¿En qué año la UNESCO reconoció la cocina tradicional mexicana como Patrimonio Inmaterial?', o: ['1810', '2010', '2025'], r: 1,
    sabias: 'Fue en 2010, con el paradigma de Michoacán.', accion: 'Toca un estado: verás un platillo, una artesanía y una tradición de una región.' },
  lenguas: { p: '¿Cuántas personas hablaban una lengua indígena en México en 2020?', o: ['Unas 70 mil', 'Más de 7 millones', 'Nadie'], r: 1,
    sabias: '7,364,645 personas de 3 años y más, según el INEGI. Hay 68 agrupaciones lingüísticas, todas vivas.', accion: 'Toca un estado para ver qué parte de su población habla una lengua indígena.' },
  sabores: { p: '¿Hace cuánto ya había maíz en lo que hoy es Guerrero?', o: ['870 años', '8,700 años', '87,000 años'], r: 1,
    sabias: 'En el abrigo de Xihuatoxtla se encontraron almidones de maíz de hace unos 8,700 años.', accion: 'Toca una vasija del mapa o haz nixtamal en Experimenta.' },
  maravillas: { p: '¿Cuántos sitios naturales y mixtos de México están en la Lista del Patrimonio Mundial?', o: ['2', '8', '50'], r: 1,
    sabias: 'Son 6 naturales y 2 mixtos. Además hay 2 Geoparques Mundiales.', accion: 'Toca un símbolo del mapa y adivina por qué existe ese lugar.' },
};

// Misiones del pasaporte que pertenecen a cada capa
export const CAPA_MISIONES = {
  estados: ['hidalgo'],
  tectonica: ['prediccion', 'sismoReal', 'aviso60', 'simulacro', 'tsunami', 'tuSismo'],
  volcanes: ['erupcion', 'relieve'],
  biodiversidad: ['selva'],
  clima: ['frio'],
  historia: ['tula', 'tenochtitlan'],
  cultura: ['musica'],
  lenguas: ['lenguas'],
  sabores: ['sabores', 'nixtamal'],
  maravillas: ['geoparque', 'expedicion'],
};

const PESTANAS = [['descubre', 'Descubre'], ['experimenta', 'Experimenta'], ['comprende', 'Comprende'], ['fuentes', 'Fuentes']];
const respondidas = new Set();
const actual = {};
let alResponder = () => {};

export function organizarPanel({ onResponder } = {}) {
  if (onResponder) alResponder = onResponder;
  for (const s of document.querySelectorAll('.panel-capa')) {
    const capa = s.dataset.capa;
    const cab = [...s.children].filter((e) => e.matches('.sub, h2'));
    const resto = [...s.children].filter((e) => !cab.includes(e));
    const grupos = {};
    for (const el of resto) (grupos[el.dataset.tab || 'descubre'] ||= []).push(el);

    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-capa';
    const mision = document.createElement('div');
    mision.className = 'mision-capa';
    const barra = document.createElement('div');
    barra.className = 'pestanas';
    barra.setAttribute('role', 'tablist');
    s.append(tarjeta, mision, barra);

    for (const [id, nombre] of PESTANAS) {
      if (!grupos[id]) continue;
      const b = document.createElement('button');
      b.className = `pt pt-${id}`;
      b.setAttribute('role', 'tab');
      b.dataset.pestana = id;
      b.textContent = nombre;
      b.onclick = () => mostrarPestana(capa, id);
      barra.append(b);
      const cont = document.createElement('div');
      cont.className = 'pestana';
      cont.dataset.pestana = id;
      cont.setAttribute('role', 'tabpanel');
      cont.append(...grupos[id]);
      s.append(cont);
    }
    pintarTarjeta(capa);
    mostrarPestana(capa, 'descubre', false);
  }
  pintarMisiones();
  actualizarPestanas();
}

export function mostrarPestana(capa, id, desplazar = true) {
  const s = document.querySelector(`.panel-capa[data-capa="${capa}"]`);
  if (!s || !s.querySelector(`.pestana[data-pestana="${id}"]`)) return;
  actual[capa] = id;
  s.querySelectorAll('.pestana').forEach((p) => (p.hidden = p.dataset.pestana !== id));
  s.querySelectorAll('.pt').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pestana === id)));
  if (desplazar) s.querySelector('.pestanas').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function pintarTarjeta(capa) {
  const t = TARJETAS[capa];
  const el = document.querySelector(`.panel-capa[data-capa="${capa}"] .tarjeta-capa`);
  if (!t || !el) { el?.remove(); return; }
  const hecha = respondidas.has(capa);
  el.innerHTML = `
    <p class="tc-etq">Adivina primero</p>
    <p class="tc-pregunta">${t.p}</p>
    <div class="tc-opciones">${t.o.map((o, i) => `<button class="btn sec${hecha && i === t.r ? ' correcta' : ''}" data-o="${i}" ${hecha ? 'disabled' : ''}>${o}</button>`).join('')}</div>
    <div class="tc-respuesta" ${hecha ? '' : 'hidden'}><p><b class="tc-res"></b> ${t.sabias}</p><p class="tc-accion">${t.accion}</p></div>`;
  el.querySelectorAll('.tc-opciones button').forEach((b) => (b.onclick = () => {
    const bien = Number(b.dataset.o) === t.r;
    el.querySelectorAll('.tc-opciones button').forEach((x) => { x.disabled = true; x.classList.toggle('correcta', Number(x.dataset.o) === t.r); });
    if (!bien) b.classList.add('incorrecta');
    el.querySelector('.tc-res').textContent = bien ? '¡Exacto!' : `Era: ${t.o[t.r]}.`;
    el.querySelector('.tc-respuesta').hidden = false;
    respondidas.add(capa);
    alResponder(capa, bien);
  }));
}

export function pintarMisiones() {
  for (const [capa, ids] of Object.entries(CAPA_MISIONES)) {
    const el = document.querySelector(`.panel-capa[data-capa="${capa}"] .mision-capa`);
    if (!el) continue;
    const ms = ids.map((id) => MISIONES.find((m) => m.id === id)).filter(Boolean);
    const hechas = ms.filter((m) => estaHecha(m.id)).length;
    const pend = ms.find((m) => !estaHecha(m.id));
    el.classList.toggle('completa', !pend);
    el.innerHTML = pend
      ? `<span class="mc-ico" aria-hidden="true">${pend.icono}</span><div><b>Misión: ${pend.titulo}</b><small>${pend.pista}</small></div><span class="mc-cuenta">${hechas}/${ms.length}</span>`
      : `<span class="mc-ico" aria-hidden="true">✓</span><div><b>¡Completaste las misiones de esta capa!</b><small>Abre tu pasaporte para ver las demás.</small></div><span class="mc-cuenta">${hechas}/${ms.length}</span>`;
  }
}

// Oculta las pestañas que quedan vacías en el nivel actual (p. ej., «Comprende»
// para Exploradores en algunas capas). Se llama al cambiar de nivel.
export function actualizarPestanas() {
  // Se decide por las clases de nivel (no por medidas), para que funcione
  // aunque el panel esté plegado o la pestaña oculta.
  const cls = document.body.classList;
  const ocultas = cls.contains('nivel-exploradores') ? ['no-exploradores', 'solo-descubridores']
    : cls.contains('nivel-descubridores') ? ['solo-exploradores'] : ['solo-exploradores', 'solo-descubridores'];
  for (const s of document.querySelectorAll('.panel-capa')) {
    const capa = s.dataset.capa;
    for (const p of s.querySelectorAll('.pestana')) {
      const vacia = ![...p.children].some((el) => !ocultas.some((c) => el.classList.contains(c)) && el.textContent.trim());
      const b = s.querySelector(`.pt[data-pestana="${p.dataset.pestana}"]`);
      if (b) b.hidden = vacia;
    }
    const act = s.querySelector(`.pt[data-pestana="${actual[capa]}"]`);
    if (!act || act.hidden || getComputedStyle(act).display === 'none') mostrarPestana(capa, 'descubre', false);
  }
}

// Modo exhibición: todo vuelve como nuevo
export function reiniciarPanel() {
  respondidas.clear();
  for (const s of document.querySelectorAll('.panel-capa')) {
    pintarTarjeta(s.dataset.capa);
    mostrarPestana(s.dataset.capa, 'descubre', false);
  }
  pintarMisiones();
}
