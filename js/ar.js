// Realidad aumentada con MindAR (seguimiento de imagen).
// La cámara reconoce el mapa impreso y el mapa 3D aparece "pegado" al papel.
//
// Sobre lo que da MindAR se agregan capas para que la ilusión no se rompa:
//  · seguidor suavizado: el mapa no cuelga directo del ancla; la sigue con un filtro, así
//    no tiembla y, al recuperar el cartel, llega deslizándose en vez de saltar;
//  · giroscopio: si el cartel se pierde (mano, reflejo), el mapa se queda en su lugar
//    compensando el giro de la tablet hasta 10 s;
//  · luz del cuarto: el brillo de la cámara ajusta las luces; sombra de contacto sobre el papel;
//  · grano de cámara solo sobre lo virtual, para que no se vea «demasiado limpio» encima del video;
//  · calidad automática propia de la AR (resolución, sombras y grano);
//  · gestos: pellizcar para acercar, girar con dos dedos, doble toque para reiniciar;
//  · foto: une el video y el mapa en una imagen.
import * as THREE from '../vendor/three/three.module.js';
import { dibujarMarcador } from './marcador.js';

const DB = 'mexico-vivo';
const CLAVE = 'marcador-v2'; // cambia cuando cambia el diseño del marcador

function idb(modo, fn) {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => mal(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', modo);
      const r = fn(tx.objectStore('kv'));
      tx.oncomplete = () => ok(r.result);
      tx.onerror = () => mal(tx.error);
    };
  });
}
const idbGet = (k) => idb('readonly', (s) => s.get(k)).catch(() => null);
const idbSet = (k, v) => idb('readwrite', (s) => s.put(v, k)).catch(() => null);

// Compila la imagen del marcador al formato .mind (rasgos visuales que MindAR busca)
export async function compilarMarcador(onProgreso) {
  const { Compiler } = await import('../vendor/mindar/mindar-image.prod.js');
  const cv = dibujarMarcador(document.createElement('canvas'), 1200);
  const img = new Image();
  img.src = cv.toDataURL('image/png');
  await img.decode();
  const compiler = new Compiler();
  await compiler.compileImageTargets([img], (p) => onProgreso?.(p));
  return compiler.exportData();
}

async function obtenerTargets(onEstado) {
  try {
    const r = await fetch('assets/marcador.mind', { method: 'HEAD' });
    if (r.ok) return 'assets/marcador.mind';
  } catch (_) {}
  let buf = await idbGet(CLAVE);
  if (!buf) {
    onEstado?.('Preparando el marcador AR (solo la primera vez)…', 0);
    buf = await compilarMarcador((p) => onEstado?.('Analizando el mapa impreso…', p));
    await idbSet(CLAVE, buf);
  }
  return URL.createObjectURL(new Blob([buf]));
}

// Precarga silenciosa (desde la portada): módulo de MindAR y rasgos del cartel en caché,
// para que al tocar «AR» solo falte abrir la cámara.
let precarga = null;
export function precargarAR() {
  if (!precarga) {
    precarga = Promise.all([
      import('../vendor/mindar/mindar-image-three.prod.js'),
      fetch('assets/marcador.mind').then((r) => r.ok && r.arrayBuffer()).catch(() => null),
    ]).catch(() => { precarga = null; });
  }
  return precarga;
}

// ---------------------------------------------------------------------
// Giroscopio: orientación de la tablet como cuaternión de cámara (misma conversión
// que DeviceOrientationControls de three.js).
// ---------------------------------------------------------------------
const giro = { q: null, activo: false, oyente: null };
const _zee = new THREE.Vector3(0, 0, 1), _euler = new THREE.Euler(), _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
function cuaternionDispositivo(alpha, beta, gamma, orient, salida) {
  _euler.set(beta, alpha, -gamma, 'YXZ');
  salida.setFromEuler(_euler);
  salida.multiply(_q1);
  salida.multiply(_q0.setFromAxisAngle(_zee, -orient));
  return salida;
}
// En iOS el permiso del giroscopio debe pedirse dentro del toque del usuario: por eso
// app.js llama a esto en el clic del botón AR, antes de cualquier await.
export function pedirGiroscopio() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') return D.requestPermission().catch(() => 'denied');
  return Promise.resolve(D ? 'granted' : 'denied');
}
function encenderGiro() {
  if (giro.oyente) return;
  giro.oyente = (e) => {
    if (e.alpha == null) return;
    const rad = THREE.MathUtils.DEG2RAD;
    const orient = (screen.orientation?.angle ?? window.orientation ?? 0) * rad;
    giro.q = cuaternionDispositivo(e.alpha * rad, e.beta * rad, e.gamma * rad, orient, giro.q || new THREE.Quaternion());
    giro.activo = true;
  };
  window.addEventListener('deviceorientation', giro.oyente);
}
function apagarGiro() {
  if (giro.oyente) window.removeEventListener('deviceorientation', giro.oyente);
  giro.oyente = null; giro.activo = false; giro.q = null;
}

