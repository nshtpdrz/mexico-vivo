// Modelos 3D de las especies: forma real (modelos escaneados o modelados de Sketchfab con licencia
// CC0 / CC BY; créditos en mexico-vivo-diseno/CREDITOS-modelos.md) y tamaño real en el visor.
//  · En el mapa: cada especie aparece como su modelo, todos al mismo tamaño de ícono (a escala del país
//    un ajolote y una ballena serían invisibles), apoyado sobre el estado.
//  · En el visor «Ver a tamaño real»: el modelo en metros, junto a una persona de 1.60 m (o una mano,
//    para las especies chicas), para comparar tamaños de verdad.
// Si un modelo no existe todavía, se usa la pegatina de siempre. El cactus se construye aquí mismo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// tamaño real (m) de la dimensión más larga del animal adulto, y si se compara con persona o con mano
export const TAMANO_REAL = {
  ajolote: [0.25, 'mano'], vaquita: [1.4, 'persona'], monarca: [0.1, 'mano'], jaguar: [2.1, 'persona'],
  quetzal: [0.9, 'persona'], guacamaya: [0.85, 'persona'], 'tiburon-ballena': [12, 'persona'], lobo: [1.5, 'persona'],
  teporingo: [0.3, 'mano'], tortuga: [0.7, 'persona'], perrito: [0.4, 'mano'], berrendo: [1.4, 'persona'],
  cactus: [6, 'persona'], flamenco: [1.3, 'persona'], manati: [3.3, 'persona'], mono: [1.2, 'persona'],
  tucan: [0.5, 'mano'], ballena: [14, 'persona'],
};

const cargador = new GLTFLoader();
cargador.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
// lista de modelos disponibles (la escribe optimizar-especies.cjs): una sola consulta, sin intentos fallidos
let disponibles = null;
const listaDisponibles = () => (disponibles ??= fetch('assets/modelos/especies/disponibles.json').then((r) => (r.ok ? r.json() : [])).catch(() => []));

// cactus viejito (Cephalocereus senilis): columna con costillas, cubierta de pelo blanco
function cactus() {
  const g = new THREE.Group();
  const costillas = 22, alto = 1, radio = 0.075;
  const geo = new THREE.CylinderGeometry(radio, radio * 1.04, alto, costillas * 4, 40, false);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    const tope = y > alto / 2 - 0.06 ? Math.cos(((y - (alto / 2 - 0.06)) / 0.06) * Math.PI / 2) : 1; // punta redondeada
    const k = (1 + 0.12 * Math.abs(Math.cos((a * costillas) / 2))) * tope;
    p.setXYZ(i, (x / (r || 1)) * radio * k, y, (z / (r || 1)) * radio * k);
  }
  geo.translate(0, alto / 2, 0);
  geo.computeVertexNormals();
  const tallo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5f7f4f, roughness: 0.8 }));
  g.add(tallo);
  // pelo blanco: miles de cerdas finas (líneas) que cuelgan de las aréolas
  const pos = [], rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 2600; i++) {
    const y = 0.05 + rnd() * 0.93, a = rnd() * Math.PI * 2, r = radio * 1.1;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const l = 0.03 + rnd() * 0.05;
    pos.push(x0, y, z0, x0 * 1.15 + (rnd() - 0.5) * 0.01, y - l, z0 * 1.15 + (rnd() - 0.5) * 0.01);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: 0xf4f1ea, transparent: true, opacity: 0.85 })));
  // flores rosadas en la punta (cefalio)
  for (let k = 0; k < 5; k++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9799a, roughness: 0.6 }));
    const a = k * 1.3; f.position.set(Math.cos(a) * radio * 0.9, alto - 0.04 - k * 0.02, Math.sin(a) * radio * 0.9); g.add(f);
  }
  return g;
}

