// Lector de miniSEED v2: el formato estándar en que las redes sismológicas
// del mundo guardan los registros de sus sismógrafos.
// Soporta compresión Steim1 / Steim2 y enteros sin comprimir.
//
// Cada registro trae: estación, canal, hora de inicio, frecuencia de muestreo
// y las muestras comprimidas como DIFERENCIAS entre muestras consecutivas
// (los sismogramas cambian poco de una muestra a otra: las diferencias
// ocupan menos bits). Para recuperar la señal se "integran" las diferencias.

function leerRegistro(dv, off) {
  // ¿big o little endian? El año debe ser razonable
  let le = false;
  const anioBE = dv.getUint16(off + 20, false);
  if (anioBE < 1900 || anioBE > 2100) le = true;
  const u16 = (o) => dv.getUint16(off + o, le);
  const i16 = (o) => dv.getInt16(off + o, le);

  const anio = u16(20), dia = u16(22);
  const h = dv.getUint8(off + 24), m = dv.getUint8(off + 25), s = dv.getUint8(off + 26);
  const frac = u16(28); // 1/10000 s
  const n = u16(30);
  const f = i16(32), mult = i16(34);
  let fs;
  if (f > 0 && mult > 0) fs = f * mult;
  else if (f > 0 && mult < 0) fs = -f / mult;
  else if (f < 0 && mult > 0) fs = -mult / f;
  else fs = 1 / (f * mult);
  const inicioDatos = u16(44);
  let blk = u16(46);
  let codificacion = 11, largo = 512, orden = 1;
  while (blk) {
    const tipo = dv.getUint16(off + blk, le);
    if (tipo === 1000) {
      codificacion = dv.getUint8(off + blk + 4);
      orden = dv.getUint8(off + blk + 5);
      largo = 2 ** dv.getUint8(off + blk + 6);
    }
    const sig = dv.getUint16(off + blk + 2, le);
    if (!sig || sig === blk) break;
    blk = sig;
  }
  const t0 = Date.UTC(anio, 0, 1, h, m, s) + (dia - 1) * 86400000 + frac / 10;
  const datosLE = orden === 0;
  return { t0, fs, n, codificacion, largo, inicio: off + inicioDatos, fin: off + largo, datosLE };
}

function steim(dv, ini, fin, n, version, le) {
  const out = new Int32Array(n);
  const dif = [];
  let x0 = 0;
  const firm = (v, bits) => (v << (32 - bits)) >> (32 - bits);
  for (let marco = ini; marco + 64 <= fin && dif.length < n; marco += 64) {
    const control = dv.getUint32(marco, le);
    for (let w = 1; w < 16; w++) {
      const c = (control >>> (30 - 2 * w)) & 3;
      const pos = marco + 4 * w;
      if (marco === ini && w === 1) { x0 = dv.getInt32(pos, le); continue; }
      if (marco === ini && w === 2) continue; // xn: valor final (verificación)
      if (c === 0) continue;
      if (c === 1) { for (let k = 0; k < 4; k++) dif.push(dv.getInt8(pos + k)); continue; }
      const v = dv.getUint32(pos, le);
      if (version === 1) {
        if (c === 2) { dif.push(dv.getInt16(pos, le), dv.getInt16(pos + 2, le)); }
        else dif.push(dv.getInt32(pos, le));
        continue;
      }
      const dnib = v >>> 30;
      if (c === 2) {
        if (dnib === 1) dif.push(firm(v & 0x3fffffff, 30));
        else if (dnib === 2) { for (let k = 1; k >= 0; k--) dif.push(firm((v >>> (15 * k)) & 0x7fff, 15)); }
        else if (dnib === 3) { for (let k = 2; k >= 0; k--) dif.push(firm((v >>> (10 * k)) & 0x3ff, 10)); }
      } else {
        if (dnib === 0) { for (let k = 4; k >= 0; k--) dif.push(firm((v >>> (6 * k)) & 0x3f, 6)); }
        else if (dnib === 1) { for (let k = 5; k >= 0; k--) dif.push(firm((v >>> (5 * k)) & 0x1f, 5)); }
        else if (dnib === 2) { for (let k = 6; k >= 0; k--) dif.push(firm((v >>> (4 * k)) & 0xf, 4)); }
      }
    }
  }
  // integrar: la primera muestra es X0; cada siguiente = anterior + diferencia
  out[0] = x0;
  for (let i = 1; i < n; i++) out[i] = out[i - 1] + (dif[i] ?? 0);
  return out;
}

// Devuelve { fs, t0 (ms UTC), datos: Float32Array }
export function leerMiniSEED(buffer) {
  const dv = new DataView(buffer);
  const regs = [];
  let off = 0;
  while (off + 64 <= buffer.byteLength) {
    const r = leerRegistro(dv, off);
    let muestras;
    if (r.codificacion === 10 || r.codificacion === 11) muestras = steim(dv, r.inicio, r.fin, r.n, r.codificacion === 10 ? 1 : 2, r.datosLE);
    else if (r.codificacion === 3) muestras = Int32Array.from({ length: r.n }, (_, i) => dv.getInt32(r.inicio + 4 * i, r.datosLE));
    else if (r.codificacion === 1) muestras = Int32Array.from({ length: r.n }, (_, i) => dv.getInt16(r.inicio + 2 * i, r.datosLE));
    else throw new Error('Codificación miniSEED no soportada: ' + r.codificacion);
    regs.push({ ...r, muestras });
    off += r.largo;
  }
  regs.sort((a, b) => a.t0 - b.t0);
  const fs = regs[0].fs, t0 = regs[0].t0;
  const total = Math.round(((regs.at(-1).t0 - t0) / 1000) * fs) + regs.at(-1).n;
  const datos = new Float32Array(total);
  for (const r of regs) {
    const i0 = Math.round(((r.t0 - t0) / 1000) * fs);
    datos.set(r.muestras.subarray(0, Math.min(r.n, total - i0)), i0);
  }
  // quitar la media (offset del instrumento)
  let media = 0;
  for (const v of datos) media += v;
  media /= datos.length;
  for (let i = 0; i < datos.length; i++) datos[i] -= media;
  return { fs, t0, datos };
}
