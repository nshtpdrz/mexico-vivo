// Modo visor (VR con celular): para visores donde se coloca el celular (tipo Cardboard).
//
// No depende de WebXR (muchos celulares no lo tienen): la pantalla se parte en dos vistas, una por
// ojo (THREE.StereoCamera), y el giroscopio del celular gira la cabeza virtual. El mapa queda como
// una mesa grande frente al visitante, que está de pie en el lado sur.
//
// Interacción sin manos: una mira en el centro de la vista se llena en 1.5 s cuando se mira algo que
// se puede tocar (un estado, un volcán, un sitio…); al llenarse, o al apretar el botón del visor
// (que toca la pantalla), aparece su ficha flotando en el aire. Mirando hacia abajo, frente a la
// mesa, hay una fila de botones para cambiar de capa y uno para salir.
//
// En una computadora (sin giroscopio) se puede mirar arrastrando el ratón, para probar.
import * as THREE from 'three';

const ALTO_OJOS = 0.3;    // sobre la mesa (unidades del mapa: el país mide ~1 de ancho)
const DISTANCIA = 0.72;   // del centro del mapa hacia el sur: el mapa queda ~23° bajo la vista,
                          // dentro del campo visual aunque se mire al frente
const SEP_OJOS = 0.03;    // separación de los ojos: el país se siente como una mesa de unos 2 m
const PERMANENCIA = 1.5;  // segundos mirando algo para elegirlo

