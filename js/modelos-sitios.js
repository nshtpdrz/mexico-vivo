// Maquetas 3D de los sitios de Historia y de las Maravillas, una por lugar y fieles a su
// arquitectura real (número de cuerpos, escalinatas, templos, arcos, orientación).
//
// Cómo se construyen
//  · Cada maqueta se arma en un marco local con «arriba» = +y, el frente hacia +z y una huella de
//    ~1 × 1. Las proporciones (alto / ancho) son las reales salvo donde se indica.
//  · Orientación: `A` es el azimut (grados desde el norte) hacia donde mira la fachada principal.
//    Solo se pone cuando está bien documentado; si no, la fachada mira al sur (hacia quien ve el mapa).
//  · Todas las piezas de un mismo material se fusionan en una sola malla: cada maqueta cuesta
//    3–8 llamadas de dibujo en lugar de decenas (rendimiento en la tablet del stand).
//  · Las obras muy largas (acueductos) se muestran como un tramo, con sus proporciones reales;
//    las piezas diminutas junto a obras enormes (cabeza olmeca) se agrandan y se dice en el código.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materialAtlas } from './mapa3d.js';
import { cargarDEM, muestrear } from './relieve-mapa.js';

// Piedra, tierra y vegetación usan el material «Atlas» del mapa (el mismo de volcanes y montañas:
// rayado a mano en las caras en sombra, grano de papel). Agua, metal, vidrio y azulejo, el estándar.
const A = (color) => materialAtlas({ vertexColors: false, color, rayado: 90, fuerza: 0.34, luzRef: 1 });
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
let MAT = null;
const crearMateriales = () => ({
  caliza: A(0xd5c8a8), calizaOsc: A(0xb3a484),
  tezontle: A(0x958977), tezontleOsc: A(0x776e62),
  rojo: M(0xa8432f, { roughness: 0.7 }), azul: M(0x3f7fb0, { roughness: 0.6 }), blanco: M(0xefe9dc, { roughness: 0.7 }),
  basalto: A(0x5f5a54), adobe: A(0xbd8d60), adobeOsc: A(0x97693f),
  rosa: A(0xd49a84), rosaOsc: A(0xb37865),
  gris: A(0xaba59b), grisOsc: A(0x837d74),
  teja: M(0xa4472f, { roughness: 0.7 }), techoRojo: M(0xb23a2a, { roughness: 0.55, metalness: 0.2 }),
  azulejo: M(0x2f6fb5, { roughness: 0.35, metalness: 0.1 }), azulejoAm: M(0xd9a52b, { roughness: 0.35, metalness: 0.1 }),
  oro: M(0xd8a62a, { roughness: 0.4, metalness: 0.5 }), hueco: M(0x2a2420, { roughness: 1 }),
  ladrillo: A(0x9a5038), madera: A(0x6b4a2e), hierro: M(0x3d3d40, { roughness: 0.6, metalness: 0.4 }),
  vidrio: M(0x86a9b8, { roughness: 0.2, metalness: 0.3 }),
  lamina: M(0xc9ccd0, { roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }),
  selva: A(0x3f7a3a), selvaOsc: A(0x2b5a2c), pasto: A(0x7c8f4f), oyamel: A(0x2f4d33),
  cactus: A(0x6f8f56), cactusOsc: A(0x557249),
  agua: M(0x2f86b4, { roughness: 0.15, metalness: 0.1 }), aguaClara: M(0x45aecb, { roughness: 0.15 }), espuma: M(0xe8f4f6),
  arena: A(0xd9c08a), lava: A(0x3a3532), tierraRoja: A(0xa5583a), tierra: A(0x9c7a55), roca: A(0x8a8378), rocaOsc: A(0x6a645c),
  ballena: M(0x6d7680, { roughness: 0.5 }), monarca: M(0xe2782a, { roughness: 0.6 }), raiz: A(0x5a4632),
});

// azimut (0 = norte, 90 = este) -> giro del frente (+z) en el marco local (norte = −z, este = +x)
const giro = (A) => Math.atan2(Math.sin((A * Math.PI) / 180), -Math.cos((A * Math.PI) / 180));
const azar = (semilla) => { let s = semilla; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

class Kit {
  constructor() { this.p = new Map(); this.extra = []; }
  add(mat, geo, x = 0, y = 0, z = 0, ry = 0) {
    geo.translate(x, y, z);
    if (ry) geo.rotateY(ry);
    if (!this.p.has(mat)) this.p.set(mat, []);
    this.p.get(mat).push(geo);
    return this;
  }
  box(mat, w, h, d, x = 0, y = 0, z = 0, ry = 0) { return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry); }
  // tronco de pirámide rectangular (talud): base wb × db, cima wt × dt
  talud(mat, wb, db, wt, dt, h, x = 0, y = 0, z = 0, ry = 0) {
    const g = new THREE.BoxGeometry(wb, h, db);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, (p.getX(i) * wt) / wb); p.setZ(i, (p.getZ(i) * dt) / db); }
    g.computeVertexNormals();
    return this.add(mat, g, x, y + h / 2, z, ry);
  }
  cil(mat, rt, rb, h, x = 0, y = 0, z = 0, seg = 16, sx = 1, sz = 1, ry = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.scale(sx, 1, sz);
    return this.add(mat, g, x, y + h / 2, z, ry);
  }
  esfera(mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 10, ry = 0) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.6)));
    g.scale(sx, sy, sz);
    return this.add(mat, g, x, y, z, ry);
  }
  cupula(mat, r, x = 0, y = 0, z = 0, seg = 16, sy = 1) {
    const g = new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, sy, 1);
    return this.add(mat, g, x, y, z);
  }
  cono(mat, r, h, x = 0, y = 0, z = 0, seg = 12) { return this.add(mat, new THREE.ConeGeometry(r, h, seg), x, y + h / 2, z); }
  // escalinata maciza: sube del frente (zFrente, y0) a (zArriba, y0 + alto)
  escalera(mat, w, y0, alto, zFrente, zArriba, n, x = 0, ry = 0) {
    const dz = (zFrente - zArriba) / n;
    for (let i = 0; i < n; i++) {
      const h = (alto * (i + 1)) / n;
      this.add(mat, new THREE.BoxGeometry(w, h, dz), x, y0 + h / 2, zFrente - dz * (i + 0.5), ry);
    }
    return this;
  }
  // alfarda (rampa lateral de la escalinata): prisma triangular
  rampa(mat, w, y0, alto, zFrente, zArriba, x = 0, ry = 0) {
    const s = new THREE.Shape([new THREE.Vector2(-zFrente, 0), new THREE.Vector2(-zArriba, 0), new THREE.Vector2(-zArriba, alto)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    return this.add(mat, g, x - w / 2, y0, 0, ry);
  }
  // escalinata con dos alfardas
  escalinata(mat, matAlf, w, y0, alto, zFrente, zArriba, n, x = 0, ry = 0) {
    this.escalera(mat, w, y0, alto, zFrente, zArriba, n, x, ry);
    const a = w * 0.16;
    for (const s of [-1, 1]) this.rampa(matAlf, a, y0, alto * 1.03, zFrente, zArriba, x + s * (w / 2 + a / 2), ry);
    return this;
  }
  forma(mat, shape, prof, x = 0, y = 0, z = 0, ry = 0) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: prof, bevelEnabled: false });
    g.translate(0, 0, -prof / 2);
    return this.add(mat, g, x, y, z, ry);
  }
  // arcada (acueducto, portal): una fila de arcos de medio punto en el plano x–y, grosor en z.
  // tramos = alturas totales de cada arco; claro = luz del arco; pilar = ancho del pilar
  arcada(mat, tramos, claro, pilar, grosor, x0 = 0, y = 0, z = 0, ry = 0, remate = 0) {
    const paso = claro + pilar;
    const L = tramos.length * paso + pilar;
    let x = x0 - L / 2;
    tramos.forEach((alto, i) => {
      const r = claro / 2, arranque = alto - r - Math.max(remate, alto * 0.06);
      const xa = x + pilar, xb = xa + claro;
      // pilar a la izquierda del arco (y el último a la derecha)
      this.box(mat, pilar, alto, grosor * 1.08, x + pilar / 2, y, z, ry);
      if (i === tramos.length - 1) this.box(mat, pilar, alto, grosor * 1.08, xb + pilar / 2, y, z, ry);
      // enjuta sobre el arco
      const s = new THREE.Shape();
      s.moveTo(xa, arranque); s.lineTo(xa, alto); s.lineTo(xb, alto); s.lineTo(xb, arranque);
      s.absarc(xa + r, arranque, r, 0, Math.PI, false);
      this.forma(mat, s, grosor, 0, y, z, ry);
      x += paso;
    });
    return L;
  }
  // árbol de selva (copa redondeada) y conífera escalonada (oyamel)
  arbol(x, z, h, r, y = 0, mat = MAT.selva) {
    this.cil(MAT.raiz, r * 0.12, r * 0.16, h * 0.55, x, y, z, 5);
    this.esfera(mat, r, x, y + h * 0.62, z, 1, 0.85, 1, 7);
    return this;
  }
  conifera(x, z, h, r, y = 0) {
    this.cil(MAT.raiz, r * 0.08, r * 0.1, h * 0.3, x, y, z, 5);
    for (let i = 0; i < 3; i++) this.cono(MAT.oyamel, r * (1 - i * 0.25), h * 0.42, x, y + h * (0.18 + i * 0.24), z, 7);
    return this;
  }
  // cactus columnar (tetecho / cardón), con brazos opcionales
  columnar(x, z, h, r, brazos = 0, y = 0, rnd = Math.random, mat = MAT.cactus) {
    this.cil(mat, r * 0.85, r, h, x, y, z, 7);
    this.esfera(mat, r * 0.85, x, y + h, z, 1, 0.7, 1, 7);
    for (let b = 0; b < brazos; b++) {
      const a = rnd() * Math.PI * 2, hb = h * (0.3 + rnd() * 0.25), lb = h * (0.35 + rnd() * 0.3);
      const dx = Math.cos(a) * r * 2.2, dz = Math.sin(a) * r * 2.2;
      this.esfera(mat, r * 0.75, x + dx * 0.5, y + hb, z + dz * 0.5, 1.6, 0.7, 1.6, 6);
      this.cil(mat, r * 0.7, r * 0.75, lb, x + dx, y + hb, z + dz, 6);
      this.esfera(mat, r * 0.7, x + dx, y + hb + lb, z + dz, 1, 0.7, 1, 6);
    }
    return this;
  }
  grupo() {
    const g = new THREE.Group();
    for (const [mat, geos] of this.p) {
      const lista = geos.map((x) => {
        const n = x.index ? x.toNonIndexed() : x;
        for (const a of Object.keys(n.attributes)) if (a !== 'position' && a !== 'normal') n.deleteAttribute(a);
        return n;
      });
      const geo = mergeGeometries(lista, false);
      geos.forEach((x) => x.dispose());
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    this.extra.forEach((o) => g.add(o));
    return g;
  }
}

// cuerpos escalonados de una pirámide: lista de [ancho, fondo, alto, talud]; devuelve la altura final
function cuerpos(k, lista, mat, matB = mat, y = 0) {
  lista.forEach(([w, d, h, t = 0.03], i) => { k.talud(i % 2 ? matB : mat, w, d, w - t, d - t, h, 0, y); y += h; });
  return y;
}
// talud-tablero: talud inclinado + tablero vertical enmarcado (Teotihuacan, Tula, Xochicalco)
function taludTablero(k, w, d, ht, hb, y, mat, matPanel) {
  k.talud(mat, w, d, w - ht * 0.5, d - ht * 0.5, ht, 0, y);
  const wt = w - ht * 0.5 + 0.02, dt = d - ht * 0.5 + 0.02;
  k.box(mat, wt, hb, dt, 0, y + ht);
  // tablero rehundido: panel oscuro dentro del marco, en las cuatro caras
  const m = hb * 0.22;
  k.box(matPanel, wt - 2 * m, hb - 2 * m, 0.006, 0, y + ht + m, dt / 2);
  k.box(matPanel, wt - 2 * m, hb - 2 * m, 0.006, 0, y + ht + m, -dt / 2);
  k.box(matPanel, 0.006, hb - 2 * m, dt - 2 * m, wt / 2, y + ht + m, 0);
  k.box(matPanel, 0.006, hb - 2 * m, dt - 2 * m, -wt / 2, y + ht + m, 0);
  return { y: y + ht + hb, w: wt, d: dt };
}
// puertas oscuras en una fachada (en z = zCara), centradas
function vanos(k, n, ancho, alto, sep, y, zCara, x0 = 0, ry = 0) {
  for (let i = 0; i < n; i++) k.box(MAT.hueco, ancho, alto, 0.008, x0 + (i - (n - 1) / 2) * sep, y, zCara, ry);
}

