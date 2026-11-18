// Recorrido guiado de unos 4 minutos: une las capas en una sola historia,
// «del subsuelo a la cultura». Cada paso hace una acción en el mapa y explica
// qué se ve. El visitante avanza con «Siguiente» (nada corre solo, para que
// pueda leer a su ritmo o el guía del museo pueda explicar).
//
// Solo usa contenidos que ya existen en la app; los que siguen en revisión
// conservan su aviso en la ficha.

export function crearRecorrido(api) {
  const PASOS = [
    {
      titulo: 'Un país que se mueve',
      texto: 'México está sobre cinco placas tectónicas que se mueven unos centímetros por año. Ese movimiento explica sus sismos, sus volcanes y buena parte de su paisaje. Empezamos aquí: en Hidalgo.',
      hacer() { api.cambiarCapa('estados'); api.volarA(-99.0, 21.5, 1.15); setTimeout(() => { api.fichaEstado('MX-HID'); api.volarA(-98.8, 20.3, 0.45); }, 1700); },
    },
    {
      titulo: 'Bajo tus pies',
      texto: 'Bajo el océano Pacífico, la placa de Cocos se mete por debajo de México. Bajo Guerrero viaja casi plana, a unos 50 km de profundidad, antes de hundirse más. Esta vista es esquemática y la profundidad está exagerada 4 veces.',
      hacer() { api.cambiarCapa('tectonica'); api.verSubsuelo(true); api.volarA(-99.3, 17.6, 0.55); },
    },
    {
      titulo: 'Tu predicción',
      texto: 'Imagina un sismo de magnitud 7.4 frente a Acapulco. ¿Cuántos segundos de aviso tendría Pachuca antes de que llegue el movimiento fuerte? Mueve el control de «Tu predicción» y luego pulsa Siguiente.',
      hacer() { api.prepararPrediccion(); },
    },
    {
      titulo: 'Observa las ondas',
      texto: 'Las ondas P (azul) viajan más rápido que las ondas S (rojo), que son las que más sacuden. La alerta viaja por radio, casi al instante, y por eso puede llegar antes. Compara tu predicción con el resultado. Es una simulación educativa, no el sistema real de alerta.',
      hacer() { api.simularAcapulco(); },
    },
    {
      titulo: 'Escucha la Tierra',
      texto: 'Este es un registro real del sismo del 19 de septiembre de 2017, medido por el sismógrafo de Ciudad Universitaria (UNAM). La vibración es demasiado lenta para oírla, así que la aceleramos 200 veces.',
      hacer() { api.escucharReal('puebla2017'); },
    },
    {
      titulo: 'Fuego bajo la montaña',
      texto: 'A unos 100 km de profundidad, la placa que se hunde suelta agua que funde el manto. Ese magma sube y forma la cadena de volcanes del centro del país. La erupción que ves es una representación educativa.',
      hacer() { api.cambiarCapa('volcanes'); api.volarA(-98.62, 19.02, 0.32); setTimeout(() => api.erupcion('Popocatépetl'), 1500); },
    },
    {
      titulo: 'Un país megadiverso',
      texto: 'El relieve crea muchos climas distintos, y con ellos muchos ecosistemas. Escucha una noche de selva grabada en la Sierra Norte de Puebla.',
      hacer() { api.cambiarCapa('biodiversidad'); api.volarA(-93.5, 17.0, 0.6); setTimeout(() => api.fichaEstado('MX-CHP'), 1600); },
    },
    {
      titulo: 'Más alto, más frío',
      texto: 'Estos son datos del tiempo de hace unos minutos. En la gráfica del panel, cada punto es una capital: mientras más alta está, más fría suele ser. Es una medición con datos reales, no un experimento controlado.',
      hacer() { api.cambiarCapa('clima'); api.volarA(-101.5, 22.5, 1.1); },
    },
    {
      titulo: 'Viaje en el tiempo',
      texto: 'Viajemos al año 950. En Tula, aquí en Hidalgo, florece la capital tolteca. Mueve la línea del tiempo del panel para ver otras épocas.',
      hacer() { api.cambiarCapa('historia'); api.ponerAnio(950); api.volarA(-99.34, 20.06, 0.5); },
    },
    {
      titulo: '¡Ahora explora tú!',
      texto: 'Toca lo que quieras: estados, volcanes, especies o épocas. Completa las misiones de tu pasaporte o pon a prueba lo que aprendiste en el reto.',
      hacer() { api.ponerAnio(null); api.volarA(-101.5, 22.5, 1.15); },
      final: true,
    },
  ];

  let i = -1;
  const el = document.createElement('section');
  el.className = 'recorrido';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Recorrido guiado');
  el.hidden = true;
  document.body.appendChild(el);

  function pintar() {
    const p = PASOS[i];
    el.innerHTML = `
      <div class="rec-cab"><span>Recorrido guiado · ${i + 1} de ${PASOS.length}</span><button class="rec-salir" aria-label="Salir del recorrido">×</button></div>
      <div class="rec-puntos">${PASOS.map((_, k) => `<i class="${k < i ? 'hecho' : k === i ? 'actual' : ''}"></i>`).join('')}</div>
      <h3>${p.titulo}</h3>
      <p>${p.texto}</p>
      <div class="rec-botones">
        ${i > 0 ? '<button class="btn sec" data-a="atras">Anterior</button>' : ''}
        ${p.final
          ? '<button class="btn" data-a="pasaporte">Ver pasaporte</button><button class="btn primario" data-a="salir">Explorar libremente</button>'
          : '<button class="btn primario" data-a="sig">Siguiente</button>'}
      </div>`;
    el.querySelector('.rec-salir').onclick = salir;
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'sig') ir(i + 1);
      else if (a === 'atras') ir(i - 1);
      else if (a === 'pasaporte') { salir(); api.abrirPasaporte(); }
      else salir();
    }));
    el.querySelector('[data-a="sig"], [data-a="salir"]')?.focus({ preventScroll: true });
  }

  function ir(k) {
    if (k < 0 || k >= PASOS.length) return;
    api.antesDePaso();
    i = k;
    pintar();
    try { PASOS[i].hacer(); } catch (e) { console.warn('Paso del recorrido', e); }
    api.clic();
  }

  function iniciar() {
    el.hidden = false;
    document.body.classList.add('en-recorrido');
    ir(0);
  }

  function salir() {
    el.hidden = true;
    document.body.classList.remove('en-recorrido');
    api.alSalir();
    i = -1;
  }

  const activo = () => !el.hidden;
  return { iniciar, salir, activo };
}