// Ajolote de Xochimilco (Ambystoma mexicanum), con su coloración silvestre (pardo oliva oscuro con
// motas; la forma rosada es la de acuario). Larva que nunca pierde sus rasgos (neotenia): tres pares
// de branquias externas plumosas, aleta dorsal continua desde la nuca hasta la cola, cola aplanada,
// cabeza ancha y patas cortas (4 dedos adelante, 5 atrás). Largo = 1, apoyado en y = 0, mirando a +x.
function ajolote() {
  const g = new THREE.Group();
  const piel = new THREE.MeshStandardMaterial({ color: 0x4f4c3c, roughness: 0.45, metalness: 0.05 });
  const vientre = new THREE.MeshStandardMaterial({ color: 0x77705a, roughness: 0.5 });
  const branquia = new THREE.MeshStandardMaterial({ color: 0x6e3f4c, roughness: 0.55 });
  const aleta = new THREE.MeshStandardMaterial({ color: 0x6b6650, roughness: 0.5, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const ojo = new THREE.MeshStandardMaterial({ color: 0x0d0c0a, roughness: 0.2 });
  const esf = (mat, r, x, y, z, sx, sy, sz, seg = 20) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  const y0 = 0.075; // altura del eje del cuerpo
  // tronco con pliegues costales (surcos verticales), vientre más claro, cabeza ancha y aplanada
  const tronco = new THREE.SphereGeometry(1, 40, 24);
  const p = tronco.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) * (1 - 0.04 * Math.max(0, Math.cos(x * 40)))); }
  tronco.computeVertexNormals();
  const cuerpo = new THREE.Mesh(tronco, piel); cuerpo.position.set(0.02, y0, 0); cuerpo.scale.set(0.24, 0.07, 0.075); g.add(cuerpo);
  esf(vientre, 1, 0.02, y0 - 0.025, 0, 0.22, 0.045, 0.065);
  esf(piel, 1, 0.31, y0 + 0.005, 0, 0.11, 0.06, 0.1, 28); // cabeza
  esf(piel, 1, 0.38, y0 - 0.002, 0, 0.06, 0.045, 0.085, 20); // hocico redondeado
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 6, 20, Math.PI * 0.8), ojo);
  boca.rotation.set(Math.PI / 2, 0, Math.PI * 0.6); boca.position.set(0.37, y0 - 0.02, 0); g.add(boca);
  for (const s of [-1, 1]) esf(ojo, 0.012, 0.36, y0 + 0.035, s * 0.055, 1, 1, 1, 12);
  // cola: aplanada a los lados, se adelgaza hasta la punta
  esf(piel, 1, -0.27, y0 + 0.004, 0, 0.25, 0.058, 0.045, 24);
  // aleta dorsal continua (nuca → punta de la cola) y aleta ventral de la cola
  const fa = new THREE.Shape();
  fa.moveTo(0.2, 0); fa.quadraticCurveTo(0.0, 0.03, -0.2, 0.06); fa.quadraticCurveTo(-0.45, 0.07, -0.55, 0.0); fa.lineTo(0.2, 0);
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(fa, 16), aleta); dorsal.position.set(0, y0 + 0.04, 0); g.add(dorsal);
  const fv = new THREE.Shape(); fv.moveTo(-0.12, 0); fv.quadraticCurveTo(-0.35, -0.045, -0.55, 0.0); fv.lineTo(-0.12, 0);
  const ventral = new THREE.Mesh(new THREE.ShapeGeometry(fv, 12), aleta); ventral.position.set(0, y0 - 0.03, 0); g.add(ventral);
  // tres pares de branquias externas: tallo curvo hacia atrás con filamentos a lo largo
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const base = new THREE.Vector3(0.25, y0 + 0.03 - k * 0.022, s * 0.085);
    const dir = new THREE.Vector3(-0.75, 0.55 - k * 0.35, s * 0.45).normalize();
    const largo = 0.11 - k * 0.012;
    const curva = new THREE.QuadraticBezierCurve3(base, base.clone().addScaledVector(dir, largo * 0.6).add(new THREE.Vector3(0, 0.02, 0)), base.clone().addScaledVector(dir, largo));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 10, 0.006, 6), branquia));
    for (let f = 1; f <= 9; f++) {
      const t = f / 10, q = curva.getPoint(t);
      for (const lado of [-1, 1]) {
        const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.03 * (1 - t * 0.5), 4), branquia);
        fil.position.copy(q); fil.position.y += lado * 0.008;
        fil.rotation.set(lado * 0.9, 0, s * 0.4);
        g.add(fil);
      }
    }
  }
  // patas cortas con dedos
  const pata = (x, s, dedos) => {
    const hombro = new THREE.Vector3(x, y0 - 0.02, s * 0.06), pie = new THREE.Vector3(x + 0.02, 0.006, s * 0.13);
    const c = new THREE.QuadraticBezierCurve3(hombro, new THREE.Vector3(x, 0.05, s * 0.11), pie);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 8, 0.015, 8), piel));
    for (let d = 0; d < dedos; d++) {
      const a = ((d - (dedos - 1) / 2) / dedos) * 1.6;
      const dedo = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.025, 5), piel);
      dedo.position.set(pie.x + Math.cos(a) * 0.013, 0.004, pie.z + s * Math.abs(Math.sin(a)) * 0.006 + Math.sin(a) * 0.012);
      dedo.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2);
      g.add(dedo);
    }
  };
  for (const s of [-1, 1]) { pata(0.17, s, 4); pata(-0.12, s, 5); }
  // motas claras de la piel silvestre
  const rnd = (() => { let v = 11; return () => ((v = (v * 16807) % 2147483647) / 2147483647); })();
  const mota = new THREE.MeshStandardMaterial({ color: 0x8c8a6a, roughness: 0.5 });
  for (let i = 0; i < 40; i++) {
    const x = -0.4 + rnd() * 0.75, a = rnd() * Math.PI;
    const rx = x > 0.2 ? 0.11 : x < -0.18 ? 0.2 : 0.24, cx = x > 0.2 ? 0.31 : x < -0.18 ? -0.3 : 0.02;
    const ry = x > 0.2 ? 0.06 : x < -0.18 ? 0.055 : 0.07, rz = x > 0.2 ? 0.1 : x < -0.18 ? 0.04 : 0.075;
    const u = (x - cx) / rx; if (Math.abs(u) > 0.95) continue;
    const k = Math.sqrt(1 - u * u);
    esf(mota, 0.006, x, y0 + Math.sin(a) * ry * k * 1.01, Math.cos(a) * rz * k * 1.01, 1, 0.4, 1, 6);
  }
  // ~190 piezas (filamentos, motas, dedos) fusionadas por material: 6 llamadas de dibujo en vez de ~190
  const porMat = new Map();
  g.updateMatrixWorld(true);
  for (const o of g.children) {
    if (!o.isMesh) continue;
    let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    geo = geo.index ? geo.toNonIndexed() : geo;
    for (const at of Object.keys(geo.attributes)) if (at !== 'position' && at !== 'normal') geo.deleteAttribute(at);
    if (!porMat.has(o.material)) porMat.set(o.material, []);
    porMat.get(o.material).push(geo);
  }
  const final = new THREE.Group();
  for (const [mat, geos] of porMat) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.castShadow = true; m.receiveShadow = true;
    final.add(m);
  }
  return final;
}