// Iglesia virreinal: nave, naves laterales, fachada entre torres, cúpula con linterna.
// o = { mat, matOsc, largo, ancho, altoNave, torres: [alto izq, alto der] (0 = sin torre), cupula: mat, retablo }
function iglesia(k, o) {
  const { mat, matOsc = mat, largo = 0.9, ancho = 0.42, altoNave = 0.18 } = o;
  const zF = largo / 2;
  k.box(mat, ancho, altoNave, largo, 0, 0, 0);
  k.box(matOsc, ancho * 0.42, altoNave * 0.7, largo * 0.92, -ancho * 0.71, 0, -0.01);
  k.box(matOsc, ancho * 0.42, altoNave * 0.7, largo * 0.92, ancho * 0.71, 0, -0.01);
  // bóveda de cañón sobre la nave
  const b = new THREE.CylinderGeometry(ancho / 2, ancho / 2, largo * 0.96, 12, 1, false, -Math.PI / 2, Math.PI);
  b.rotateX(Math.PI / 2); b.scale(1, 0.45, 1);
  k.add(mat, b, 0, altoNave, -0.01);
  // fachada: cuerpo central más alto con remate, portada y ventana coral
  const hF = altoNave * 1.45;
  k.box(mat, ancho, hF, 0.05, 0, 0, zF);
  k.talud(mat, ancho * 0.5, 0.05, ancho * 0.18, 0.05, hF * 0.22, 0, hF, zF);
  k.box(o.retablo || matOsc, ancho * 0.52, hF * 0.78, 0.012, 0, 0, zF + 0.028);
  k.box(MAT.hueco, ancho * 0.2, hF * 0.34, 0.01, 0, 0, zF + 0.036);
  if (o.portales === 3) for (const s of [-1, 1]) k.box(MAT.hueco, ancho * 0.11, hF * 0.26, 0.01, s * ancho * 0.36, 0, zF + 0.032); // portadas laterales
  const oc = new THREE.CylinderGeometry(o.roseton ?? 0.026, o.roseton ?? 0.026, 0.01, 16); oc.rotateX(Math.PI / 2);
  k.add(MAT.hueco, oc, 0, hF * 0.6, zF + 0.036); // ventana coral (óculo)
  // torres
  const wT = ancho * 0.46;
  (o.torres || [0.6, 0.6]).forEach((altoT, i) => {
    if (!altoT) return;
    const x = (i ? 1 : -1) * (ancho / 2 + wT / 2 - 0.01), z = zF - wT / 2 + 0.03;
    const h1 = altoT * 0.42, h2 = altoT * 0.3, h3 = altoT * 0.16;
    k.box(mat, wT, h1, wT, x, 0, z);
    k.box(matOsc, wT * 1.06, 0.012, wT * 1.06, x, h1, z);
    k.box(mat, wT * 0.84, h2, wT * 0.84, x, h1 + 0.012, z);
    // campanario: vanos de arco en las cuatro caras
    for (let c = 0; c < 4; c++) k.box(MAT.hueco, wT * 0.4, h2 * 0.55, 0.006, x + (c === 1 ? wT * 0.42 : c === 3 ? -wT * 0.42 : 0), h1 + 0.012 + h2 * 0.25, z + (c === 0 ? wT * 0.42 : c === 2 ? -wT * 0.42 : 0), 0);
    k.box(mat, wT * 0.66, h3, wT * 0.66, x, h1 + h2 + 0.012, z);
    k.cupula(o.cupulaTorre || mat, wT * 0.36, x, h1 + h2 + h3 + 0.012, z, 12, 1.2);
    k.cil(mat, 0.004, 0.006, altoT * 0.12, x, h1 + h2 + h3 + 0.012 + wT * 0.4, z, 6);
  });
  // cúpula sobre el crucero
  const zc = -largo * 0.18, rc = ancho * 0.3;
  k.cil(mat, rc, rc, altoNave * 0.45, 0, altoNave * 1.2, zc, 16);
  k.cupula(o.cupula || mat, rc, 0, altoNave * 1.65, zc, 18, 1.15);
  k.cil(mat, rc * 0.22, rc * 0.25, rc * 0.5, 0, altoNave * 1.65 + rc * 1.1, zc, 8);
  k.cupula(mat, rc * 0.24, 0, altoNave * 1.65 + rc * 1.6, zc, 8);
}

// Acueducto con sus arcos y el canal arriba
function acueducto(k, tramos, claro, pilar, grosor, mat) {
  const L = k.arcada(mat, tramos, claro, pilar, grosor);
  // terreno: valle bajo los arcos (la arcada sigue el perfil del valle)
  k.box(MAT.tierra, L + 0.08, 0.01, grosor * 6, 0, -0.01, 0);
  return L;
}

