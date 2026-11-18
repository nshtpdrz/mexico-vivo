// Realidad aumentada con MindAR (seguimiento de imagen).
// La cámara reconoce el mapa impreso y el mapa 3D aparece "pegado" al papel.
import * as THREE from 'three';
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

export async function iniciarAR({ contenedor, mapa, onEstado, onDetectado, onFrame }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Este navegador no permite usar la cámara. Abre la página con https:// o desde localhost.');
  }
  const src = await obtenerTargets(onEstado);
  onEstado?.('Abriendo la cámara…', 1);
  const { MindARThree } = await import('../vendor/mindar/mindar-image-three.prod.js');
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
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(0.5, 1, 2);
  scene.add(sol);

  const anchor = mindar.addAnchor(0);
  const padreOriginal = mapa.root.parent;
  const transformOriginal = {
    pos: mapa.root.position.clone(), rot: mapa.root.rotation.clone(), esc: mapa.root.scale.clone(),
  };
  mapa.root.position.set(0, 0, 0);
  mapa.root.rotation.set(0, 0, 0);
  mapa.root.scale.set(1, 1, 1);
  anchor.group.add(mapa.root);
  mapa.papel.visible = false;
  // Recuperación: si el seguimiento se pierde (mano, reflejo), el mapa se queda
  // congelado en su última posición unos segundos en lugar de desaparecer.
  const GRACIA = 2.5; // s
  let encontrado = false, perdidoDesde = null;
  anchor.onTargetFound = () => { encontrado = true; perdidoDesde = null; onDetectado?.(true); };
  anchor.onTargetLost = () => { perdidoDesde = performance.now(); onDetectado?.('perdido'); };

  const restaurar = () => {
    anchor.group.remove(mapa.root);
    padreOriginal?.add(mapa.root);
    mapa.root.position.copy(transformOriginal.pos);
    mapa.root.rotation.copy(transformOriginal.rot);
    mapa.root.scale.copy(transformOriginal.esc);
    mapa.papel.visible = true;
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
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, reloj.getDelta());
    if (encontrado && perdidoDesde !== null) {
      if ((performance.now() - perdidoDesde) / 1000 < GRACIA) anchor.group.visible = true;
      else { encontrado = false; perdidoDesde = null; onDetectado?.(false); }
    }
    onFrame?.(dt);
    renderer.render(scene, camera);
  });

  return {
    camera,
    renderer,
    lienzo: renderer.domElement,
    async detener() {
      renderer.setAnimationLoop(null);
      mindar.stop();
      anchor.group.remove(mapa.root);
      padreOriginal?.add(mapa.root);
      mapa.root.position.copy(transformOriginal.pos);
      mapa.root.rotation.copy(transformOriginal.rot);
      mapa.root.scale.copy(transformOriginal.esc);
      mapa.papel.visible = true;
      renderer.dispose();
      contenedor.innerHTML = '';
    },
  };
}