// Grano de cámara solo donde hay algo virtual: el cuadro se dibuja «detrás de todo»
// (profundidad casi 1) con prueba de profundidad invertida, así pasa únicamente en los
// píxeles donde ya se dibujó el mapa; donde se ve el video no toca nada.
function crearGrano() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, fuerza: { value: 0.075 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: `uniform float t; uniform float fuerza; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + t) * 43758.5453); }
      void main(){ float n = h(floor(gl_FragCoord.xy / 1.5)); gl_FragColor = vec4(vec3(n), fuerza); }`,
    transparent: true, depthWrite: false, depthTest: true, depthFunc: THREE.GreaterDepth,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.frustumCulled = false;
  m.renderOrder = 999;
  return m;
}

export async function iniciarAR({ contenedor, mapa, onEstado, onDetectado, onFrame }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Este navegador no permite usar la cámara. Abre la página con https:// o desde localhost.');
  }
  onEstado?.('Abriendo la cámara…', 1);
  // en paralelo: rasgos del cartel, módulo de MindAR y el permiso de la cámara
  const permisoCamara = navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((s) => { s.getTracks().forEach((t) => t.stop()); }).catch(() => null);
  const [src, { MindARThree }] = await Promise.all([
    obtenerTargets(onEstado),
    import('../vendor/mindar/mindar-image-three.prod.js'),
    permisoCamara,
  ]);
  const mindar = new MindARThree({
    container: contenedor,
    imageTargetSrc: src,
    uiLoading: 'no',
    uiScanning: 'yes',
    uiError: 'yes',
    filterMinCF: 0.0001,
    filterBeta: 0.004,
    warmupTolerance: 3,
    missTolerance: 8,
  });
  const { renderer, scene, camera } = mindar;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // seguidor: el grupo que de verdad lleva el mapa
  const seguidor = new THREE.Group();
  seguidor.visible = false;
  scene.add(seguidor);

  // luces del tema Atlas (cálidas), viajan con el mapa para que la sombra caiga siempre igual
  const cielo = new THREE.HemisphereLight(0xfff1da, 0x6e5c48, 1.15);
  scene.add(cielo);
  const sol = new THREE.DirectionalLight(0xfff0d8, 1.9);
  sol.position.set(-0.45, 0.55, 1.1); // noroeste, alto: como la luz de una ventana
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.002;
  Object.assign(sol.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 0.1, far: 3 });
  seguidor.add(sol, sol.target);
  // sombra de contacto sobre el cartel real (solo se ve la sombra, no el plano)
  const atrapaSombra = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.3 }));
  atrapaSombra.position.z = 0.0005;
  atrapaSombra.receiveShadow = true;
  seguidor.add(atrapaSombra);
  const grano = crearGrano();
  scene.add(grano);

  const anchor = mindar.addAnchor(0);
  const padreOriginal = mapa.root.parent;
  const transformOriginal = {
    pos: mapa.root.position.clone(), rot: mapa.root.rotation.clone(), esc: mapa.root.scale.clone(),
  };
  mapa.root.position.set(0, 0, 0);
  mapa.root.rotation.set(0, 0, 0);
  mapa.root.scale.set(1, 1, 1);
  seguidor.add(mapa.root);
  mapa.papel.visible = false;

  // --- seguimiento ---
  // último pose bueno del cartel (en coordenadas de cámara) y la orientación de la tablet en ese momento
  const ultimo = { m: new THREE.Matrix4(), qGiro: new THREE.Quaternion(), t: 0, hay: false };
  let rastreando = false, perdidoDesde = null, recienEncontrado = false;
  const GRACIA_SIN_GIRO = 2.5, GRACIA_CON_GIRO = 10; // s
  encenderGiro();
  anchor.onTargetFound = () => { rastreando = true; perdidoDesde = null; recienEncontrado = true; onDetectado?.(true); };
  anchor.onTargetLost = () => { rastreando = false; perdidoDesde = performance.now(); onDetectado?.('perdido'); };
  anchor.onTargetUpdate = () => {
    if (!anchor.visible) return;
    ultimo.m.copy(anchor.group.matrix);
    if (giro.q) ultimo.qGiro.copy(giro.q);
    ultimo.hay = true;
  };

  const meta = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() };
  const _m = new THREE.Matrix4(), _dq = new THREE.Quaternion();
  function poseMeta() {
    if (!ultimo.hay) return false;
    if (rastreando) { ultimo.m.decompose(meta.p, meta.q, meta.s); return true; }
    if (perdidoDesde === null) return false;
    const seg = (performance.now() - perdidoDesde) / 1000;
    if (seg > (giro.activo ? GRACIA_CON_GIRO : GRACIA_SIN_GIRO)) return false;
    if (giro.activo && giro.q) {
      // el cartel no se movió; la tablet sí: se aplica al mapa el giro inverso de la tablet
      _dq.copy(giro.q).invert().multiply(ultimo.qGiro);
      _m.makeRotationFromQuaternion(_dq).multiply(ultimo.m);
      _m.decompose(meta.p, meta.q, meta.s);
    } else {
      ultimo.m.decompose(meta.p, meta.q, meta.s);
    }
    return true;
  }
  function seguir(dt) {
    const hay = poseMeta();
    if (!hay) {
      if (seguidor.visible && perdidoDesde !== null) { seguidor.visible = false; perdidoDesde = null; onDetectado?.(false); }
      return;
    }
    if (!seguidor.visible) {
      // primera vez: aparece directo en su lugar
      seguidor.position.copy(meta.p); seguidor.quaternion.copy(meta.q); seguidor.scale.copy(meta.s);
      seguidor.visible = true;
      recienEncontrado = false;
      return;
    }
    // al recuperar el cartel tras perderlo, llega deslizándose; en seguimiento normal, filtro rápido
    const distancia = seguidor.position.distanceTo(meta.p) / Math.max(1e-6, meta.s.x);
    if (recienEncontrado && distancia < 0.01) recienEncontrado = false;
    const rapidez = recienEncontrado ? 7 : 22;
    const k = 1 - Math.exp(-rapidez * dt);
    seguidor.position.lerp(meta.p, k);
    seguidor.quaternion.slerp(meta.q, k);
    seguidor.scale.lerp(meta.s, k);
    ajustarSombra();
  }
  // la cámara de sombra no hereda la escala del grupo (MindAR trabaja en unidades de píxel):
  // sus límites se escalan a mano
  let escSombra = 0;
  function ajustarSombra() {
    const s = seguidor.scale.x;
    if (Math.abs(s - escSombra) / Math.max(1e-6, s) < 0.05) return;
    escSombra = s;
    Object.assign(sol.shadow.camera, { left: -0.8 * s, right: 0.8 * s, top: 0.8 * s, bottom: -0.8 * s, near: 0.05 * s, far: 3 * s });
    sol.shadow.camera.updateProjectionMatrix();
  }

  // --- luz del cuarto: brillo promedio del video cada medio segundo ---
  const muestra = document.createElement('canvas');
  muestra.width = muestra.height = 12;
  const mctx = muestra.getContext('2d', { willReadFrequently: true });
  let acumLuz = 0, brillo = 1;
  function medirLuz(dt) {
    acumLuz += dt;
    if (acumLuz < 0.5) return;
    acumLuz = 0;
    const video = contenedor.querySelector('video');
    if (!video || video.readyState < 2) return;
    try {
      mctx.drawImage(video, 0, 0, 12, 12);
      const d = mctx.getImageData(0, 0, 12, 12).data;
      let L = 0, R = 0, B = 0;
      for (let i = 0; i < d.length; i += 4) { L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; R += d[i]; B += d[i + 2]; }
      const n = d.length / 4;
      L /= n * 255;
      // 0.45 es un cuarto bien iluminado; en penumbra el mapa también se apaga (sin quedar negro)
      brillo = THREE.MathUtils.clamp(0.45 + (L / 0.45) * 0.6, 0.5, 1.35);
      // tinte: luz más cálida si el cuarto es amarillento, más fría si es azulado
      const tinte = THREE.MathUtils.clamp((R - B) / (n * 255) * 2, -0.25, 0.25);
      sol.color.setRGB(1, 0.94 + tinte * 0.1, 0.85 - tinte * 0.3);
    } catch (_) { /* video aún sin cuadros */ }
  }
  function aplicarLuz(dt) {
    const k = 1 - Math.exp(-2 * dt);
    cielo.intensity += (1.15 * brillo - cielo.intensity) * k;
    sol.intensity += (1.9 * brillo - sol.intensity) * k;
  }

  // --- calidad automática en AR (cámara + rastreo + 3D a la vez) ---
  const calidad = { nivel: 0, muestras: [] };
  function vigilar(dtReal) {
    if (calidad.nivel >= 2 || dtReal > 0.25 || document.hidden) return;
    calidad.muestras.push(dtReal);
    if (calidad.muestras.length < 90) return;
    const orden = calidad.muestras.sort((a, b) => a - b);
    const mediana = orden[orden.length >> 1];
    calidad.muestras = [];
    if (mediana <= 1 / 26) return;
    calidad.nivel++;
    if (calidad.nivel === 1) {
      renderer.setPixelRatio(1);
      sol.shadow.mapSize.set(512, 512);
      sol.shadow.map?.dispose(); sol.shadow.map = null;
    } else {
      renderer.shadowMap.enabled = false;
      atrapaSombra.visible = false;
      grano.visible = false;
      scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    }
    const r = renderer.domElement;
    renderer.setSize(r.clientWidth, r.clientHeight, false);
    console.info('Calidad AR ajustada al nivel', calidad.nivel);
  }

  const restaurar = () => {
    seguidor.remove(mapa.root);
    padreOriginal?.add(mapa.root);
    mapa.root.position.copy(transformOriginal.pos);
    mapa.root.rotation.copy(transformOriginal.rot);
    mapa.root.scale.copy(transformOriginal.esc);
    mapa.papel.visible = true;
    apagarGiro();
  };
  try {
    await mindar.start();
  } catch (e) {
    restaurar();
    try { mindar.stop(); } catch (_) {}
    renderer.dispose();
    contenedor.innerHTML = '';
    const nombre = e?.name || '';
    throw new Error(
      nombre === 'NotAllowedError' ? 'Diste «no permitir» a la cámara. Actívala en los permisos del sitio.'
        : nombre === 'NotFoundError' || !e ? 'No se encontró una cámara en este dispositivo.'
          : e.message || String(e),
    );
  }

  // --- gestos sobre el mapa: pellizcar (acercar), girar con dos dedos, doble toque (reiniciar) ---
  const dedos = new Map();
  let gesto = null;
  const plano = new THREE.Plane(), rayo = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function puntoEnMapa(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camera);
    seguidor.updateMatrixWorld();
    plano.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).transformDirection(seguidor.matrixWorld), new THREE.Vector3().setFromMatrixPosition(seguidor.matrixWorld));
    const p = rayo.ray.intersectPlane(plano, new THREE.Vector3());
    return p ? seguidor.worldToLocal(p) : null; // en coordenadas del cartel
  }
  const medio = () => { const [a, b] = [...dedos.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
  function iniciarGesto() {
    const m = medio();
    gesto = { d0: m.d, ang0: m.ang, esc0: mapa.root.scale.x, rot0: mapa.root.rotation.z, pos0: mapa.root.position.clone(), pivote: puntoEnMapa(m.x, m.y) };
  }
  function moverGesto() {
    if (!gesto?.pivote) return;
    const m = medio();
    const esc = THREE.MathUtils.clamp(gesto.esc0 * (m.d / Math.max(1, gesto.d0)), 0.6, 4);
    const rot = gesto.rot0 - (m.ang - gesto.ang0);
    // el punto bajo los dedos se queda bajo los dedos: pos = pivote + R·S·(pos0 − pivote)/(R0·S0)
    const v = gesto.pos0.clone().sub(gesto.pivote).multiplyScalar(esc / gesto.esc0).applyAxisAngle(_zee, rot - gesto.rot0);
    mapa.root.position.copy(gesto.pivote).add(v);
    mapa.root.scale.setScalar(esc);
    mapa.root.rotation.z = rot;
  }
  let ultimoToque = 0;
  const el = contenedor;
  let gestoActivo = false; // desde que bajan dos dedos hasta que se levanta el último
  const alBajar = (e) => {
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2) { iniciarGesto(); gestoActivo = true; }
  };
  const alMover = (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2) moverGesto();
  };
  const alSubir = (e) => {
    dedos.delete(e.pointerId);
    if (dedos.size < 2) gesto = null;
    if (gestoActivo) {
      // ningún dedo de un pellizco cuenta como toque
      e.stopImmediatePropagation();
      if (dedos.size === 0) { gestoActivo = false; ultimoToque = 0; }
      return;
    }
    const ahora = performance.now();
    if (ahora - ultimoToque < 300) { e.stopImmediatePropagation(); reiniciarVista(); ultimoToque = 0; return; }
    ultimoToque = ahora;
  };
  el.addEventListener('pointerdown', alBajar);
  el.addEventListener('pointermove', alMover);
  el.addEventListener('pointerup', alSubir, true);
  el.addEventListener('pointercancel', (e) => { dedos.delete(e.pointerId); gesto = null; if (!dedos.size) gestoActivo = false; });
  el.style.touchAction = 'none';
  function reiniciarVista() {
    mapa.root.position.set(0, 0, 0);
    mapa.root.rotation.set(0, 0, 0);
    mapa.root.scale.set(1, 1, 1);
  }

  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dtReal = reloj.getDelta();
    const dt = Math.min(0.05, dtReal);
    vigilar(dtReal);
    seguir(dt);
    medirLuz(dt);
    aplicarLuz(dt);
    grano.material.uniforms.t.value = (grano.material.uniforms.t.value + 1.7) % 1000;
    onFrame?.(dt);
    renderer.render(scene, camera);
  });

  // --- foto: video + mapa + sello, en una sola imagen ---
  async function foto() {
    const video = contenedor.querySelector('video');
    const lienzo = renderer.domElement;
    const rc = contenedor.getBoundingClientRect();
    const W = Math.round(rc.width), H = Math.round(rc.height);
    const esc = Math.min(2, 1600 / Math.max(W, H)) * (devicePixelRatio > 1 ? 1 : 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * esc); cv.height = Math.round(H * esc);
    const c = cv.getContext('2d');
    c.scale(esc, esc);
    const dibujar = (elem) => { const r = elem.getBoundingClientRect(); c.drawImage(elem, r.left - rc.left, r.top - rc.top, r.width, r.height); };
    if (video) dibujar(video);
    renderer.render(scene, camera); // en el mismo instante: el búfer aún tiene el cuadro
    dibujar(lienzo);
    // sello de la marca
    const sello = new Image();
    sello.src = 'assets/marca/sello.svg';
    try { await sello.decode(); } catch (_) {}
    const t = Math.max(54, W * 0.09);
    c.font = `${Math.round(t * 0.2)}px "DM Mono", monospace`;
    const anchoTexto = Math.max(c.measureText('UN PAÍS QUE SE MUEVE').width, t * 0.42 * 5.2);
    c.fillStyle = 'rgba(251,247,238,0.92)';
    c.beginPath(); c.roundRect(14, H - t - 30, t + 30 + anchoTexto + 18, t + 16, 14); c.fill();
    if (sello.naturalWidth) c.drawImage(sello, 22, H - t - 22, t, t);
    c.fillStyle = '#1b1a17';
    c.font = `${Math.round(t * 0.42)}px "Instrument Serif", Georgia, serif`;
    c.textBaseline = 'middle';
    c.fillText('México Vivo', 30 + t, H - t / 2 - 26);
    c.font = `${Math.round(t * 0.2)}px "DM Mono", monospace`;
    c.fillStyle = '#b3261e';
    c.fillText('UN PAÍS QUE SE MUEVE', 30 + t, H - t / 2 - 4);
    return new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.9));
  }

  return {
    camera,
    renderer,
    lienzo: renderer.domElement,
    foto,
    reiniciarVista,
    async detener() {
      renderer.setAnimationLoop(null);
      mindar.stop();
      el.removeEventListener('pointerdown', alBajar);
      el.removeEventListener('pointermove', alMover);
      el.removeEventListener('pointerup', alSubir, true);
      restaurar();
      atrapaSombra.geometry.dispose(); atrapaSombra.material.dispose();
      grano.geometry.dispose(); grano.material.dispose();
      sol.shadow.map?.dispose();
      renderer.dispose();
      contenedor.innerHTML = '';
    },
  };
}