// ======================================================================
// SITIOS DE HISTORIA (id de cultura.js)
// ======================================================================
const SITIOS = {
  // Pirámide del Sol: 225 m de lado, unos 65 m de alto (0.29), cinco cuerpos en talud y escalinata
  // al poniente; la ciudad está girada 15.5° al este del norte. Frente a ella, la Calzada de los Muertos.
  teotihuacan: { A: 285.5, m: 225, f(k) {
    const top = cuerpos(k, [[1, 1, 0.075, 0.05], [0.88, 0.88, 0.068, 0.05], [0.76, 0.76, 0.06, 0.05], [0.62, 0.62, 0.048, 0.04], [0.5, 0.5, 0.039, 0.04]], MAT.tezontle, MAT.tezontleOsc);
    k.escalinata(MAT.tezontleOsc, MAT.tezontle, 0.11, 0, top, 0.66, 0.23, 26);
    k.box(MAT.tezontle, 0.24, 0.045, 0.16, -0.2, 0, 0.58); // plataforma adosada
    k.box(MAT.tezontle, 0.24, 0.045, 0.16, 0.2, 0, 0.58);
    k.box(MAT.arena, 1.9, 0.004, 0.16, 0, 0, 0.92); // Calzada de los Muertos (corre de norte a sur)
    // basamentos del otro lado de la calzada
    for (const x of [-0.75, -0.35, 0.35, 0.75]) k.talud(MAT.tezontle, 0.16, 0.1, 0.13, 0.08, 0.03, x, 0, 1.08);
  } },

  // El Castillo (Templo de Kukulcán): base de 55.3 m, nueve terrazas, cuatro escalinatas
  // (91 escalones cada una) y templo en la cima; 30 m en total. Escalinata principal al norte,
  // con cabezas de serpiente al pie; los ejes están girados ~22° al este del norte.
  chichen: { A: 22, m: 55, f(k) {
    const n = 9, H = 0.434, alto = H / n;
    for (let i = 0; i < n; i++) {
      const w = 1 - (0.65 * i) / n;
      k.talud(i % 2 ? MAT.calizaOsc : MAT.caliza, w, w, w - 0.02, w - 0.02, alto, 0, i * alto);
      // cada terraza lleva tableros rehundidos: dos por cara a cada lado de la escalinata
      for (let c = 0; c < 4; c++) for (const s of [-1, 1]) for (const f of [0.3, 0.7]) {
        const x = s * (0.1 + f * (w / 2 - 0.12));
        k.box(MAT.calizaOsc, (w / 2 - 0.14) * 0.32, alto * 0.5, 0.005, x, i * alto + alto * 0.25, w / 2 - 0.006, (c * Math.PI) / 2);
      }
    }
    for (let c = 0; c < 4; c++) k.escalinata(MAT.calizaOsc, MAT.caliza, 0.16, 0, H, 0.62, 0.17, 30, 0, (c * Math.PI) / 2);
    // cabezas de serpiente al pie de la escalinata norte
    for (const s of [-1, 1]) k.box(MAT.calizaOsc, 0.035, 0.03, 0.05, s * 0.1, 0, 0.64);
    // templo superior con tres vanos al norte y uno en cada otro lado
    k.box(MAT.caliza, 0.3, 0.1, 0.3, 0, H);
    k.box(MAT.calizaOsc, 0.32, 0.018, 0.32, 0, H + 0.1);
    vanos(k, 3, 0.05, 0.065, 0.085, H, 0.151);
    for (const s of [-1, 1]) { k.cil(MAT.caliza, 0.014, 0.014, 0.065, s * 0.043, H, 0.158, 8); k.box(MAT.calizaOsc, 0.03, 0.02, 0.04, s * 0.043, H, 0.175); } // columnas serpentinas
    for (let i = 0; i < 8; i++) for (let c = 0; c < 4; c++) k.box(MAT.caliza, 0.018, 0.016, 0.01, -0.14 + i * 0.04, H + 0.118, 0.155, (c * Math.PI) / 2); // almenas
    for (const r of [Math.PI / 2, Math.PI, -Math.PI / 2]) vanos(k, 1, 0.06, 0.065, 0, H, 0.151, 0, r);
  } },

  // Pirámide de los Nichos: seis cuerpos con nichos y cornisas voladas y el templo arriba (siete
  // cuerpos en total); 365 nichos, como el edificio (INAH), aunque su reparto por cuerpo aquí es
  // aproximado; escalinata al oriente. Unos 20 m de alto sobre 36 m de base.
  tajin: { A: 90, m: 36, f(k) {
    let y = 0;
    const anchos = [1, 0.86, 0.73, 0.61, 0.5, 0.4];
    anchos.forEach((w) => {
      k.talud(MAT.caliza, w, w, w - 0.03, w - 0.03, 0.03, 0, y);
      const wb = w - 0.03;
      k.box(MAT.caliza, wb, 0.04, wb, 0, y + 0.03);
      const n = Math.max(3, Math.round(wb * 25.75)); // densidad elegida para sumar los 365 nichos
      for (let c = 0; c < 4; c++) {
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * (wb / n);
          if (c === 0 && Math.abs(x) < 0.13) continue; // la escalinata tapa los nichos del centro
          k.box(MAT.hueco, (wb / n) * 0.55, 0.026, 0.008, x, y + 0.037, wb / 2, (c * Math.PI) / 2);
        }
      }
      k.box(MAT.calizaOsc, wb + 0.035, 0.009, wb + 0.035, 0, y + 0.07); // cornisa volada
      y += 0.079;
    });
    k.box(MAT.caliza, 0.28, 0.06, 0.28, 0, y);
    vanos(k, 1, 0.07, 0.045, 0, y, 0.141);
    for (const sx of [-1, 1]) k.box(MAT.hueco, 0.028, 0.028, 0.008, sx * 0.095, y + 0.012, 0.141); // 363 en los cuerpos + 2 en el templo = 365
    k.escalinata(MAT.calizaOsc, MAT.caliza, 0.2, 0, y, 0.64, 0.2, 24);
    for (let i = 1; i <= 5; i++) k.box(MAT.caliza, 0.07, 0.03, 0.05, 0, (y * i) / 6, 0.64 - (0.44 * i) / 6 + 0.02); // altares con nichos sobre la escalinata
  } },

  // Templo de las Inscripciones: nueve terrazas (60 × 42.5 m, ~23 m), escalinata al norte y templo
  // con cinco vanos y techo en talud. Se apoya contra un cerro cubierto de selva.
  palenque: { A: 0, m: 60, terreno: { lat: 17.4837, lon: -92.0463, color: '#3c6b38' }, // el templo se apoya contra los cerros de selva al sur
    f(k) {
    let y = 0;
    for (let i = 0; i < 9; i++) {
      const w = 1 - i * 0.05, d = 0.71 - i * 0.04;
      k.talud(i % 2 ? MAT.calizaOsc : MAT.caliza, w, d, w - 0.015, d - 0.015, 0.031, 0, y);
      y += 0.031;
    }
    k.escalinata(MAT.calizaOsc, MAT.caliza, 0.17, 0, y, 0.5, 0.18, 26);
    k.box(MAT.caliza, 0.42, 0.075, 0.2, 0, y, -0.02);
    k.talud(MAT.calizaOsc, 0.44, 0.22, 0.3, 0.1, 0.05, 0, y + 0.075, -0.02); // techo en talud (mansarda maya)
    vanos(k, 5, 0.045, 0.055, 0.075, y, 0.081);
  } },

  // Estructura II: 55 m de alto sobre una base de 140 m; fachada norte hacia la Gran Plaza con la
  // escalinata central y templos menores (II-b, II-c) en los cuerpos intermedios.
  calakmul: { A: 0, m: 140, f(k) { estructuraII(k); } },

  // Gran Plaza de Monte Albán: cerro aplanado de ~300 × 200 m; Plataforma Norte, Plataforma Sur,
  // edificios centrales G-H-I y el Edificio J en forma de punta de flecha (desviado del eje).
  montealban: { A: 180, m: 270, terreno: { lat: 17.0438, lon: -96.7679, color: '#8f8a5a' }, // cerro aplanado sobre el valle de Oaxaca, matorral seco
    f(k) {
    k.box(MAT.caliza, 0.56, 0.004, 0.86, 0, 0);
    k.talud(MAT.caliza, 0.54, 0.2, 0.46, 0.16, 0.06, 0, 0, -0.43); // Plataforma Norte
    k.escalera(MAT.calizaOsc, 0.3, 0, 0.06, -0.29, -0.35, 8);
    k.talud(MAT.caliza, 0.3, 0.2, 0.2, 0.12, 0.1, 0, 0, 0.42); // Plataforma Sur
    k.escalera(MAT.calizaOsc, 0.1, 0, 0.1, 0.28, 0.37, 10);
    k.talud(MAT.calizaOsc, 0.1, 0.13, 0.07, 0.1, 0.045, 0, 0, -0.12); // G
    k.talud(MAT.caliza, 0.12, 0.13, 0.08, 0.09, 0.06, 0, 0, 0.0); // H
    k.talud(MAT.calizaOsc, 0.1, 0.11, 0.07, 0.08, 0.045, 0, 0, 0.12); // I
    const j = new THREE.Shape([new THREE.Vector2(0, 0.075), new THREE.Vector2(0.04, 0.0), new THREE.Vector2(0.03, -0.06), new THREE.Vector2(-0.03, -0.06), new THREE.Vector2(-0.04, 0.0)]);
    const gj = new THREE.ExtrudeGeometry(j, { depth: 0.04, bevelEnabled: false });
    gj.rotateX(-Math.PI / 2); gj.rotateY(Math.PI * 0.75); // Edificio J: punta hacia el suroeste
    k.add(MAT.caliza, gj, 0, 0, 0.25);
    for (let i = 0; i < 4; i++) k.talud(MAT.caliza, 0.07, 0.12, 0.05, 0.09, 0.035, -0.24, 0, -0.2 + i * 0.16); // lado poniente
    for (let i = 0; i < 4; i++) k.talud(MAT.caliza, 0.07, 0.12, 0.05, 0.09, 0.035, 0.24, 0, -0.2 + i * 0.16); // lado oriente
    k.box(MAT.calizaOsc, 0.06, 0.02, 0.12, 0.16, 0, -0.28); k.box(MAT.calizaOsc, 0.06, 0.02, 0.12, 0.08, 0, -0.28); // juego de pelota
  } },

  // Pirámide del Adivino: base ovalada (69 × 53 m), 35 m de alto, escalinata poniente muy empinada
  // que sube al Templo V; a media altura, la portada estilo Chenes (Templo IV) en forma de boca.
  uxmal: { A: 270, m: 69, f(k) {
    const capas = [[0.5, 0.385, 0.12], [0.45, 0.33, 0.12], [0.39, 0.27, 0.12], [0.33, 0.2, 0.1]];
    let y = 0;
    capas.forEach(([rx, rz, h], i) => {
      const g = new THREE.CylinderGeometry(1 - 0.06, 1, h, 32);
      g.scale(rx, 1, rz);
      k.add(i % 2 ? MAT.calizaOsc : MAT.caliza, g, 0, y + h / 2, 0);
      y += h;
    });
    k.box(MAT.caliza, 0.34, 0.07, 0.14, 0, y);
    vanos(k, 3, 0.04, 0.045, 0.09, y, 0.071);
    k.escalinata(MAT.calizaOsc, MAT.caliza, 0.15, 0, y, 0.52, 0.2, 30);
    k.box(MAT.caliza, 0.2, 0.09, 0.07, 0, 0.27, 0.3); // Templo IV (Chenes), donde se corta la escalinata
    k.box(MAT.hueco, 0.06, 0.055, 0.01, 0, 0.27, 0.336);
  } },

  // Pirámide B de Tula (Tlahuizcalpantecuhtli): cinco cuerpos de talud-tablero (~10 m sobre 40 m),
  // escalinata al sur; arriba los cuatro Atlantes (4.6 m) y detrás cuatro pilares con relieves;
  // al pie, la columnata del Gran Vestíbulo.
  tula: { A: 180, m: 40, f(k) {
    let y = 0, w = 1;
    for (let i = 0; i < 5; i++) { const r = taludTablero(k, w, w, 0.03, 0.02, y, MAT.basalto, MAT.rocaOsc); y = r.y; w -= 0.12; }
    k.escalinata(MAT.rocaOsc, MAT.basalto, 0.28, 0, y, 0.64, 0.25, 18);
    for (let i = 0; i < 4; i++) atlante(k, -0.15 + i * 0.1, y, 0.07, 0.13);
    for (let i = 0; i < 4; i++) k.box(MAT.basalto, 0.035, 0.13, 0.035, -0.15 + i * 0.1, y, -0.08);
    for (let f = 0; f < 2; f++) for (let i = 0; i < 9; i++) k.cil(MAT.basalto, 0.014, 0.014, 0.05, -0.42 + i * 0.105, 0, 0.72 + f * 0.08, 8);
    k.box(MAT.basalto, 1.0, 0.012, 0.03, 0, 0.05, 0.76);
    // Coatepantli: muro de serpientes al norte, con friso y remates de caracol cortado
    k.box(MAT.basalto, 1.0, 0.07, 0.035, 0, 0, -0.62);
    k.box(MAT.rocaOsc, 0.96, 0.025, 0.006, 0, 0.03, -0.6);
    for (let i = 0; i < 16; i++) k.box(MAT.basalto, 0.03, 0.02, 0.02, -0.46 + i * 0.0613, 0.07, -0.62);
  } },

  // La Venta, Complejo C: la Gran Pirámide, un cono acanalado de tierra (~30 m sobre ~128 m),
  // hoy cubierto de pasto. Al frente, una cabeza colosal (≈3 m de alto: aquí aumentada 4× para que
  // se vea junto a la pirámide).
  laventa: { A: 180, m: 128, f(k) {
    const g = new THREE.CylinderGeometry(0.05, 0.5, 0.23, 60, 5);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 + 0.09 * Math.cos(a * 10);
      p.setX(i, x * f); p.setZ(i, z * f);
    }
    g.computeVertexNormals();
    k.add(MAT.pasto, g, 0, 0.115, -0.05);
    // cabeza colosal (basalto): cara, casco con banda, orejeras
    const z = 0.52, s = 0.4;
    k.esfera(MAT.basalto, 0.1 * s, 0, 0.1 * s, z, 1, 1.15, 0.95, 14);
    k.esfera(MAT.rocaOsc, 0.105 * s, 0, 0.13 * s, z - 0.005, 1, 0.75, 1, 14);
    k.box(MAT.rocaOsc, 0.22 * s, 0.03 * s, 0.2 * s, 0, 0.14 * s, z);
    k.box(MAT.basalto, 0.04 * s, 0.05 * s, 0.03 * s, 0, 0.07 * s, z + 0.09 * s); // nariz ancha
    k.box(MAT.rocaOsc, 0.07 * s, 0.015 * s, 0.02 * s, 0, 0.03 * s, z + 0.09 * s); // labios
    for (const sx of [-1, 1]) k.box(MAT.rocaOsc, 0.02 * s, 0.07 * s, 0.05 * s, sx * 0.1 * s, 0.05 * s, z);
  } },

  // Pirámide de las Serpientes Emplumadas: 21 × 18.6 m; talud con serpientes en relieve, tablero
  // con cornisa volada y, arriba, los muros (sin techo) del templo. Escalinata al poniente.
  xochicalco: { A: 270, m: 21, f(k) {
    k.talud(MAT.gris, 1, 0.89, 0.94, 0.83, 0.12, 0, 0);
    // serpiente emplumada: ondulación en relieve a lo largo del talud
    for (const c of [0, 1, 2, 3]) {
      const largo = c % 2 ? 0.8 : 0.9;
      for (let i = 0; i < 18; i++) {
        const t = i / 17, x = (t - 0.5) * largo, yy = 0.035 + Math.sin(t * Math.PI * 3) * 0.022;
        k.box(MAT.grisOsc, largo / 17, 0.012, 0.008, x, yy, (c % 2 ? 0.5 : 0.445) - 0.01, (c * Math.PI) / 2);
      }
    }
    k.box(MAT.gris, 0.95, 0.07, 0.84, 0, 0.12);
    k.box(MAT.grisOsc, 0.84, 0.045, 0.006, 0, 0.13, 0.42);
    k.box(MAT.gris, 1.0, 0.016, 0.89, 0, 0.19); // cornisa volada
    // muros del templo (sin techo, como hoy)
    const yT = 0.206, h = 0.07;
    k.box(MAT.gris, 0.6, h, 0.035, 0, yT, -0.22);
    k.box(MAT.gris, 0.035, h, 0.46, -0.28, yT, 0); k.box(MAT.gris, 0.035, h, 0.46, 0.28, yT, 0);
    k.box(MAT.gris, 0.2, h, 0.035, -0.2, yT, 0.22); k.box(MAT.gris, 0.2, h, 0.035, 0.2, yT, 0.22);
    k.escalinata(MAT.grisOsc, MAT.gris, 0.26, 0, yT, 0.64, 0.42, 16);
  } },

  // Cacaxtla: el Gran Basamento (~200 × 110 m, 25 m) con sus cuartos y murales, protegido hoy por
  // una enorme cubierta metálica curva sobre columnas.
  cacaxtla: { A: 180, m: 200, terreno: { lat: 19.2446, lon: -98.3404, color: '#8c8a5c' }, // loma sobre el valle de Puebla-Tlaxcala
    f(k) {
    k.talud(MAT.tierra, 1, 0.56, 0.94, 0.5, 0.11, 0, 0);
    k.escalinata(MAT.calizaOsc, MAT.tierra, 0.18, 0, 0.11, 0.42, 0.25, 12);
    for (let i = 0; i < 5; i++) k.box(MAT.adobe, 0.14, 0.035, 0.12, -0.36 + i * 0.18, 0.11, -0.08 + (i % 2) * 0.1);
    k.box(MAT.rojo, 0.16, 0.03, 0.006, 0, 0.11, 0.06); // mural (rojo, azul maya)
    k.box(MAT.azul, 0.06, 0.03, 0.007, 0.06, 0.11, 0.061);
    for (let i = 0; i < 6; i++) for (const z of [-0.24, 0.24]) k.cil(MAT.hierro, 0.006, 0.006, 0.2, -0.45 + i * 0.18, 0.11, z, 6);
    // cubierta: sector de cilindro con el eje a lo largo de x y el arco hacia arriba
    const techo = new THREE.CylinderGeometry(1.1, 1.1, 1.02, 30, 1, true, -0.25, 0.5);
    techo.rotateZ(-Math.PI / 2);
    techo.rotateX(-Math.PI / 2);
    k.add(MAT.lamina, techo, 0, 0.33 - 1.1, 0);
  } },

  // Las cinco yácatas de Tzintzuntzan sobre su gran plataforma (425 × 250 m): cada yácata une un
  // cuerpo rectangular escalonado con uno semicircular (forma de «T» o cerradura). Miran al poniente.
  tzintzuntzan: { A: 270, m: 425, terreno: { lat: 19.6265, lon: -101.578, color: '#7d8a55' }, // ladera del cerro Yahuarato junto al lago de Pátzcuaro
    f(k) {
    k.talud(MAT.basalto, 1, 0.34, 0.97, 0.31, 0.06, 0, 0);
    k.escalinata(MAT.rocaOsc, MAT.basalto, 0.2, 0, 0.06, 0.25, 0.155, 8);
    for (let i = 0; i < 5; i++) {
      const x = -0.4 + i * 0.2;
      let y = 0.06;
      for (let e = 0; e < 4; e++) {
        const s = 1 - e * 0.18;
        k.talud(e % 2 ? MAT.rocaOsc : MAT.basalto, 0.11 * s, 0.07 * s, 0.1 * s, 0.065 * s, 0.022, x, y, 0.05);
        k.cil(e % 2 ? MAT.rocaOsc : MAT.basalto, 0.05 * s, 0.054 * s, 0.022, x, y, -0.04, 14);
        k.box(e % 2 ? MAT.rocaOsc : MAT.basalto, 0.04 * s, 0.022, 0.06, x, y, 0.0);
        y += 0.022;
      }
    }
  } },

  // Paquimé: ciudad de adobe de varios pisos (hasta 3–4), cuartos alrededor de patios, puertas en
  // forma de «T», juego de pelota en «I» y canales de agua.
  paquime: { A: 180, m: 200, f(k) {
    const rnd = azar(11), c = 0.13;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) {
      if ((i === 2 || i === 3) && j === 2) continue; // patio
      if (rnd() < 0.12) continue;
      const x = -0.33 + i * c, z = -0.3 + j * c, centro = 1 - Math.hypot(i - 2.5, j - 2) / 4;
      const h = 0.05 + Math.round(centro * 2 + rnd()) * 0.045;
      const t = 0.018;
      k.box(MAT.adobe, c, h, t, x, 0, z - c / 2);
      k.box(MAT.adobeOsc, t, h, c, x - c / 2, 0, z);
      if (j === 4) { k.box(MAT.adobe, c, h, t, x, 0, z + c / 2); puertaT(k, x, z + c / 2 + 0.01); }
      if (i === 5) k.box(MAT.adobeOsc, t, h, c, x + c / 2, 0, z);
    }
    // juego de pelota en I
    k.box(MAT.adobeOsc, 0.04, 0.025, 0.2, 0.36, 0, 0.5); k.box(MAT.adobeOsc, 0.04, 0.025, 0.2, 0.47, 0, 0.5);
    k.box(MAT.adobeOsc, 0.15, 0.025, 0.04, 0.415, 0, 0.38); k.box(MAT.adobeOsc, 0.15, 0.025, 0.04, 0.415, 0, 0.62);
    k.box(MAT.agua, 0.8, 0.004, 0.02, -0.05, 0, 0.43); // canal
  } },

  // Templo Mayor de México-Tenochtitlan (etapa VII, hacia 1500): cuatro cuerpos, doble escalinata
  // al poniente y dos templos: Tláloc (azul y blanco, al norte) y Huitzilopochtli (rojo, al sur).
  // Al pie del lado de Huitzilopochtli, la piedra de la Coyolxauhqui.
  tenochtitlan: { A: 270, m: 82, f(k) {
    const top = cuerpos(k, [[1, 0.96, 0.1, 0.05], [0.88, 0.85, 0.095, 0.05], [0.76, 0.74, 0.09, 0.05], [0.64, 0.63, 0.085, 0.04]], MAT.caliza, MAT.calizaOsc);
    for (const s of [-1, 1]) k.escalera(MAT.calizaOsc, 0.17, 0, top, 0.66, 0.31, 28, s * 0.105);
    for (const x of [-0.21, 0, 0.21]) k.rampa(MAT.caliza, 0.035, 0, top * 1.03, 0.66, 0.31, x);
    for (const x of [-0.21, 0, 0.21]) k.box(MAT.calizaOsc, 0.04, 0.03, 0.05, x, 0, 0.69); // cabezas de serpiente
    // Tláloc (izquierda al mirar la fachada = norte)
    k.box(MAT.blanco, 0.22, 0.13, 0.2, -0.15, top, 0.02);
    for (let i = 0; i < 5; i++) k.box(MAT.azul, 0.222, 0.012, 0.202, -0.15, top + 0.015 + i * 0.024, 0.02);
    k.box(MAT.azul, 0.23, 0.035, 0.21, -0.15, top + 0.13);
    for (let i = 0; i < 4; i++) k.cil(MAT.blanco, 0.014, 0.014, 0.02, -0.225 + i * 0.05, top + 0.165, 0.02, 10);
    // Huitzilopochtli
    k.box(MAT.rojo, 0.22, 0.13, 0.2, 0.15, top, 0.02);
    for (let i = 0; i < 6; i++) k.esfera(MAT.blanco, 0.008, 0.075 + i * 0.03, top + 0.1, 0.125, 1, 1, 0.5, 8); // cráneos
    k.talud(MAT.rojo, 0.23, 0.21, 0.16, 0.14, 0.05, 0.15, top + 0.13);
    vanos(k, 1, 0.07, 0.08, 0, top, 0.122, -0.15); vanos(k, 1, 0.07, 0.08, 0, top, 0.122, 0.15);
    k.box(MAT.calizaOsc, 0.05, 0.012, 0.022, -0.15, top, 0.16); k.box(MAT.calizaOsc, 0.014, 0.024, 0.022, -0.17, top, 0.16); // chac mool
    k.talud(MAT.calizaOsc, 0.03, 0.03, 0.018, 0.018, 0.022, 0.15, top, 0.16); // téchcatl
    const coyol = new THREE.CylinderGeometry(0.07, 0.07, 0.01, 20); k.add(MAT.rosaOsc, coyol, 0.12, 0.005, 0.78);
  } },

  // Tulum: El Castillo sobre el acantilado frente al Caribe, ciudad amurallada por tierra
  // (norte, poniente y sur) con torres de vigía en las esquinas. El Castillo mira al poniente.
  tulum: { A: 270, m: 380, f(k) {
    const yP = 0.12;
    k.box(MAT.calizaOsc, 1.0, yP, 1.0, 0, 0, 0.0);
    const rnd = azar(5);
    for (let i = 0; i < 12; i++) k.box(MAT.roca, 0.1 + rnd() * 0.06, yP * (0.5 + rnd() * 0.5), 0.07, -0.46 + i * 0.085, 0, -0.52 - rnd() * 0.03);
    k.box(MAT.arena, 1.0, 0.012, 0.1, 0, 0, -0.62);
    k.box(MAT.agua, 1.2, 0.006, 0.4, 0, 0, -0.85);
    k.box(MAT.pasto, 0.98, 0.004, 0.9, 0, yP, 0.04);
    // El Castillo
    k.talud(MAT.caliza, 0.36, 0.26, 0.32, 0.22, 0.06, 0, yP, -0.25);
    k.escalinata(MAT.calizaOsc, MAT.caliza, 0.12, yP, 0.06, -0.04, -0.14, 10);
    k.box(MAT.caliza, 0.22, 0.08, 0.14, 0, yP + 0.06, -0.27);
    k.box(MAT.calizaOsc, 0.24, 0.016, 0.16, 0, yP + 0.14, -0.27);
    vanos(k, 3, 0.04, 0.055, 0.065, yP + 0.06, -0.199);
    for (const s of [-1, 1]) k.box(MAT.caliza, 0.1, 0.05, 0.12, s * 0.21, yP + 0.06, -0.25);
    // muralla y torres de vigía
    k.box(MAT.caliza, 1.0, 0.045, 0.035, 0, yP, 0.47);
    for (const s of [-1, 1]) { k.box(MAT.caliza, 0.035, 0.045, 0.92, s * 0.48, yP, 0.02); k.box(MAT.caliza, 0.07, 0.08, 0.07, s * 0.46, yP, 0.44); }
    k.box(MAT.caliza, 0.1, 0.05, 0.08, -0.25, yP, 0.1); // Templo de los Frescos
  } },

  // ---------------- virreinales ----------------
  // Catedral de Puebla: piedra gris, torres de ~69 m (las más altas de México) rematadas en cúpulas
  // de ladrillo y azulejo con linternilla; tres portadas en la fachada.
  puebla: { A: 180, m: 95, f(k) { iglesia(k, { mat: MAT.gris, matOsc: MAT.grisOsc, torres: [0.68, 0.68], cupulaTorre: MAT.azulejo, largo: 0.95, ancho: 0.4, portales: 3 }); } },
  // Catedral de Zacatecas: cantera rosa, fachada churrigueresca muy labrada, dos torres.
  zacatecas: { A: 180, m: 70, terreno: { lat: 22.7769, lon: -102.5719, color: '#a8956a' }, // cañada entre cerros (La Bufa)
    f(k) { iglesia(k, { mat: MAT.rosa, matOsc: MAT.rosaOsc, torres: [0.5, 0.5], largo: 0.8, ancho: 0.36, retablo: MAT.rosaOsc, roseton: 0.04 }); } },
  // Templo de La Valenciana (San Cayetano): cantera rosa, una sola torre terminada; junto a él,
  // el tiro octagonal de la mina de La Valenciana.
  guanajuato: { A: 180, m: 60, terreno: { lat: 21.0391, lon: -101.256, color: '#a39a62' }, // ladera de la cañada minera
    f(k) {
    iglesia(k, { mat: MAT.rosa, matOsc: MAT.rosaOsc, torres: [0.5, 0.07], largo: 0.72, ancho: 0.34 });
    const tiro = new THREE.CylinderGeometry(0.12, 0.13, 0.12, 8, 1, true);
    k.add(MAT.gris, tiro, 0.5, 0.06, -0.15);
    k.cil(MAT.hueco, 0.1, 0.1, 0.004, 0.5, 0.0, -0.15, 8);
  } },
  // Acueducto del Padre Tembleque: la arquería mayor sobre la barranca de Tepeyahualco tiene 68 arcos
  // de medio punto (UNESCO), unos 1,020 m de largo y hasta 39.65 m de alto (INAH). Aquí, el tramo central: 17 arcos con su altura real siguiendo el valle.
  tembleque: { A: 180, m: 226, f(k) {
    const n = 17, tramos = Array.from({ length: n }, (_, i) => { const t = (i - (n - 1) / 2) / ((n - 1) / 2); return 0.36 * (1 - 0.55 * t * t); });
    acueducto(k, tramos, 0.043, 0.016, 0.04, MAT.caliza);
  } },
  // Real del Monte: casa de máquinas de estilo de Cornualles (Mina de Acosta), su chimenea, el
  // castillete del tiro y casas de techos de lámina roja a dos aguas.
  realdelmonte: { A: 180, m: 60, terreno: { lat: 20.1378, lon: -98.6733, color: '#4f6b3f' }, // Sierra de Pachuca, bosque de pino y oyamel
    f(k) {
    k.box(MAT.gris, 0.22, 0.26, 0.3, -0.1, 0, 0);
    const dosAguas = (w, h) => new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
    k.forma(MAT.techoRojo, dosAguas(0.24, 0.09), 0.32, -0.1, 0.26, 0);
    vanos(k, 1, 0.05, 0.1, 0, 0.06, 0.151, -0.1);
    vanos(k, 2, 0.03, 0.06, 0.08, 0.17, 0.151, -0.1);
    k.cil(MAT.ladrillo, 0.025, 0.04, 0.5, 0.06, 0, -0.1, 10);
    // castillete
    for (const s of [-1, 1]) { const p = new THREE.BoxGeometry(0.012, 0.3, 0.012); p.rotateZ(s * 0.18); k.add(MAT.hierro, p, 0.3 + s * 0.03, 0.15, 0.1); }
    k.box(MAT.hierro, 0.1, 0.012, 0.03, 0.3, 0.29, 0.1);
    k.cil(MAT.hierro, 0.03, 0.03, 0.01, 0.3, 0.3, 0.1, 12);
    for (let i = 0; i < 3; i++) { const x = -0.38 + i * 0.12, z = 0.3; k.box(MAT.blanco, 0.09, 0.06, 0.1, x, 0, z); k.forma(MAT.techoRojo, dosAguas(0.1, 0.05), 0.11, x, 0.06, z); }
  } },
  // Campeche: lienzo de muralla con almenas, la Puerta de Mar y un baluarte pentagonal con garita
  // en la punta (fortificación de fines del siglo XVII contra piratas).
  campeche: { A: 180, m: 150, f(k) {
    k.box(MAT.caliza, 1.0, 0.12, 0.08, 0, 0, -0.05);
    for (let i = 0; i < 16; i++) k.box(MAT.caliza, 0.03, 0.025, 0.03, -0.48 + i * 0.064, 0.12, -0.02);
    const b = new THREE.Shape([new THREE.Vector2(-0.16, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.16, 0.12), new THREE.Vector2(0, 0.3), new THREE.Vector2(-0.16, 0.12)]);
    const gb = new THREE.ExtrudeGeometry(b, { depth: 0.13, bevelEnabled: false }); gb.rotateX(Math.PI / 2); gb.translate(0, 0.13, 0);
    k.add(MAT.caliza, gb, 0.3, 0, -0.02);
    k.cil(MAT.calizaOsc, 0.02, 0.022, 0.05, 0.3, 0.13, 0.26, 10); k.cupula(MAT.calizaOsc, 0.022, 0.3, 0.18, 0.26, 10);
    k.box(MAT.caliza, 0.18, 0.18, 0.1, -0.25, 0, -0.03);
    k.talud(MAT.calizaOsc, 0.18, 0.1, 0.02, 0.1, 0.05, -0.25, 0.18, -0.03);
    const arco = new THREE.Shape(); arco.moveTo(-0.035, 0); arco.lineTo(0.035, 0); arco.lineTo(0.035, 0.07); arco.absarc(0, 0.07, 0.035, 0, Math.PI, false); arco.lineTo(-0.035, 0);
    k.forma(MAT.hueco, arco, 0.01, -0.25, 0, 0.025);
  } },
  // Catedral de Morelia: cantera rosa, torres esbeltas de casi 67 m.
  morelia: { A: 180, m: 105, f(k) { iglesia(k, { mat: MAT.rosa, matOsc: MAT.rosaOsc, torres: [0.66, 0.66], largo: 0.95, ancho: 0.36, portales: 3 }); } },

  // ---------------- modernos ----------------
  // Parroquia de Nuestra Señora de los Dolores: fachada barroca de cantera rosa con dos torres.
  dolores: { A: 180, m: 50, f(k) { iglesia(k, { mat: MAT.rosa, matOsc: MAT.rosaOsc, torres: [0.42, 0.42], largo: 0.65, ancho: 0.3, retablo: MAT.rosaOsc }); } },
  // Acueducto de Querétaro: 74 arcos de altura pareja (~23 m) y 1,280 m. Aquí, un tramo de 12.
  queretaro: { A: 180, m: 210, f(k) { acueducto(k, Array(12).fill(0.17), 0.052, 0.022, 0.035, MAT.rosa); } },
  // Biblioteca Central de la UNAM: prisma ciego de 10 pisos cubierto con el mosaico de piedras de
  // colores de Juan O'Gorman, sobre un basamento de vidrio, en el pedregal de lava del Xitle.
  cu: { A: 180, m: 80, f(k) {
    k.box(MAT.vidrio, 0.8, 0.07, 0.5, 0, 0);
    k.box(MAT.blanco, 0.82, 0.01, 0.52, 0, 0.07);
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.32), mosaico());
    torre.position.y = 0.08 + 0.25; torre.castShadow = true; torre.receiveShadow = true;
    k.extra.push(torre);
    const rnd = azar(3);
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, r = 0.52 + rnd() * 0.12; k.esfera(MAT.lava, 0.04 + rnd() * 0.03, Math.cos(a) * r, 0, Math.sin(a) * r * 0.8, 1.3, 0.5, 1, 6); }
  } },
  // Reloj Monumental de Pachuca (1910): torre neoclásica de 40 m, cuatro cuerpos, carátulas en las
  // cuatro caras y cuatro esculturas femeninas de mármol de Carrara.
  pachuca: { A: 180, m: 40, f(k) {
    k.box(MAT.gris, 0.9, 0.01, 0.9, 0, 0);
    const w0 = 0.26;
    k.box(MAT.blanco, w0 * 1.3, 0.08, w0 * 1.3, 0, 0.01);
    k.box(MAT.blanco, w0, 0.34, w0, 0, 0.09);
    for (let c = 0; c < 4; c++) vanos(k, 1, 0.07, 0.14, 0, 0.09, w0 / 2 + 0.001, 0, (c * Math.PI) / 2);
    k.box(MAT.gris, w0 * 1.08, 0.02, w0 * 1.08, 0, 0.43);
    k.box(MAT.blanco, w0 * 0.88, 0.22, w0 * 0.88, 0, 0.45);
    for (let c = 0; c < 4; c++) {
      const d = new THREE.CylinderGeometry(0.075, 0.075, 0.01, 24); d.rotateX(Math.PI / 2); d.translate(0, 0.56, w0 * 0.44 + 0.005); d.rotateY((c * Math.PI) / 2);
      k.add(MAT.espuma, d);
      const m = new THREE.BoxGeometry(0.008, 0.055, 0.004); m.translate(0, 0.585, w0 * 0.44 + 0.012); m.rotateY((c * Math.PI) / 2); k.add(MAT.hueco, m);
    }
    k.box(MAT.blanco, w0 * 0.7, 0.13, w0 * 0.7, 0, 0.67);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) k.cil(MAT.blanco, 0.016, 0.02, 0.09, x * w0 * 0.42, 0.67, z * w0 * 0.42, 8);
    k.cupula(MAT.gris, w0 * 0.34, 0, 0.8, 0, 14, 1.1);
    k.cil(MAT.gris, 0.012, 0.016, 0.07, 0, 0.8 + w0 * 0.36, 0, 8);
  } },
};