// imagen: pegatina (ruta) que se dibuja cuando carga; izq = a la izquierda del texto (botones)
function texturaTexto(lineas, { ancho = 1024, alto = 640, fondo = '#f7f1e4', borde = '#b3261e', imagen = null, izq = false } = {}) {
  const cv = document.createElement('canvas'); cv.width = ancho; cv.height = alto;
  const c = cv.getContext('2d');
  c.fillStyle = fondo; c.beginPath(); c.roundRect(8, 8, ancho - 16, alto - 16, 36); c.fill();
  c.lineWidth = 8; c.strokeStyle = borde; c.stroke();
  const x0 = izq && imagen ? alto + 4 : 60, margenDer = !izq && imagen ? 210 : 0;
  // y = línea base del renglón; cada bloque baja su propio alto antes de escribir (no se enciman)
  let y = alto > 200 ? 40 : (alto - (lineas[0]?.tam ?? 40)) / 2 - 8; // botones: texto centrado
  for (const { texto, tam = 40, color = '#1b1a17', fuente = 'Instrument Sans, sans-serif', peso = 400 } of lineas) {
    if (!texto) continue;
    c.font = `${peso} ${tam}px ${fuente}`; c.fillStyle = color;
    c.textBaseline = 'alphabetic';
    const palabras = String(texto).split(' ');
    let renglon = '';
    y += tam;
    for (const p of palabras) {
      const prueba = renglon ? renglon + ' ' + p : p;
      if (c.measureText(prueba).width > ancho - 120 - margenDer - x0 + 60 && renglon) { c.fillText(renglon, x0, y); y += tam * 1.25; renglon = p; } else renglon = prueba;
    }
    if (renglon) c.fillText(renglon, x0, y);
    y += tam * 0.4;
    if (y > alto - 40) break;
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (imagen) {
    const img = new Image();
    img.onload = () => {
      const lado = izq ? alto - 36 : 190;
      if (izq) c.drawImage(img, 14, 18, lado, lado); else c.drawImage(img, ancho - lado - 36, 30, lado, lado);
      t.needsUpdate = true;
    };
    img.src = imagen;
  }
  return t;
}

/**
 * @param {object} o
 *  renderer, escena, mapa
 *  rayoCentro(cam) → { hit }      objeto que se mira (mismo criterio que un toque)
 *  infoDe(userData) → { titulo, sub, texto } | null
 *  capas: [[id, nombre], …], cambiarCapa(id), capaActual()
 *  alCambiarTamano()               para recalcular el lienzo al entrar y salir
 */
export function crearVisor(o) {
  const { renderer, escena, mapa } = o;
  const camara = new THREE.PerspectiveCamera(85, 1, 0.005, 20);
  const estereo = new THREE.StereoCamera();
  estereo.eyeSep = SEP_OJOS;
  escena.add(camara);
  const v = { activo: false, camara };

  // ---- cabeza: orientación del celular → cuaternión (convención de DeviceOrientationControls) ----
  const qCabeza = new THREE.Quaternion(), qAjuste = new THREE.Quaternion();
  const euler = new THREE.Euler(), q0 = new THREE.Quaternion(), qX = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const zee = new THREE.Vector3(0, 0, 1);
  let orientacion = null, calibrar = true, conGiroscopio = false, tEntrada = 0, ultimoToque = 0;
  // Solo se usa el giroscopio si sus datos se mueven: un celular en la mano siempre tiembla un poco.
  // Algunos Chrome de computadora mandan eventos con valores fijos (0, 0, 0) sin sensor real: si se
  // tomaran, la vista quedaría clavada mirando hacia abajo y el ratón no funcionaría.
  let primera = null, usarRaton = false;
  const alOrientar = (e) => {
    if (e.alpha == null || usarRaton) return;
    if (!primera) primera = [e.alpha, e.beta, e.gamma];
    const mueve = Math.abs(e.alpha - primera[0]) + Math.abs(e.beta - primera[1]) + Math.abs(e.gamma - primera[2]) > 0.3;
    orientacion = e;
    if (mueve) conGiroscopio = true;
  };
  function poseDesdeGiroscopio() {
    const a = THREE.MathUtils.degToRad(orientacion.alpha), b = THREE.MathUtils.degToRad(orientacion.beta), g = THREE.MathUtils.degToRad(orientacion.gamma);
    const ang = THREE.MathUtils.degToRad(screen.orientation?.angle ?? window.orientation ?? 0);
    euler.set(b, a, -g, 'YXZ');
    qCabeza.setFromEuler(euler).multiply(qX).multiply(q0.setFromAxisAngle(zee, -ang));
    if (calibrar) {
      // Lo que el visitante tenga enfrente pasa a ser «hacia el mapa» (norte, −z). Solo se calibra
      // cuando el celular ya está de pie (en el visor, mirando al frente) y pasó un momento desde que
      // se tocó «Visor VR»: con el celular acostado en la mano el rumbo sale al azar y el mapa
      // quedaba a un lado o detrás.
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(qCabeza);
      const deFrente = Math.abs(f.y) < 0.5, yaListo = performance.now() - tEntrada > 1500;
      if (deFrente && yaListo) {
        qAjuste.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(-f.x, -f.z));
        calibrar = false;
      }
    }
    camara.quaternion.copy(qAjuste).multiply(qCabeza);
  }
  // ratón (computadora): mirar arrastrando
  let yaw = 0, pitch = -0.4, arrastre = null;
  const alBajar = (e) => { arrastre = [e.clientX, e.clientY, yaw, pitch, performance.now()]; };
  const alMover = (e) => {
    if (!arrastre) return;
    if (e.pointerType === 'mouse' && conGiroscopio) { usarRaton = true; conGiroscopio = false; } // en computadora manda el ratón
    if (conGiroscopio) return;
    yaw = arrastre[2] - (e.clientX - arrastre[0]) * 0.004;
    pitch = THREE.MathUtils.clamp(arrastre[3] - (e.clientY - arrastre[1]) * 0.004, -1.4, 1.2);
  };
  const alSoltar = (e) => {
    // un toque corto (el botón del visor toca la pantalla) elige lo que se está mirando
    // dos toques seguidos recentran: lo que se mira en ese momento pasa a ser «el frente»
    if (arrastre && Math.hypot(e.clientX - arrastre[0], e.clientY - arrastre[1]) < 8 && performance.now() - arrastre[4] < 500) {
      const ahora = performance.now();
      if (ahora - ultimoToque < 400) { calibrar = true; tEntrada = 0; yaw = 0; pitch = -0.4; navigator.vibrate?.([20, 40, 20]); }
      else elegir();
      ultimoToque = ahora;
    }
    arrastre = null;
  };

  // ---- mira con anillo de progreso ----
  const mira = new THREE.Group();
  const matMira = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 });
  const punto = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 16), matMira);
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.0125, 40, 1), new THREE.MeshBasicMaterial({ color: 0xb3261e, depthTest: false, transparent: true }));
  const aroFondo = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.0125, 40, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.35 }));
  [punto, aro, aroFondo].forEach((m) => { m.renderOrder = 1000; mira.add(m); });
  mira.position.z = -0.5;
  camara.add(mira);
  const totalIdx = aro.geometry.index.count;

  // ---- aviso mientras se calibra (pegado a la vista) ----
  const aviso = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshBasicMaterial({
    map: texturaTexto([{ texto: 'Pon el celular en el visor y mira al frente', tam: 46, peso: 600 }, { texto: 'Dos toques: volver a centrar el mapa', tam: 34, color: '#5a5245' }], { ancho: 1000, alto: 250 }),
    transparent: true, depthTest: false,
  }));
  aviso.renderOrder = 1001; aviso.position.set(0, 0.03, -0.55); aviso.visible = false;
  camara.add(aviso);

  // ---- ficha flotante ----
  let ficha = null, fichaHasta = 0;
  function mostrarFicha(info) {
    if (ficha) { escena.remove(ficha); ficha.material.map.dispose(); ficha.material.dispose(); ficha.geometry.dispose(); }
    const tex = texturaTexto([
      { texto: info.sub || '', tam: 40, color: '#b3261e', fuente: 'DM Mono, monospace', peso: 500 },
      { texto: info.titulo, tam: 84, fuente: 'Instrument Serif, serif' },
      { texto: info.texto || '', tam: 50 },
    ], { ancho: 1024, alto: 560, imagen: info.imagen });
    ficha = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.186), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
    ficha.renderOrder = 900;
    // arriba de lo que se mira (para no taparlo: el estado elegido se viste con su patrón), mirando al visitante
    const dir = new THREE.Vector3(0, 0.3, -1).applyQuaternion(camara.quaternion).normalize();
    ficha.position.copy(camara.position).addScaledVector(dir, 0.55);
    ficha.quaternion.copy(camara.quaternion);
    escena.add(ficha);
    fichaHasta = performance.now() + 14000;
  }

  // ---- botones de capa (mirando hacia abajo, frente a la mesa) ----
  const botones = new THREE.Group();
  escena.add(botones);
  const listaBotones = [];
  function crearBotones() {
    botones.clear();
    listaBotones.length = 0;
    const items = [...o.capas, ['__salir', 'Salir']];
    const n = items.length, ancho = 0.95 / n;
    items.forEach(([id, nombre], i) => {
      const activo = id === o.capaActual();
      const tex = texturaTexto([{ texto: nombre, tam: 58, color: activo ? '#fff' : '#1b1a17', peso: 600 }], { ancho: 512, alto: 160, fondo: activo ? '#b3261e' : id === '__salir' ? '#e8dcc4' : '#f7f1e4', imagen: id === '__salir' ? null : `assets/pegatinas/${id}.png`, izq: true });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(ancho * 0.94, ancho * 0.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      const x = -0.475 + ancho * (i + 0.5);
      b.position.set(x, 0.03, 0.42 + Math.abs(x) * 0.12);
      b.rotation.set(-1.0, -x * 0.35, 0);
      b.userData = { botonVR: id };
      botones.add(b);
      listaBotones.push(b);
    });
  }

  // ---- qué se mira ----
  const rayo = new THREE.Raycaster();
  let objetivo = null, desde = 0;
  function mirando() {
    rayo.setFromCamera(new THREE.Vector2(0, 0), camara);
    const b = rayo.intersectObjects(listaBotones, false)[0];
    if (b) return { boton: b.object.userData.botonVR, clave: 'b:' + b.object.userData.botonVR };
    const { hit } = o.rayoCentro(camara);
    const ud = hit?.userData;
    if (!ud || !ud.tipo || ud.tipo === 'eje' || ud.tipo === 'placa') return null;
    return { ud, clave: ud.tipo + ':' + (ud.id ?? ud.data?.id ?? ud.data?.nombre ?? hit.id) };
  }
  function elegir() {
    const m = objetivo;
    if (!m) return;
    navigator.vibrate?.(25);
    if (m.boton === '__salir') { v.salir(); return; }
    if (m.boton) { o.cambiarCapa(m.boton); crearBotones(); return; }
    const info = o.infoDe(m.ud);
    if (info) mostrarFicha(info);
    desde = performance.now() + 1e9; // no volver a elegir lo mismo mientras se sigue mirando
  }

  // ---- fondo de patrones: el mismo fondo artesanal de la pantalla, ahora como una pared circular
  // tapizada alrededor del visitante (con un velo de papel, como en la página) ----
  let pared = null, idFondo = null;
  v.setFondo = (id) => {
    if ((id ?? null) === idFondo && (pared || !v.activo)) return;
    idFondo = id ?? null;
    if (pared) { escena.remove(pared); pared.traverse((m) => { if (m.isMesh) { m.material.map?.dispose(); m.material.dispose(); m.geometry.dispose(); } }); pared = null; }
    if (!v.activo || !idFondo) return;
    const tex = new THREE.TextureLoader().load(`assets/patrones/${idFondo}.jpg`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const R = 2.4, H = 3.2, mosaico = 0.5; // un mosaico del patrón mide 0.5 (≈ 2.4 veces el ancho del país / 10)
    tex.repeat.set(Math.round((2 * Math.PI * R) / mosaico), Math.round(H / mosaico));
    // cuarto tapizado: pared circular y piso con el patrón, el mapa como mesa en medio
    const PISO = -0.6;
    const matPared = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });
    const texPiso = tex.clone(); texPiso.repeat.set(Math.round((2 * R) / mosaico), Math.round((2 * R) / mosaico)); texPiso.needsUpdate = true;
    const matPiso = new THREE.MeshBasicMaterial({ map: texPiso, transparent: true, opacity: 0, depthWrite: false });
    pared = new THREE.Group();
    const muro = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), matPared);
    muro.position.y = PISO + H / 2;
    const piso = new THREE.Mesh(new THREE.CircleGeometry(R, 64), matPiso);
    piso.rotation.x = -Math.PI / 2; piso.position.y = PISO;
    [muro, piso].forEach((m) => { m.renderOrder = -1; pared.add(m); });
    pared.position.set(0, 0, DISTANCIA * 0.5);
    escena.add(pared);
    const t0 = performance.now(), p = pared;
    const aparecer = () => { if (pared !== p) return; const k = Math.min(1, (performance.now() - t0) / 700); matPared.opacity = 0.42 * k; matPiso.opacity = 0.3 * k; if (k < 1) requestAnimationFrame(aparecer); };
    aparecer();
  };

  // ---- entrar / salir ----
  let dprAntes = 1, bloqueo = null, fondoAntes = null;
  v.entrar = async () => {
    // iOS pide permiso para el giroscopio (debe ser dentro del toque del botón)
    try { if (typeof DeviceOrientationEvent?.requestPermission === 'function') await DeviceOrientationEvent.requestPermission(); } catch (_) {}
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (_) {}
    try { await screen.orientation?.lock?.('landscape'); } catch (_) {}
    try { bloqueo = await navigator.wakeLock?.request('screen'); } catch (_) {}
    v.activo = true; calibrar = true; conGiroscopio = false; orientacion = null; tEntrada = performance.now(); primera = null; usarRaton = false;
    fondoAntes = escena.background; escena.background = new THREE.Color('#e9dfcc'); // papel de la marca
    yaw = 0; pitch = -0.4;
    document.body.classList.add('en-visor');
    dprAntes = renderer.getPixelRatio();
    renderer.setPixelRatio(Math.min(1.25, devicePixelRatio)); // dos vistas: menos pixeles por vista
    addEventListener('deviceorientation', alOrientar);
    renderer.domElement.addEventListener('pointerdown', alBajar);
    addEventListener('pointermove', alMover);
    addEventListener('pointerup', alSoltar);
    crearBotones();
    v.setFondo(o.fondoActual?.() ?? null);
    o.alCambiarTamano?.();
  };
  v.salir = () => {
    if (!v.activo) return;
    v.activo = false;
    escena.background = fondoAntes;
    document.body.classList.remove('en-visor');
    removeEventListener('deviceorientation', alOrientar);
    renderer.domElement.removeEventListener('pointerdown', alBajar);
    removeEventListener('pointermove', alMover);
    removeEventListener('pointerup', alSoltar);
    if (ficha) { escena.remove(ficha); ficha = null; }
    v.setFondo(null);
    botones.clear(); listaBotones.length = 0;
    renderer.setPixelRatio(dprAntes);
    renderer.setScissorTest(false);
    try { bloqueo?.release(); } catch (_) {}
    try { screen.orientation?.unlock?.(); } catch (_) {}
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    mapa.setHover(null);
    o.alCambiarTamano?.();
  };
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && v.activo && conGiroscopio) v.salir(); });
  addEventListener('keydown', (e) => {
    if (!v.activo) return;
    if (e.key === 'Escape') v.salir();
    const paso = 0.08;
    if (e.key === 'ArrowLeft') yaw += paso; else if (e.key === 'ArrowRight') yaw -= paso;
    else if (e.key === 'ArrowUp') pitch = Math.min(1.2, pitch + paso); else if (e.key === 'ArrowDown') pitch = Math.max(-1.4, pitch - paso);
    else if (e.key === 'Enter' || e.key === ' ') elegir();
  });

  // ---- cada cuadro ----
  const tam = new THREE.Vector2();
  v.render = () => {
    camara.position.set(0, ALTO_OJOS, DISTANCIA);
    if (conGiroscopio && orientacion) { poseDesdeGiroscopio(); aviso.visible = calibrar; }
    else { camara.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')); aviso.visible = false; }
    renderer.getSize(tam);
    camara.aspect = tam.x / 2 / tam.y;
    camara.updateProjectionMatrix();
    camara.updateMatrixWorld();
    // mira: ¿qué se está viendo?
    const m = mirando();
    const clave = m?.clave ?? null;
    if (clave !== (objetivo?.clave ?? null)) { objetivo = m; desde = performance.now(); }
    mapa.setHover(objetivo?.ud?.tipo === 'estado' ? objetivo.ud.id : null);
    const p = objetivo ? Math.min(1, (performance.now() - desde) / (PERMANENCIA * 1000)) : 0;
    aro.geometry.setDrawRange(0, Math.floor((totalIdx * p) / 6) * 6);
    aro.visible = p > 0;
    punto.scale.setScalar(objetivo ? 1.6 : 1);
    if (p >= 1) elegir();
    if (ficha && performance.now() > fichaHasta) { escena.remove(ficha); ficha = null; }
    // dos vistas
    estereo.update(camara);
    renderer.setScissorTest(true);
    const w = tam.x / 2;
    renderer.setScissor(0, 0, w, tam.y); renderer.setViewport(0, 0, w, tam.y);
    renderer.render(escena, estereo.cameraL);
    renderer.setScissor(w, 0, w, tam.y); renderer.setViewport(w, 0, w, tam.y);
    renderer.render(escena, estereo.cameraR);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, tam.x, tam.y);
  };
  return v;
}
