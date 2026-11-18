// Evaluación del aprendizaje: la misma prueba corta ANTES y DESPUÉS de usar el
// prototipo, por visitante (anónimo, solo un número y un rango de edad).
// Se guarda en este navegador y se exporta a CSV para el documento técnico.

export const PREGUNTAS = [
  { p: '¿Qué onda sísmica viaja más rápido?', o: ['La onda P', 'La onda S', 'Las dos igual', 'Depende de la hora'], r: 0 },
  { p: '¿Por qué la alerta sísmica puede sonar en Pachuca ANTES de que llegue un sismo de la costa?', o: ['La radio viaja mucho más rápido que las ondas sísmicas', 'El sistema predice los sismos días antes', 'Hay sensores que sienten el sismo en Pachuca', 'Los satélites ven moverse las placas'], r: 0 },
  { p: 'Si subes una montaña, la temperatura del aire normalmente…', o: ['Sube', 'Baja', 'No cambia', 'Solo cambia de noche'], r: 1 },
  { p: '¿Por qué hay volcanes en el centro de México?', o: ['Una placa se hunde, suelta agua y eso funde el manto', 'Por el calor del Sol', 'Por meteoritos antiguos', 'Por el petróleo del subsuelo'], r: 0 },
];

const CLAVE = 'mv-evaluacion-v1';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (_) { return []; } };
const guardar = (d) => { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (_) {} };

export function registros() { return leer(); }

export function siguienteId() {
  const d = leer();
  return d.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

export function pendientes() {
  const d = leer();
  const conDespues = new Set(d.filter((r) => r.fase === 'despues').map((r) => r.id));
  return d.filter((r) => r.fase === 'antes' && !conDespues.has(r.id)).map((r) => r.id);
}

export function registrar(id, fase, edad, respuestas) {
  const d = leer();
  const aciertos = respuestas.reduce((s, x, i) => s + (x === PREGUNTAS[i].r ? 1 : 0), 0);
  d.push({ id, fase, edad, respuestas, aciertos, fecha: new Date().toISOString() });
  guardar(d);
  return aciertos;
}

// Estadística por pares completos (antes + después del mismo visitante)
export function resumen() {
  const d = leer();
  const n = PREGUNTAS.length;
  const pares = [];
  for (const a of d.filter((r) => r.fase === 'antes')) {
    const b = d.find((r) => r.fase === 'despues' && r.id === a.id);
    if (b) pares.push({ id: a.id, edad: a.edad, antes: a.aciertos, despues: b.aciertos, a, b });
  }
  if (!pares.length) return { pares, n };
  const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const mA = media(pares.map((p) => p.antes));
  const mD = media(pares.map((p) => p.despues));
  const mejoraron = pares.filter((p) => p.despues > p.antes).length;
  // Ganancia normalizada de Hake: (después − antes) / (máximo − antes)
  const g = mA < n ? (mD - mA) / (n - mA) : 0;
  const porPregunta = PREGUNTAS.map((q, i) => ({
    antes: pares.filter((p) => p.a.respuestas[i] === q.r).length / pares.length,
    despues: pares.filter((p) => p.b.respuestas[i] === q.r).length / pares.length,
  }));
  return { pares, n, mA, mD, mejoraron, g, porPregunta };
}

export function csv() {
  const filas = [['visitante', 'fase', 'edad', 'fecha', ...PREGUNTAS.map((_, i) => `p${i + 1}_correcta`), 'aciertos']];
  for (const r of leer()) {
    filas.push([r.id, r.fase, r.edad, r.fecha, ...r.respuestas.map((x, i) => (x === PREGUNTAS[i].r ? 1 : 0)), r.aciertos]);
  }
  return filas.map((f) => f.join(',')).join('\n');
}

export function borrarTodo() { guardar([]); }