function rnd9(i) { return azar(97 + i * 13)(); }

// Estructura II de Calakmul (se usa en Historia y en la maravilla mixta)
function estructuraII(k) {
  let y = 0;
  [[1, 1, 0.06], [0.94, 0.9, 0.05], [0.86, 0.8, 0.05]].forEach(([w, d, h], i) => { k.talud(i % 2 ? MAT.calizaOsc : MAT.caliza, w, d, w - 0.03, d - 0.03, h, 0, y); y += h; });
  // núcleo superior escalonado
  [[0.56, 0.5, 0.06], [0.48, 0.42, 0.06], [0.4, 0.34, 0.05], [0.3, 0.26, 0.04]].forEach(([w, d, h], i) => { k.talud(i % 2 ? MAT.caliza : MAT.calizaOsc, w, d, w - 0.03, d - 0.03, h, 0, y, -0.1); y += h; });
  k.box(MAT.caliza, 0.2, 0.06, 0.14, 0, y, -0.1);
  vanos(k, 1, 0.05, 0.04, 0, y, -0.029);
  k.escalinata(MAT.calizaOsc, MAT.caliza, 0.18, 0, y, 0.6, 0.03, 34);
  for (const s of [-1, 1]) { k.box(MAT.caliza, 0.16, 0.07, 0.12, s * 0.26, 0.16, 0.24); vanos(k, 1, 0.04, 0.04, 0, 0.16, 0.301, s * 0.26); }
}
function atlante(k, x, y, z, h) {
  k.box(MAT.basalto, 0.022, h * 0.42, 0.016, x - 0.008, y, z); // piernas
  k.box(MAT.basalto, 0.022, h * 0.42, 0.016, x + 0.008, y, z);
  k.cil(MAT.basalto, 0.018, 0.016, h * 0.36, x, y + h * 0.42, z, 8);
  k.box(MAT.rocaOsc, 0.03, 0.012, 0.022, x, y + h * 0.62, z + 0.004); // pectoral de mariposa
  k.esfera(MAT.basalto, 0.014, x, y + h * 0.86, z, 1, 1.1, 1, 8);
  k.cil(MAT.rocaOsc, 0.019, 0.016, h * 0.14, x, y + h * 0.9, z, 8); // tocado de plumas
}
function puertaT(k, x, z) {
  k.box(MAT.hueco, 0.05, 0.022, 0.006, x, 0.04, z);
  k.box(MAT.hueco, 0.025, 0.04, 0.006, x, 0.0, z);
}
// Mosaico de O'Gorman (textura): piedras de colores naturales en grecas, discos y figuras
let texMosaico = null;
function mosaico() {
  if (!texMosaico) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d'), rnd = azar(42);
    const tonos = ['#c9a25a', '#a8492f', '#6f8a55', '#3d6f8f', '#e8dcc0', '#7a5a3a', '#d8b878', '#2f3f5a'];
    c.fillStyle = '#d8c49a'; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) { c.fillStyle = tonos[Math.floor(rnd() * 3) * 2 % tonos.length]; c.globalAlpha = 0.35; c.fillRect(x, y, 4, 4); }
    c.globalAlpha = 1;
    for (let i = 0; i < 14; i++) { c.fillStyle = tonos[i % tonos.length]; c.beginPath(); c.arc(rnd() * 256, rnd() * 256, 8 + rnd() * 24, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#2f3f5a'; c.lineWidth = 5;
    for (let i = 0; i < 6; i++) { c.beginPath(); const y = 20 + i * 42; c.moveTo(0, y); for (let x = 0; x <= 256; x += 16) c.lineTo(x, y + ((x / 16) % 2 ? 10 : 0)); c.stroke(); }
    texMosaico = new THREE.CanvasTexture(cv);
    texMosaico.colorSpace = THREE.SRGBColorSpace;
  }
  return new THREE.MeshStandardMaterial({ map: texMosaico, roughness: 0.8 });
}

