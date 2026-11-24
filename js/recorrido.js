// Investigación guiada: une las capas alrededor de UNA pregunta,
// «¿por qué en México tiembla, hay volcanes y tanta vida?», en tres partes. Cada paso es una
// pista que hace una acción en el mapa; en medio, quien explora formula una hipótesis y la
// comprueba con la simulación, y al final responde la pregunta con lo que observó.
// Nada corre solo: se avanza con «Siguiente», al ritmo de cada quien (o de quien presenta el
// proyecto).
//
// Solo usa contenidos que ya existen en la app.

export function crearRecorrido(api) {
  const PARTES = ['La Tierra se mueve', 'De la roca a la vida', 'Huellas humanas'];
  const PASOS = [
    {
      parte: 0, titulo: 'La pregunta',
      texto: 'Investiguemos: ¿por qué en México tiembla, hay volcanes activos y tanta vida? Vamos a reunir pistas en el mapa y al final responderás tú. Empezamos en Hidalgo, nuestro estado.',
      hacer() { api.cambiarCapa('estados'); api.volarA(-99.0, 21.5, 1.15); setTimeout(() => { api.fichaEstado('MX-HID'); api.volarA(-98.8, 20.3, 0.45); }, 1700); },
    },
    {
      parte: 0, titulo: 'Pista 1 · Bajo tus pies',
      texto: 'Bajo el océano Pacífico, la placa de Cocos se mete por debajo de México. Bajo Guerrero viaja casi plana, a unos 50 km de profundidad, antes de hundirse más. Esta vista es esquemática y la profundidad está exagerada 4 veces.',
      hacer() { api.cambiarCapa('tectonica'); api.verSubsuelo(true); api.volarA(-99.3, 17.6, 0.55); },
    },
    {
      parte: 0, titulo: 'Tu hipótesis',
      texto: 'Imagina un sismo de magnitud 7.4 frente a Acapulco. ¿Cuántos segundos de aviso tendría Pachuca antes de que llegue el movimiento fuerte? Escribe tu hipótesis con el control «Tu predicción» y luego pulsa Siguiente.',
      hacer() { api.prepararPrediccion(); },
    },
    {
      parte: 0, titulo: 'Compruébalo',
      texto: 'Las ondas P (azul) viajan más rápido que las ondas S (rojo), que son las que más sacuden. La alerta viaja por radio, casi al instante, y por eso puede llegar antes. Compara tu hipótesis con el resultado. Es una simulación educativa, no el sistema real de alerta.',
      hacer() { api.simularAcapulco(); },
    },
    {
      parte: 0, titulo: 'Pista 2 · Escucha la Tierra',
      texto: 'Este es un registro real del sismo del 19 de septiembre de 2017, medido por el sismógrafo de Ciudad Universitaria (UNAM). La vibración es demasiado lenta para oírla, así que la aceleramos 200 veces.',
      hacer() { api.escucharReal('puebla2017'); },
    },
    {
      parte: 1, titulo: 'Pista 3 · Fuego bajo la montaña',
      texto: 'A unos 100 km de profundidad, la placa que se hunde suelta agua que funde el manto. Ese magma sube y forma la cadena de volcanes del centro del país. La erupción que ves es una representación educativa.',
      hacer() { api.cambiarCapa('volcanes'); api.volarA(-98.62, 19.02, 0.32); setTimeout(() => api.erupcion('Popocatépetl'), 1500); },
    },
    {
      parte: 1, titulo: 'Pista 4 · Un país megadiverso',
      texto: 'El relieve crea muchos climas distintos, y con ellos muchos ecosistemas. Escucha una noche de selva grabada en la Sierra Norte de Puebla.',
      hacer() { api.cambiarCapa('biodiversidad'); api.volarA(-93.5, 17.0, 0.6); setTimeout(() => api.fichaEstado('MX-CHP'), 1600); },
    },
    {
      parte: 1, titulo: 'Pista 5 · Más alto, más frío',
      texto: 'Estos son datos del tiempo de hace unos minutos. En la gráfica del panel, cada punto es una capital: mientras más alta está, más fría suele ser. Es una medición con datos reales, no un experimento controlado.',
      hacer() { api.cambiarCapa('clima'); api.mostrarPestana('clima', 'experimenta', false); api.volarA(-101.5, 22.5, 1.1); },
    },
    {
      parte: 2, titulo: 'Pista 6 · Lo que sembramos',
      texto: 'En ese territorio tan variado se domesticaron plantas que hoy come todo el mundo. En el valle del Balsas, en Guerrero, hay rastros de maíz de hace unos 8,700 años.',
      hacer() { api.ponerAnio(null); api.cambiarCapa('sabores'); api.volarA(-99.4, 18.3, 0.55); },
    },
    {
      parte: 2, titulo: 'Pista 7 · Viaje en el tiempo',
      texto: 'Viajemos al año 950. En Tula, en Hidalgo, florece la capital tolteca. Mueve la línea del tiempo del panel para ver otras épocas.',
      hacer() { api.cambiarCapa('historia'); api.ponerAnio(950); api.volarA(-99.34, 20.06, 0.5); },
    },
    {
      parte: 2, titulo: 'Tu conclusión',
      texto: 'Con todas las pistas: ¿qué une los sismos, los volcanes y la gran diversidad de vida de México?',
      opciones: [
        { t: 'México está donde se juntan varias placas tectónicas: eso causa sismos y volcanes, y forma un relieve con muchos climas y ecosistemas.', ok: true },
        { t: 'Es casualidad: cada fenómeno tiene una causa distinta y sin relación.' },
        { t: 'Todo depende de cómo llueve cada año.' },
      ],
      explica: 'Las placas explican los sismos y los volcanes. El relieve que forman crea muchos climas, y con ellos, tanta diversidad de vida. Sobre ese territorio, los pueblos domesticaron el maíz y levantaron sus ciudades.',
      hacer() { api.ponerAnio(null); api.volarA(-101.5, 22.5, 1.15); },
      final: true,
    },
  ];

  let i = -1, respuesta = null;
  const el = document.createElement('section');
  el.className = 'recorrido';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Investigación guiada');
  el.hidden = true;
  document.body.appendChild(el);

  function pintar() {
    const p = PASOS[i];
    const puntos = PARTES.map((_, n) => `<span class="rec-parte">${PASOS.map((q, k) => (q.parte === n ? `<i class="${k < i ? 'hecho' : k === i ? 'actual' : ''}"></i>` : '')).join('')}</span>`).join('');
    const opciones = p.opciones
      ? `<div class="rec-opciones">${p.opciones.map((o, k) => `<button class="btn opcion ${respuesta === k ? (o.ok ? 'bien' : 'malo') : respuesta != null && o.ok ? 'bien' : ''}" data-o="${k}" ${respuesta != null ? 'disabled' : ''}>${o.t}</button>`).join('')}</div>
         ${respuesta != null ? `<p class="rec-explica"><b>${p.opciones[respuesta].ok ? '¡Exacto!' : 'Revisa tus pistas.'}</b> ${p.explica}</p>` : ''}`
      : '';
    el.innerHTML = `
      <div class="rec-cab"><span>Investigación guiada · Parte ${p.parte + 1}: ${PARTES[p.parte]}</span><button class="rec-salir" aria-label="Salir de la investigación">×</button></div>
      <div class="rec-puntos">${puntos}</div>
      <h3>${p.titulo}</h3>
      <p>${p.texto}</p>
      ${opciones}
      <div class="rec-botones">
        ${i > 0 ? '<button class="btn sec" data-a="atras">Anterior</button>' : ''}
        ${p.final
          ? (respuesta != null ? '<button class="btn" data-a="bitacora"><img class="pi" loading="lazy" src="assets/pegatinas/ui/bitacora.png" alt="">Abrir bitácora</button><button class="btn primario" data-a="salir">Explorar libremente</button>' : '')
          : '<button class="btn primario" data-a="sig"><img class="pi" loading="lazy" src="assets/pegatinas/ui/siguiente.png" alt="">Siguiente</button>'}
      </div>`;
    el.querySelector('.rec-salir').onclick = salir;
    el.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => { respuesta = +b.dataset.o; api.clic(); pintar(); }));
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'sig') ir(i + 1);
      else if (a === 'atras') ir(i - 1);
      else if (a === 'bitacora') { salir(); api.abrirBitacora(); }
      else salir();
    }));
    el.querySelector('[data-a="sig"], [data-a="salir"], [data-o]')?.focus({ preventScroll: true });
  }

  function ir(k) {
    if (k < 0 || k >= PASOS.length) return;
    api.antesDePaso();
    i = k;
    pintar();
    try { PASOS[i].hacer(); } catch (e) { console.warn('Paso de la investigación', e); }
    api.clic();
  }

  function iniciar() {
    respuesta = null;
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