// Devuelve el modelo normalizado: centrado en x/z, apoyado en y = 0 y con su dimensión mayor = 1.
// null si no existe el archivo.
// ligero = true: versión para el mapa (~3 000 triángulos y texturas de 256 px, carpeta mapa/,
// generada con mexico-vivo-diseno/especies-mapa.cjs); si no existe, se usa la completa.
export function cargarModelo(clave, ligero = false) {
  const id = ligero ? clave + '|mapa' : clave;
  if (!cache.has(id)) {
    cache.set(id, (async () => {
      if (clave === 'cactus') return cactus();
      if (clave === 'ajolote') return ajolote();
      try {
        if (!(await listaDisponibles()).includes(clave)) return null;
        const url = `assets/modelos/especies/${clave}.glb`;
        const gltf = ligero
          ? await cargador.loadAsync(`assets/modelos/especies/mapa/${clave}.glb`).catch(() => cargador.loadAsync(url))
          : await cargador.loadAsync(url);
        const m = gltf.scene;
        // las versiones ligeras vienen sin normales (se quitaron para poder simplificar): se calculan suaves
        m.traverse((o) => {
          if (o.isMesh && !o.geometry.attributes.normal) {
            o.geometry.computeVertexNormals();
            for (const mat of [].concat(o.material)) { mat.flatShading = false; mat.needsUpdate = true; }
          }
        });
        // modelos animados: se mide (y se muestra en el mapa) con la primera pose de su animación,
        // porque muchos traen la malla en «pose de enlace» a otra escala
        if (gltf.animations.length) {
          const mx = new THREE.AnimationMixer(m);
          mx.clipAction(gltf.animations[0]).play();
          mx.update(0.01);
        }
        m.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(m, true); // preciso: respeta huesos y escalas de modelos animados
        const tam = caja.getSize(new THREE.Vector3()), centro = caja.getCenter(new THREE.Vector3());
        const mayor = Math.max(tam.x, tam.y, tam.z) || 1;
        const raiz = new THREE.Group();
        m.position.sub(new THREE.Vector3(centro.x, caja.min.y, centro.z));
        raiz.add(m);
        raiz.scale.setScalar(1 / mayor);
        raiz.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        raiz.userData.animaciones = gltf.animations;
        return raiz;
      } catch (e) { console.warn('Modelo no disponible', clave, e); return null; }
    })());
  }
  return cache.get(id).then((m) => (m ? clonar(m) : null));
}
// los modelos con esqueleto se clonan con SkeletonUtils (un clon simple seguiría usando los huesos del original)
function clonar(m) { const c = SkeletonUtils.clone(m); c.userData = m.userData; return c; }