// ======================================================================
// MARAVILLAS (id de maravillas.js)
// ======================================================================
const MARAVILLAS = {
  // Revillagigedo: islas volcánicas en mar abierto. Isla Socorro (volcán escudo Evermann con
  // cráter) y Roca Partida, una roca partida en dos; mantarrayas gigantes en el agua.
  revillagigedo: { f(k) {
    k.cil(MAT.agua, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    const v = new THREE.LatheGeometry([[0.001, 0.11], [0.04, 0.1], [0.06, 0.13], [0.14, 0.09], [0.26, 0.04], [0.33, 0.0]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 24);
    k.add(MAT.pasto, v, -0.08, 0.01, -0.05); // laderas con matorral
    k.cil(MAT.lava, 0.05, 0.05, 0.004, -0.08, 0.115, -0.05, 16); // cráter
    k.cil(MAT.lava, 0.335, 0.34, 0.012, -0.08, 0.004, -0.05, 24); // costa de lava
    for (const dx of [-0.022, 0.022]) { const r = new THREE.BoxGeometry(0.03, 0.12, 0.05); r.rotateZ(dx * 4); k.add(MAT.rocaOsc, r, 0.3 + dx, 0.07, 0.15); }
    const manta = new THREE.Shape([new THREE.Vector2(0, 0.04), new THREE.Vector2(0.06, 0), new THREE.Vector2(0, -0.02), new THREE.Vector2(-0.06, 0)]);
    const gm = new THREE.ExtrudeGeometry(manta, { depth: 0.006, bevelEnabled: false }); gm.rotateX(-Math.PI / 2);
    k.add(MAT.hueco, gm, 0.15, 0.014, 0.33);
  } },
  // El Pinacate: escudo volcánico de lavas oscuras con cráteres maar (como El Elegante, de bordes
  // bajos y fondo profundo) y, al poniente, las dunas del Gran Desierto de Altar.
  pinacate: { f(k) {
    k.cil(MAT.arena, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    k.cil(MAT.lava, 0.32, 0.34, 0.012, 0.12, 0.01, -0.05, 24);
    const maar = new THREE.LatheGeometry([[0.0, -0.02], [0.14, -0.02], [0.17, 0.035], [0.2, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
    k.add(MAT.tierra, maar, 0.12, 0.022, -0.05);
    for (const [x, z, r] of [[0.33, 0.12, 0.06], [-0.0, 0.2, 0.045], [0.35, -0.25, 0.05]]) k.cono(MAT.lava, r, r * 0.9, x, 0.02, z, 12);
    for (let i = 0; i < 5; i++) k.esfera(MAT.arena, 0.11, -0.33, 0.01, -0.3 + i * 0.15, 0.6, 0.25, 0.3, 10);
  } },
  // Golfo de California: islas desérticas donde el desierto llega al mar, con cardones
  // (Pachycereus pringlei, el cactus más alto del mundo) y lobos marinos en las rocas.
  golfo: { f(k) {
    k.cil(MAT.agua, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    const isla = new THREE.LatheGeometry([[0.0, 0.08], [0.12, 0.07], [0.22, 0.04], [0.3, 0.0]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 20);
    isla.scale(1.2, 1, 0.8);
    k.add(MAT.tierra, isla, -0.04, 0.01, 0);
    const rnd = azar(21);
    for (let i = 0; i < 5; i++) k.columnar(-0.2 + i * 0.09, -0.06 + rnd() * 0.12, 0.14 + rnd() * 0.06, 0.014, 2 + (i % 2), 0.06, rnd, MAT.cactusOsc);
    k.box(MAT.rocaOsc, 0.08, 0.03, 0.06, 0.34, 0.01, 0.2);
    for (let i = 0; i < 3; i++) k.esfera(MAT.raiz, 0.014, 0.31 + i * 0.03, 0.05, 0.2, 1.6, 0.7, 0.8, 6);
  } },
  // El Vizcaíno: lagunas costeras (Ojo de Liebre, San Ignacio) donde la ballena gris tiene a sus
  // crías: una madre con su cría y la cola de otra al sumergirse.
  vizcaino: { f(k) {
    k.cil(MAT.arena, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    k.cil(MAT.aguaClara, 0.42, 0.42, 0.012, 0, 0.002, 0, 32);
    k.esfera(MAT.ballena, 0.1, -0.08, 0.012, 0.02, 1.9, 0.35, 0.6, 14);
    k.esfera(MAT.ballena, 0.055, 0.08, 0.012, 0.1, 1.8, 0.35, 0.6, 12);
    const cola = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0.05), new THREE.Vector2(0.03, 0.035), new THREE.Vector2(0, 0.02), new THREE.Vector2(-0.03, 0.035), new THREE.Vector2(-0.07, 0.05)]);
    k.forma(MAT.ballena, cola, 0.008, 0.2, 0.04, -0.2);
    k.cil(MAT.ballena, 0.01, 0.018, 0.04, 0.2, 0.0, -0.2, 8);
    k.cil(MAT.espuma, 0.06, 0.06, 0.004, 0.2, 0.012, -0.2, 16);
  } },
  // Mariposa Monarca: bosques de oyamel (Abies religiosa) en montañas de 3,000 m, con las colonias
  // de mariposas colgando en racimos naranjas de troncos y ramas.
  monarca: { f(k) {
    k.cono(MAT.pasto, 0.5, 0.16, 0, 0, 0, 24);
    const rnd = azar(8);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, r = 0.08 + (i % 4) * 0.09, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = 0.16 * (1 - Math.hypot(x, z) / 0.5) - 0.01;
      k.conifera(x, z, 0.2 + rnd() * 0.06, 0.05, y);
      for (let j = 0; j < 3; j++) k.esfera(MAT.monarca, 0.011, x + (rnd() - 0.5) * 0.04, y + 0.06 + j * 0.035, z + 0.028, 1, 1.6, 0.8, 6);
    }
  } },
  // Sian Ka'an: lagunas, manglares sobre raíces zancudas, petenes (islas de selva) y el templo
  // maya de Muyil (El Castillo, una torre escalonada de 17 m).
  siankaan: { f(k) {
    k.cil(MAT.aguaClara, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    k.cil(MAT.pasto, 0.22, 0.24, 0.016, -0.18, 0, -0.1, 18);
    for (let i = 0; i < 6; i++) k.arbol(-0.3 + (i % 3) * 0.1, -0.18 + Math.floor(i / 3) * 0.13, 0.12, 0.06, 0.016);
    for (let i = 0; i < 5; i++) {
      const x = 0.05 + i * 0.09, z = 0.25;
      for (let r = 0; r < 4; r++) { const t = new THREE.TorusGeometry(0.03, 0.003, 4, 10, Math.PI); t.rotateY((r * Math.PI) / 4); k.add(MAT.raiz, t, x, 0.005, z); }
      k.esfera(MAT.selvaOsc, 0.05, x, 0.07, z, 1, 0.6, 1, 7);
    }
    let y = 0.01;
    [[0.12, 0.05], [0.1, 0.05], [0.08, 0.05], [0.065, 0.05]].forEach(([w, h]) => { k.talud(MAT.caliza, w, w, w - 0.01, w - 0.01, h, 0.26, y, -0.18); y += h; });
    k.box(MAT.caliza, 0.05, 0.035, 0.05, 0.26, y, -0.18);
    k.escalera(MAT.calizaOsc, 0.03, 0.01, y - 0.01, -0.1, -0.15, 10, 0.26);
  } },
  // Calakmul: la Estructura II asomando sobre la mayor selva tropical de México.
  calakmul: { f(k) {
    k.cil(MAT.selvaOsc, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    const s = new Kit(); estructuraII(s);
    for (const [mat, geos] of s.p) for (const g of geos) { g.scale(0.55, 0.55, 0.55); k.add(mat, g, 0, 0.01, 0); }
    const rnd = azar(4);
    for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = 0.33 + rnd() * 0.14; k.arbol(Math.cos(a) * r, Math.sin(a) * r, 0.12 + rnd() * 0.05, 0.06, 0.01, i % 2 ? MAT.selva : MAT.selvaOsc); }
  } },
  // Tehuacán-Cuicatlán: lomeríos secos cubiertos de «bosques» de cactus columnares (tetechos,
  // Neobuxbaumia tetetzo) y candelabros (Pachycereus weberi); en sus cuevas (Coxcatlán) está
  // parte de la evidencia más antigua de la domesticación del maíz.
  tehuacan: { f(k) {
    const loma = new THREE.LatheGeometry([[0, 0.12], [0.2, 0.1], [0.4, 0.04], [0.5, 0]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 28);
    k.add(MAT.tierra, loma);
    const rnd = azar(13);
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2, r = 0.05 + rnd() * 0.38, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = 0.12 * (1 - Math.min(1, r / 0.5)) ** 1.2;
      if (i % 5 === 0) k.columnar(x, z, 0.12, 0.016, 4, y, rnd, MAT.cactusOsc); else k.columnar(x, z, 0.1 + rnd() * 0.08, 0.011, 0, y, rnd);
    }
    const cueva = new THREE.Shape(); cueva.moveTo(-0.04, 0); cueva.lineTo(0.04, 0); cueva.absarc(0, 0, 0.04, 0, Math.PI, false);
    k.forma(MAT.hueco, cueva, 0.01, 0, 0.04, 0.37, 0.15);
  } },
  // Comarca Minera: los Prismas Basálticos de Santa María Regla (columnas hexagonales de lava
  // enfriada) con su cascada, y una chimenea minera de estilo de Cornualles.
  comarca: { f(k) {
    k.cil(MAT.pasto, 0.5, 0.5, 0.01, 0, 0, 0, 32);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.15 + (i / 25) * 0.7), r = 0.26 + (i % 2) * 0.035;
      const h = 0.16 + Math.sin(i * 1.7) * 0.03;
      k.cil(i % 3 ? MAT.basalto : MAT.rocaOsc, 0.024, 0.024, h, Math.cos(a) * r, 0.01, -Math.sin(a) * r + 0.12, 6);
    }
    k.box(MAT.espuma, 0.05, 0.17, 0.01, 0, 0.01, -0.12);
    k.cil(MAT.aguaClara, 0.12, 0.12, 0.006, 0, 0.01, -0.05, 20);
    k.cil(MAT.ladrillo, 0.022, 0.034, 0.32, 0.3, 0.01, 0.25, 10);
    k.box(MAT.gris, 0.12, 0.1, 0.09, 0.2, 0.01, 0.28);
  } },
  // Mixteca Alta: cárcavas de tierra roja (erosión que deja ver millones de años de rocas), terrazas
  // agrícolas antiguas de lama-bordo y el enorme templo dominico de Yanhuitlán (siglo XVI) con
  // sus contrafuertes.
  mixteca: { f(k) {
    const g = new THREE.LatheGeometry([[0, 0.14], [0.15, 0.12], [0.32, 0.06], [0.5, 0]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 - 0.18 * Math.max(0, Math.sin(a * 9)) * (Math.hypot(x, z) / 0.5); p.setY(i, p.getY(i) * f); }
    g.computeVertexNormals(); g.scale(0.8, 1.3, 0.55);
    k.add(MAT.tierraRoja, g, 0.05, 0, -0.2);
    k.cil(MAT.tierra, 0.5, 0.5, 0.008, 0, 0, 0, 32);
    for (let i = 0; i < 5; i++) k.box(i % 2 ? MAT.pasto : MAT.cactus, 0.42 - i * 0.04, 0.016, 0.06, 0.18, 0.008 + i * 0.016, 0.38 - i * 0.06);
    // Yanhuitlán: nave alta con contrafuertes y fachada sin torres
    k.box(MAT.caliza, 0.12, 0.13, 0.3, -0.25, 0, 0.25);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.talud(MAT.calizaOsc, 0.03, 0.035, 0.015, 0.02, 0.12, -0.25 + s * 0.072, 0, 0.14 + i * 0.075);
    k.box(MAT.calizaOsc, 0.13, 0.16, 0.025, -0.25, 0, 0.41);
    vanos(k, 1, 0.035, 0.06, 0, 0, 0.424, -0.25);
  } },
  // Anillo de Cenotes: la llanura de caliza de Yucatán con un cenote abierto (paredes verticales,
  // agua turquesa, raíces colgando) y el arco de cenotes que sigue el borde del cráter de Chicxulub.
  cenotes: { f(k) {
    // llanura de caliza con el hueco del cenote: anillo arriba + borde exterior
    const anillo = new THREE.RingGeometry(0.17, 0.5, 40, 1); anillo.rotateX(-Math.PI / 2);
    k.add(MAT.caliza, anillo, 0, 0.06, 0);
    k.add(MAT.calizaOsc, new THREE.CylinderGeometry(0.5, 0.5, 0.06, 40, 1, true), 0, 0.03, 0);
    const pared = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 28, 1, true);
    const inv = new THREE.MeshStandardMaterial({ color: 0x9c8f72, roughness: 0.95, side: THREE.BackSide });
    const muro = new THREE.Mesh(pared, inv); muro.position.y = 0.0; k.extra.push(muro);
    k.cil(MAT.aguaClara, 0.168, 0.168, 0.005, 0, -0.05, 0, 28);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; k.box(MAT.raiz, 0.004, 0.08, 0.004, Math.cos(a) * 0.15, -0.02, Math.sin(a) * 0.15); }
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + (i / 8) * 0.8); k.cil(MAT.aguaClara, 0.03, 0.03, 0.004, Math.cos(a) * 0.4, 0.059, -Math.sin(a) * 0.4 + 0.1, 12); }
    const rnd = azar(9);
    for (let i = 0; i < 8; i++) { const a = rnd() * Math.PI * 2, r = 0.24 + rnd() * 0.06; k.arbol(Math.cos(a) * r, Math.sin(a) * r, 0.08, 0.04, 0.06); }
  } },
};

// ======================================================================
// ALIMENTOS (capa Sabores): se apoyan sobre la vasija; alto ≈ 1 en el marco local
// ======================================================================
const ALIMENTOS = {
  // mazorca: olote con hileras de granos en relieve y hojas (totomoxtle) abiertas en la base
  Maíz(k, c) {
    const g = new THREE.CylinderGeometry(0.13, 0.17, 0.85, 28, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const t = (y + 0.425) / 0.85, punta = t > 0.82 ? Math.cos(((t - 0.82) / 0.18) * Math.PI / 2) : 1;
      const grano = 1 + 0.07 * Math.abs(Math.sin(a * 7)) * Math.abs(Math.sin(t * 40));
      p.setX(i, x * grano * (0.3 + 0.7 * punta)); p.setZ(i, z * grano * (0.3 + 0.7 * punta));
    }
    g.computeVertexNormals();
    k.add(c, g, 0, 0.5, 0);
    for (let h = 0; h < 3; h++) { const s = new THREE.SphereGeometry(0.3, 8, 6); s.scale(0.35, 1, 0.08); s.rotateZ(0.5); s.translate(0.12, 0.25, 0); s.rotateY((h * Math.PI * 2) / 3); k.add(MAT.cactus, s); }
  },
  // calabaza (Cucurbita pepo): gajos marcados y pedúnculo
  Calabaza(k, c) {
    const g = new THREE.SphereGeometry(0.42, 32, 20);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 - 0.07 * (1 - Math.abs(Math.cos(a * 5))); p.setX(i, x * f); p.setZ(i, z * f); p.setY(i, p.getY(i) * 0.75); }
    g.computeVertexNormals();
    k.add(c, g, 0, 0.32, 0);
    k.cil(MAT.raiz, 0.035, 0.05, 0.16, 0, 0.6, 0, 8);
  },
  // chile: fruto curvo que se adelgaza hasta la punta, con cáliz verde
  Chile(k, c) {
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0.05, 0.6, 0), new THREE.Vector3(0.0, 0.3, 0), new THREE.Vector3(-0.18, 0.08, 0)]);
    const tub = 20, rad = 10;
    const g = new THREE.TubeGeometry(curva, tub, 0.13, rad, false);
    const p = g.attributes.position, q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / (rad + 1)) / tub, c0 = curva.getPointAt(t);
      q.set(p.getX(i), p.getY(i), p.getZ(i)).sub(c0).multiplyScalar(1 - 0.85 * t * t).add(c0);
      p.setXYZ(i, q.x, q.y, q.z);
    }
    g.computeVertexNormals();
    k.add(c, g);
    k.cupula(MAT.cactus, 0.14, 0, 0.92, 0, 10, 0.5);
    k.cil(MAT.cactus, 0.025, 0.03, 0.12, 0, 0.96, 0, 6);
  },
  // mazorca de cacao: alargada, con diez costillas y punta
  Cacao(k, c) {
    const g = new THREE.SphereGeometry(0.3, 30, 18);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 + 0.08 * Math.cos(a * 10);
      const t = (y + 0.3) / 0.6, ah = t > 0.75 ? 1 - (t - 0.75) * 1.6 : 1; // se afila hacia la punta
      p.setXYZ(i, x * f * ah, y * 1.55, z * f * ah);
    }
    g.computeVertexNormals();
    k.add(c, g, 0, 0.47, 0);
    k.cil(MAT.raiz, 0.03, 0.04, 0.1, 0, 0, 0, 6);
  },
  // frijoles: montoncito de semillas arriñonadas
  Frijol(k, c) {
    const rnd = azar(17);
    [[0, 0.1, 0], [0.17, 0.08, 0.05], [-0.16, 0.08, 0.04], [0.05, 0.08, -0.17], [-0.06, 0.08, 0.17], [0.05, 0.26, 0.03], [-0.07, 0.25, -0.05]].forEach(([x, y, z]) => {
      k.esfera(c, 0.13, x, y, z, 1.5, 0.8, 0.95, 10, rnd() * 6);
    });
  },
};
export function modeloAlimento(alimento, color) {
  const f = ALIMENTOS[alimento];
  if (!f) return null;
  MAT ??= crearMateriales();
  const k = new Kit();
  f(k, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  const g = k.grupo();
  const ext = new THREE.Group();
  ext.add(g);
  ext.rotation.x = Math.PI / 2;
  ext.scale.setScalar(0.013);
  const giraY = new THREE.Group(); // se balancea sobre el eje vertical del mapa
  giraY.add(ext);
  return giraY;
}


// ======================================================================
// TRADICIONES (capa Cultura): los ocho elementos de México en el Patrimonio Cultural Inmaterial
// de la UNESCO, como objetos (no a escala del territorio). Marco local: arriba = +y, frente = +z.
// ======================================================================
let texTalavera = null;
function talavera() {
  if (!texTalavera) {
    // decoración de talavera poblana: fondo de esmalte blanco, azul de cobalto en flores y grecas,
    // un toque de amarillo
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#1f3f9a';
    c.fillRect(0, 18, 512, 10); c.fillRect(0, 228, 512, 10);
    for (let x = 0; x < 512; x += 32) { c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 16, 54); c.lineTo(x + 32, 40); c.lineWidth = 5; c.strokeStyle = '#1f3f9a'; c.stroke(); }
    for (let i = 0; i < 4; i++) {
      const cx = 64 + i * 128, cy = 136;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.beginPath(); c.ellipse(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 18, 9, a, 0, Math.PI * 2); c.fillStyle = '#1f3f9a'; c.fill(); }
      c.beginPath(); c.arc(cx, cy, 13, 0, Math.PI * 2); c.fillStyle = '#d9a52b'; c.fill();
      c.beginPath(); c.arc(cx, cy, 5, 0, Math.PI * 2); c.fillStyle = '#1f3f9a'; c.fill();
    }
    for (let x = 0; x < 512; x += 64) { c.beginPath(); c.arc(x + 32, 205, 6, 0, Math.PI * 2); c.fillStyle = '#1f3f9a'; c.fill(); }
    texTalavera = new THREE.CanvasTexture(cv);
    texTalavera.colorSpace = THREE.SRGBColorSpace;
    texTalavera.wrapS = THREE.RepeatWrapping;
  }
  return new THREE.MeshStandardMaterial({ map: texTalavera, roughness: 0.25, metalness: 0.05 });
}
const MP = {}; // materiales propios de las piezas (se crean al usarse)
// instrumento armado derecho (caja en y 0–alto, tapa hacia +z) y luego recargado hacia atrás
function inclinar(k, sub, rx, y, z) {
  for (const [mat, geos] of sub.p) for (const g of geos) { g.rotateX(rx); k.add(mat, g, 0, y, z); }
}
function guitarra(k, { ancho = 0.2, alto = 0.5, cintura = 0.12, fondo = 0.08, abombada = false, mastil = 0.42, boca = 0.045 }) {
  const sub = new Kit();
  const s = new THREE.Shape();
  if (abombada) { // guitarrón: hombros rectos y cuerpo ancho
    s.moveTo(0, 0); s.bezierCurveTo(ancho * 1.3, 0, ancho * 1.35, alto * 0.72, cintura, alto); s.lineTo(-cintura, alto); s.bezierCurveTo(-ancho * 1.35, alto * 0.72, -ancho * 1.3, 0, 0, 0);
  } else {
    s.moveTo(0, 0); s.bezierCurveTo(ancho, 0, ancho * 1.1, alto * 0.4, cintura, alto * 0.56); s.bezierCurveTo(ancho * 0.85, alto * 0.72, ancho * 0.85, alto, 0, alto);
    s.bezierCurveTo(-ancho * 0.85, alto, -ancho * 0.85, alto * 0.72, -cintura, alto * 0.56); s.bezierCurveTo(-ancho * 1.1, alto * 0.4, -ancho, 0, 0, 0);
  }
  const caja = new THREE.ExtrudeGeometry(s, { depth: fondo, bevelEnabled: true, bevelSize: abombada ? 0.03 : 0.01, bevelThickness: abombada ? 0.05 : 0.01, bevelSegments: 3 });
  caja.translate(0, 0, -fondo);
  sub.add(mp('cedro', 0xc58a4a, { roughness: 0.4 }), caja);
  const b = new THREE.CylinderGeometry(boca, boca, 0.01, 20); b.rotateX(Math.PI / 2); sub.add(MAT.hueco, b, 0, alto * (abombada ? 0.55 : 0.62), abombada ? 0.056 : 0.016);
  sub.box(MAT.madera, 0.045, mastil, 0.03, 0, alto - 0.01, -0.01); // mástil
  sub.box(MAT.madera, 0.075, 0.11, 0.03, 0, alto + mastil - 0.02, -0.015); // clavijero
  for (let i = 0; i < 6; i++) sub.box(mp('cuerda-g', 0xe8e2d0), 0.002, mastil + alto * 0.4, 0.002, (i - 2.5) * 0.007, alto * 0.6, abombada ? 0.06 : 0.02);
  inclinar(k, sub, -0.25, 0.04, 0.02);
  k.box(MAT.madera, 0.03, 0.28, 0.03, 0, 0.02, -0.22); // atril
}
const mp = (k, color, extra = {}) => (MP[k] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));

const PIEZAS = {
  // palo volador (~30 m) con el tecomate y el cuadro arriba; el caporal en la punta y los cuatro
  // voladores bajando de cabeza, atados con cuerdas, mientras el cuadro gira
  voladores(k, anim) {
    k.box(MAT.tierra, 0.5, 0.02, 0.5, 0, 0, 0);
    k.cil(MAT.madera, 0.018, 0.028, 1.3, 0, 0.02, 0, 10);
    k.cil(MAT.madera, 0.045, 0.04, 0.035, 0, 1.32, 0, 12); // tecomate
    const giro = new Kit();
    giro.box(MAT.madera, 0.36, 0.012, 0.012, 0, 0, 0.18); giro.box(MAT.madera, 0.36, 0.012, 0.012, 0, 0, -0.18);
    giro.box(MAT.madera, 0.012, 0.012, 0.36, 0.18, 0, 0); giro.box(MAT.madera, 0.012, 0.012, 0.36, -0.18, 0, 0);
    const g = giro.grupo(); g.position.y = 1.24;
    const voladores = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const v = new Kit();
      v.cil(mp('cuerda', 0xd8c9a0), 0.003, 0.003, 1, 0, -1, 0, 4); // cuerda (se escala)
      const cuerpo = new Kit();
      cuerpo.box(mp('rojo-v', 0xc0392b), 0.045, 0.08, 0.03, 0, -0.08, 0); // de cabeza: el tronco abajo de los pies
      cuerpo.box(mp('blanco-v', 0xf2eee4), 0.035, 0.07, 0.025, 0, -0.01, 0); // piernas (calzón blanco)
      cuerpo.esfera(mp('piel', 0x8a5a3c), 0.02, 0, -0.135, 0, 1, 1, 1, 8);
      cuerpo.cono(mp('penacho', 0xe0b84a), 0.03, 0.05, 0, -0.205, 0, 8); // tocado cónico con listones
      const gv = v.grupo(), gc = cuerpo.grupo();
      const brazo = new THREE.Group(); brazo.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
      brazo.add(gv, gc); g.add(brazo);
      voladores.push({ brazo, gv, gc, a });
    }
    k.extra.push(g);
    // caporal de pie en el tecomate
    k.box(mp('rojo-v', 0xc0392b), 0.04, 0.07, 0.03, 0, 1.355, 0); k.esfera(mp('piel', 0x8a5a3c), 0.018, 0, 1.445, 0, 1, 1, 1, 8);
    anim.push((t) => {
      const ciclo = (t * 0.06) % 1; // bajan en ~17 s y vuelven a empezar
      g.rotation.y = t * 0.9;
      for (const v of voladores) {
        const largo = 0.08 + ciclo * 1.0, r = 0.2 + ciclo * 0.32; // la cuerda se desenrolla y el radio crece
        v.brazo.position.set(Math.cos(v.a) * r, 0, Math.sin(v.a) * r);
        v.gv.scale.set(1, largo, 1);
        v.gc.position.y = -largo;
      }
    });
  },
  // parachico: máscara de madera tallada (cara clara, sonriente), montera de ixtle rubia, sarape
  // de franjas y chinchín (sonaja) en la mano
  parachicos(k) {
    k.box(MAT.tierra, 0.5, 0.02, 0.5, 0, 0, 0);
    const franjas = [0xc0392b, 0x1f3f9a, 0xe0b84a, 0x2e7d4f, 0xc0392b, 0x1b1a17];
    franjas.forEach((c, i) => k.cil(mp('sarape' + i, c), 0.17 - i * 0.008, 0.18 - i * 0.008, 0.09, 0, 0.02 + i * 0.09, 0, 18));
    k.esfera(mp('mascara', 0xe7c9a4, { roughness: 0.35 }), 0.12, 0, 0.7, 0.1, 0.9, 1.1, 0.6, 20);
    for (const s of [-1, 1]) k.esfera(MAT.hueco, 0.014, s * 0.045, 0.74, 0.168, 1, 0.6, 0.5, 8);
    k.box(mp('rojo-v', 0xc0392b), 0.06, 0.012, 0.01, 0, 0.64, 0.17);
    const montera = new THREE.SphereGeometry(0.21, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const p = montera.attributes.position;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) * (1 + 0.06 * Math.sin(a * 23))); }
    montera.computeVertexNormals();
    k.add(mp('ixtle', 0xe2bf6a, { roughness: 0.9 }), montera, 0, 0.7, -0.1);
    k.cil(MAT.madera, 0.008, 0.008, 0.28, 0.24, 0.3, 0.05, 6); k.esfera(mp('jicara', 0xa8432f), 0.05, 0.24, 0.6, 0.05, 1, 1.2, 1, 12);
  },
  // guitarra de Paracho (las de la pirekua), sobre un atril
  pirekua(k) {
    k.box(MAT.tierra, 0.5, 0.02, 0.5, 0, 0, 0);
    guitarra(k, {});
  },
  // metate de tres patas con su mano, comal con tortillas y olla de barro
  cocina(k) {
    k.box(MAT.tierra, 0.6, 0.02, 0.5, 0, 0, 0);
    const met = new THREE.BoxGeometry(0.32, 0.05, 0.2); met.rotateZ(-0.18); k.add(MAT.basalto, met, -0.12, 0.13, 0);
    for (const [x, z, h] of [[-0.25, -0.07, 0.12], [-0.25, 0.07, 0.12], [0.02, 0, 0.07]]) k.cil(MAT.basalto, 0.02, 0.025, h, x, 0.02, z, 8);
    const mano = new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10); mano.rotateX(Math.PI / 2); k.add(MAT.basalto, mano, -0.1, 0.19, 0);
    k.esfera(mp('masa', 0xefd9a0), 0.04, 0.0, 0.16, 0, 1.2, 0.5, 1, 10);
    k.cil(MAT.lava, 0.13, 0.13, 0.01, 0.17, 0.08, 0.05, 24); // comal
    for (let i = 0; i < 3; i++) k.cil(mp('tortilla', 0xe8d6a0), 0.07, 0.07, 0.006, 0.17, 0.09 + i * 0.006, 0.05, 20);
    for (const [x, z] of [[0.1, 0.12], [0.24, 0.12], [0.17, -0.06]]) k.box(MAT.roca, 0.05, 0.06, 0.05, x, 0.02, z); // tenamaztles
    const olla = new THREE.LatheGeometry([[0.0, 0], [0.07, 0.01], [0.1, 0.06], [0.09, 0.12], [0.06, 0.15], [0.07, 0.17]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    k.add(mp('barro', 0xa8603a), olla, 0.15, 0.02, -0.18);
  },
  // ofrenda de tres niveles: mantel, velas, cempasúchil, calaveritas, pan de muerto y arco de flores
  muertos(k) {
    k.box(MAT.tierra, 0.6, 0.02, 0.5, 0, 0, 0);
    [[0.56, 0.12, 0.42, 0], [0.42, 0.12, 0.3, 0.12], [0.28, 0.12, 0.18, 0.24]].forEach(([w, h, d, y], i) => {
      k.box(mp('mantel', 0xf2eee4), w, h, d, 0, 0.02 + y, -0.04 + i * -0.02);
      k.box(mp('papel' + i, [0xc0392b, 0x8e44ad, 0xe67e22][i]), w + 0.004, 0.025, d + 0.004, 0, 0.02 + y + h - 0.025, -0.04 + i * -0.02);
    });
    const naranja = mp('cempasuchil', 0xf28c1a, { roughness: 0.8 });
    for (let i = 0; i < 14; i++) { const x = -0.26 + (i % 7) * 0.087; k.esfera(naranja, 0.024, x, 0.16 + (i > 6 ? 0.12 : 0), 0.17 - (i > 6 ? 0.13 : 0), 1, 0.8, 1, 8); }
    for (const x of [-0.2, 0.2, -0.1, 0.1]) { k.cil(mp('vela', 0xf6f0dc), 0.012, 0.012, 0.09, x, 0.38, -0.05, 8); k.esfera(mp('llama', 0xffb300, { emissive: 0xff8a00, emissiveIntensity: 0.9 }), 0.01, x, 0.48, -0.05, 1, 1.6, 1, 6); }
    for (const x of [-0.07, 0.0, 0.07]) k.esfera(mp('azucar', 0xffffff, { roughness: 0.4 }), 0.025, x, 0.4, -0.08, 1, 1.05, 1, 10);
    k.esfera(mp('pan', 0xc98a3a), 0.045, 0.14, 0.17, 0.12, 1, 0.6, 1, 12);
    const arco = new THREE.TorusGeometry(0.3, 0.025, 6, 30, Math.PI); k.add(naranja, arco, 0, 0.42, -0.2);
  },
  // guitarrón: el bajo del mariachi, de caja grande y espalda abombada
  mariachi(k) {
    k.box(MAT.tierra, 0.5, 0.02, 0.5, 0, 0, 0);
    guitarra(k, { ancho: 0.2, alto: 0.46, cintura: 0.12, fondo: 0.1, abombada: true, mastil: 0.3, boca: 0.06 });
  },
  // sombrero de charro (ala ancha con la orilla levantada y copa alta) y una reata enrollada
  charreria(k) {
    k.box(MAT.tierra, 0.5, 0.02, 0.5, 0, 0, 0);
    const ala = new THREE.LatheGeometry([[0.07, 0.0], [0.2, 0.02], [0.3, 0.05], [0.34, 0.09], [0.345, 0.1]].map(([r, y]) => new THREE.Vector2(r, y)), 36);
    const fieltro = mp('fieltro', 0x3a2c22, { roughness: 0.85, side: THREE.DoubleSide });
    k.add(fieltro, ala, 0, 0.04, 0);
    const copa = new THREE.LatheGeometry([[0.0, 0.3], [0.05, 0.29], [0.08, 0.2], [0.1, 0.05], [0.1, 0.0]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 24);
    k.add(fieltro, copa, 0, 0.04, 0);
    const toquilla = new THREE.TorusGeometry(0.1, 0.008, 6, 24); toquilla.rotateX(Math.PI / 2); k.add(mp('plata', 0xcfd3d6, { metalness: 0.8, roughness: 0.3 }), toquilla, 0, 0.1, 0);
    for (let i = 0; i < 4; i++) { const r = new THREE.TorusGeometry(0.06 + i * 0.008, 0.007, 6, 28); r.rotateX(Math.PI / 2); k.add(mp('reata', 0xcfb684), r, 0.17, 0.03 + i * 0.012, 0.15); }
  },
  // jarrón de talavera poblana (esmalte blanco y azul cobalto)
  talavera(k) {
    k.box(MAT.tierra, 0.4, 0.02, 0.4, 0, 0, 0);
    const perfil = [[0.0, 0], [0.09, 0.0], [0.1, 0.03], [0.16, 0.18], [0.17, 0.3], [0.12, 0.46], [0.07, 0.56], [0.075, 0.64], [0.1, 0.68]].map(([r, y]) => new THREE.Vector2(r, y));
    const jarron = new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), talavera());
    jarron.position.y = 0.02; jarron.castShadow = true; jarron.receiveShadow = true;
    k.extra.push(jarron);
  },
};