// silueta de persona de 1.60 m o de mano (≈ 18 cm), en tinta sobre papel, como referencia de tamaño
function referencia(tipo) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const c = cv.getContext('2d');
  c.fillStyle = '#1b1a17';
  if (tipo === 'persona') {
    c.beginPath(); c.arc(128, 52, 34, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.roundRect(84, 92, 88, 190, 30); c.fill();
    c.fillRect(92, 260, 30, 240); c.fillRect(134, 260, 30, 240);
    c.beginPath(); c.roundRect(58, 100, 24, 160, 12); c.roundRect(174, 100, 24, 160, 12); c.fill();
  } else {
    c.beginPath(); c.roundRect(70, 230, 120, 270, 40); c.fill();
    [[70, 120, 24, 150], [100, 60, 24, 200], [130, 50, 24, 210], [160, 80, 24, 180]].forEach(([x, y, w, h]) => { c.beginPath(); c.roundRect(x, y, w, h, 12); c.fill(); });
    c.beginPath(); c.roundRect(20, 250, 24, 140, 12); c.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const alto = tipo === 'persona' ? 1.6 : 0.19;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(alto / 2, alto), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.78, side: THREE.DoubleSide }));
  s.position.y = alto / 2;
  s.userData.alto = alto;
  return s;
}

let visor = null;
export function cerrarEspecie() {
  if (!visor) return;
  visor.renderer.setAnimationLoop(null);
  visor.ro.disconnect(); visor.ctl.dispose(); visor.renderer.dispose();
  visor.cont.remove(); visor = null;
}
export async function abrirEspecie(especie) {
  cerrarEspecie();
  const [real, refTipo] = TAMANO_REAL[especie.icono] || [1, 'persona'];
  const cont = document.createElement('div');
  cont.className = 'volcan-vista especie-vista';
  cont.innerHTML = `<div class="vv-barra"><div><p class="sub">Tamaño real · modelo 3D</p><h2>${especie.nombre}</h2></div><button class="cerrar" aria-label="Cerrar">×</button></div>
    <div class="vv-lienzo"></div>
    <div class="vv-panel"><p class="cuerpo"><i>${especie.cientifico}</i></p>
      <p class="dato">Mide unos <b>${real >= 1 ? real.toLocaleString('es-MX') + ' m' : Math.round(real * 100) + ' cm'}</b>. A su lado: ${refTipo === 'persona' ? 'una persona de 1.60 m' : 'una mano de unos 19 cm'}.</p>
      <p class="nota" id="ev-estado">Cargando modelo…</p></div>`;
  document.body.appendChild(cont);
  cont.querySelector('.cerrar').onclick = cerrarEspecie;
  const lienzo = cont.querySelector('.vv-lienzo');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0xefe6d4);
  lienzo.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xfff1da, 0x6e5c48, 1.2));
  const sol = new THREE.DirectionalLight(0xfff0d8, 2.2); sol.position.set(-2, 4, 3); sol.castShadow = true; escena.add(sol);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.ShadowMaterial({ opacity: 0.25 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; escena.add(piso);
  // rejilla de 1 m (o 10 cm para especies chicas) para leer el tamaño
  const paso = refTipo === 'mano' ? 0.1 : 1;
  const rej = new THREE.GridHelper(paso * 40, 40, 0xb7a98c, 0xd8ccb3); escena.add(rej);
  const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
  const ctl = new OrbitControls(camara, renderer.domElement); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.49;
  const modelo = await cargarModelo(especie.icono);
  if (!cont.isConnected) return;
  const est = cont.querySelector('#ev-estado');
  if (modelo) {
    modelo.scale.multiplyScalar(real);
    escena.add(modelo);
    const ref = referencia(refTipo);
    ref.position.x = -(real * 0.5 + ref.userData.alto * 0.4);
    escena.add(ref);
    est.textContent = 'Arrastra para girar · pellizca para acercar.';
    let mixer = null;
    if (modelo.userData.animaciones?.length) { mixer = new THREE.AnimationMixer(modelo); mixer.clipAction(modelo.userData.animaciones[0]).play(); }
    // encuadre con el tamaño de verdad del modelo y de la referencia
    const caja = new THREE.Box3().setFromObject(modelo, true).union(new THREE.Box3().setFromObject(ref));
    const tam = caja.getSize(new THREE.Vector3()), centro = caja.getCenter(new THREE.Vector3());
    const fov = (camara.fov * Math.PI) / 180;
    const dist = (Math.max(tam.y, tam.x / Math.max(0.6, camara.aspect || 1.5)) / 2) / Math.tan(fov / 2) * 1.35;
    ctl.target.copy(centro);
    camara.position.set(centro.x + dist * 0.35, centro.y + dist * 0.25, centro.z + dist);
    visor && (visor.mixer = mixer);
    cont.mixer = mixer;
  } else {
    est.textContent = 'Este modelo todavía no está disponible.';
    camara.position.set(1, 1.2, 3);
  }
  const reloj = new THREE.Clock();
  const ajustar = () => { const w = lienzo.clientWidth, h = lienzo.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); };
  const ro = new ResizeObserver(ajustar); ro.observe(lienzo); ajustar();
  renderer.setAnimationLoop(() => { const dt = reloj.getDelta(); cont.mixer?.update(dt); ctl.update(); renderer.render(escena, camara); });
  visor = { cont, renderer, ro, ctl };
}