// Pieza de una tradición (capa Cultura), o null. Devuelve un grupo listo para el mapa y, si la pieza
// se mueve (voladores), `userData.animar(t)`.
export function modeloTradicion(id) {
  const f = PIEZAS[id];
  if (!f) return null;
  MAT ??= crearMateriales();
  const k = new Kit(), anim = [];
  f(k, anim);
  const g = k.grupo();
  const ext = new THREE.Group();
  ext.add(g);
  ext.rotation.x = Math.PI / 2;
  ext.scale.setScalar(0.021);
  ext.userData.animar = anim.length ? (t) => anim.forEach((a) => a(t)) : null;
  return ext;
}
export const TRADICIONES_CON_MODELO = Object.keys(PIEZAS);

// Terreno real bajo la maqueta (data/relieve/sitio-<id>.json, Terrain Tiles de AWS a ~5 m por pixel).
// Misma escala horizontal que la maqueta (1 unidad local = m metros) y la altura del terreno ×2
// (TERRENO_V; el relieve del mapa va ×8) para que el cerro se lea; la obra no se exagera. El centro (donde está la obra) se aplana como su plataforma o plaza nivelada, y la
// orilla se funde con el mapa. x = este, y = arriba, z = sur.
let matTerreno = null;
const TERRENO_V = 2, GROSOR = 0.008;
function terrenoReal(dem, t, m, R = 1.05) {
  const mLat = 111320, mLon = 111320 * Math.cos((t.lat * Math.PI) / 180);
  const alturaM = (x, z) => muestrear(dem, t.lon + (x * m) / mLon, t.lat - (z * m) / mLat);
  const vals = [];
  for (let k = 0; k < 300; k++) {
    const a = k * 2.39996, r = Math.sqrt((k + 0.5) / 300) * R, e = alturaM(Math.cos(a) * r, Math.sin(a) * r);
    if (e != null) vals.push(e);
  }
  vals.sort((a, b) => a - b);
  const base = vals[Math.floor(vals.length * 0.12)] ?? 0;
  const hc = Math.max(0, ((alturaM(0, 0) ?? base) - base) / m) * TERRENO_V + GROSOR;
  const suave = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const anillos = 20, sectores = 60, pos = [], col = [], idx = [];
  const c0 = new THREE.Color(t.color), c = new THREE.Color(), rnd = azar(31);
  const punto = (x, z) => {
    const r = Math.hypot(x, z);
    let h = Math.max(0, ((alturaM(x, z) ?? base) - base) / m) * TERRENO_V + GROSOR;
    h += (hc - h) * (1 - suave(0.3, 0.52, r)); // plataforma nivelada bajo la obra
    h = GROSOR * 0.5 + (h - GROSOR * 0.5) * (1 - suave(0.5 * R, R, r)); // orilla que se funde con el mapa
    pos.push(x, h, z);
    c.copy(c0).multiplyScalar(0.9 + rnd() * 0.16);
    col.push(c.r, c.g, c.b);
  };
  punto(0, 0);
  for (let i = 1; i <= anillos; i++) for (let j = 0; j < sectores; j++) {
    const a = (j / sectores) * Math.PI * 2, r = (i / anillos) * R;
    punto(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let j = 0; j < sectores; j++) idx.push(0, 1 + ((j + 1) % sectores), 1 + j);
  for (let i = 1; i < anillos; i++) for (let j = 0; j < sectores; j++) {
    const a = 1 + (i - 1) * sectores + j, b = 1 + (i - 1) * sectores + ((j + 1) % sectores);
    const a2 = a + sectores, b2 = b + sectores;
    idx.push(a, b, a2, b, b2, a2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  matTerreno ??= materialAtlas({ rayado: 60, fuerza: 0.3, luzRef: 0.95 });
  const malla = new THREE.Mesh(geo, matTerreno);
  malla.castShadow = true; malla.receiveShadow = true;
  return { malla, hc };
}

function armar(def, escala, id = '') {
  MAT ??= crearMateriales();
  const k = new Kit();
  def.f(k);
  const g = k.grupo();
  g.rotation.y = giro(def.A ?? 180);
  const ext = new THREE.Group();
  ext.add(g);
  ext.rotation.x = Math.PI / 2; // y local (arriba) → z del mapa
  ext.scale.setScalar(escala);
  // terreno real (si hay datos): se agrega cuando llega y la obra se sube a la altura de su plataforma
  ext.userData.listo = def.terreno
    ? cargarDEM('sitio-' + id).then((dem) => {
      if (!dem) return;
      const { malla, hc } = terrenoReal(dem, def.terreno, def.m);
      ext.add(malla);
      g.position.y = hc;
    })
    : Promise.resolve();
  return ext;
}

// Maqueta de un sitio de Historia (huella ≈ 0.0095 unidades del mapa; en el centro del país hay diez muy juntos), o null si no hay modelo
// Escala: la huella crece con la raíz cuadrada del tamaño real (m), así un sitio más grande se ve más
// grande (Pirámide del Sol > Templo Mayor > Pirámide B de Tula) sin que los chicos desaparezcan
// ni los grandes tapen a sus vecinos. Exageración respecto al mapa: ≈ ×20 000–40 000.
export const escalaSitio = (m) => Math.min(0.0125, Math.max(0.0062, 0.0095 * Math.sqrt(m / 150)));
// escala de la maqueta de un sitio (para separar las que se enciman en el mapa)
export const radioSitio = (id) => escalaSitio(SITIOS[id]?.m ?? 150);
export function modeloSitio(id) { return SITIOS[id] ? armar(SITIOS[id], escalaSitio(SITIOS[id].m ?? 150), id) : null; }
// Maqueta de una maravilla (huella ≈ 0.016 unidades del mapa), o null
export function modeloMaravilla(id) { return MARAVILLAS[id] ? armar(MARAVILLAS[id], 0.016) : null; }
export const SITIOS_CON_MODELO = Object.keys(SITIOS);
export const MARAVILLAS_CON_MODELO = Object.keys(MARAVILLAS);
