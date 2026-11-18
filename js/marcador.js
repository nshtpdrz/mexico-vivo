// Genera la imagen del mapa impreso que funciona como marcador de realidad aumentada.
// Es determinista (misma semilla → misma imagen): la imagen impresa y la que
// "aprende" el detector AR siempre coinciden.
import { proyectar, prepararEstados, semilla, MARCADOR_ASPECTO } from './geo.js';
import { ESTADOS, REGIONES } from './datos.js';

export const MARCADOR_ANCHO = 1600;
export const MARCADOR_ALTO = Math.round(1600 * MARCADOR_ASPECTO);

export function dibujarMarcador(canvas, ancho = MARCADOR_ANCHO) {
  const W = ancho;
  const H = Math.round(W * MARCADOR_ASPECTO);
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const rnd = semilla(2026);
  const k = W / 1600;
  const P = (lon, lat) => {
    const [x, y] = proyectar(lon, lat);
    return [W / 2 + x * W, H / 2 - y * W];
  };

  // Océano con textura: el detector AR necesita muchos "puntos de interés"
  c.fillStyle = '#e9e2cf';
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H, r = (2 + rnd() * 7) * k;
    c.fillStyle = rnd() > 0.5 ? 'rgba(40,70,90,0.22)' : 'rgba(120,90,40,0.18)';
    c.beginPath();
    const lados = 3 + Math.floor(rnd() * 4);
    const rot = rnd() * Math.PI;
    for (let j = 0; j < lados; j++) {
      const a = rot + (j / lados) * Math.PI * 2;
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.fill();
  }

  // Retícula de meridianos y paralelos
  c.strokeStyle = 'rgba(30,50,70,0.35)';
  c.lineWidth = 1.2 * k;
  c.font = `${13 * k}px sans-serif`;
  c.fillStyle = 'rgba(30,50,70,0.75)';
  for (let lon = -118; lon <= -86; lon += 2) {
    const [x1, y1] = P(lon, 13);
    const [x2, y2] = P(lon, 34);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    if (lon % 4 === 0) c.fillText(`${-lon}°O`, x1 + 3 * k, H - 30 * k);
  }
  for (let lat = 14; lat <= 33; lat += 2) {
    const [x1, y1] = P(-120, lat);
    const [x2, y2] = P(-84, lat);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.fillText(`${lat}°N`, 30 * k, y1 - 3 * k);
  }

  // Estados
  const estados = prepararEstados(window.MX_GEO, 0.01);
  estados.forEach((e, idx) => {
    const info = ESTADOS[e.id];
    const color = REGIONES[info?.region]?.color || '#999';
    c.save();
    c.beginPath();
    e.poligonos.forEach((pol) => pol.forEach((anillo) => {
      anillo.forEach(([lon, lat], i) => {
        const [x, y] = P(lon, lat);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.closePath();
    }));
    c.fillStyle = color;
    c.fill('evenodd');
    // Textura irregular (manchas, cruces, triángulos al azar con semilla fija).
    // Evitamos rayas paralelas: los patrones repetitivos confunden al detector AR
    // porque muchos puntos se parecen entre sí y se emparejan mal.
    c.clip('evenodd');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    e.poligonos.forEach((pol) => pol[0].forEach(([lon, lat]) => {
      const [x, y] = P(lon, lat);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }));
    const n = Math.min(900, ((maxX - minX) * (maxY - minY)) / (260 * k * k));
    for (let i = 0; i < n; i++) {
      const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
      const r = (1.5 + rnd() * 5) * k;
      const claro = rnd() > 0.5;
      c.fillStyle = claro ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
      c.strokeStyle = c.fillStyle;
      c.lineWidth = 1.6 * k;
      const forma = rnd();
      c.beginPath();
      if (forma < 0.45) { c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      else if (forma < 0.75) {
        const a = rnd() * Math.PI;
        c.moveTo(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4);
        c.lineTo(x - Math.cos(a) * r * 1.4, y - Math.sin(a) * r * 1.4);
        c.moveTo(x - Math.sin(a) * r, y + Math.cos(a) * r);
        c.lineTo(x + Math.sin(a) * r, y - Math.cos(a) * r);
        c.stroke();
      } else {
        const a = rnd() * Math.PI * 2;
        for (let j = 0; j < 3; j++) c.lineTo(x + Math.cos(a + j * 2.09) * r * 1.3, y + Math.sin(a + j * 2.09) * r * 1.3);
        c.fill();
      }
    }
    c.restore();
    // borde
    c.beginPath();
    e.poligonos.forEach((pol) => pol.forEach((anillo) => {
      anillo.forEach(([lon, lat], i) => {
        const [x, y] = P(lon, lat);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.closePath();
    }));
    c.strokeStyle = '#1b1b1b';
    c.lineWidth = 2.2 * k;
    c.stroke();
  });

  // Abreviaturas de estados
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  estados.forEach((e) => {
    const info = ESTADOS[e.id];
    if (!info) return;
    const [x, y] = P(info.lon, info.lat);
    const abrev = e.id.replace('MX-', '');
    c.font = `bold ${15 * k}px sans-serif`;
    c.lineWidth = 4 * k;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.strokeText(abrev, x, y);
    c.fillStyle = '#111';
    c.fillText(abrev, x, y);
  });

  // Rosa de los vientos
  const [rx, ry] = [W * 0.86, H * 0.2];
  c.save();
  c.translate(rx, ry);
  for (let i = 0; i < 8; i++) {
    c.rotate(Math.PI / 4);
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(9 * k, -14 * k); c.lineTo(0, (i % 2 ? -38 : -62) * k); c.closePath();
    c.fillStyle = i % 2 ? '#3a3a3a' : '#9b2d20';
    c.fill();
  }
  c.fillStyle = '#111';
  c.font = `bold ${22 * k}px sans-serif`;
  c.fillText('N', 0, -80 * k);
  c.restore();

  // Título y escala
  c.textAlign = 'left';
  c.fillStyle = '#111';
  c.font = `900 ${54 * k}px sans-serif`;
  c.fillText('MÉXICO VIVO', 70 * k, H * 0.86);
  c.font = `${20 * k}px sans-serif`;
  c.fillText('Mapa interactivo de realidad aumentada', 72 * k, H * 0.86 + 42 * k);
  const km500 = (500 / 3626) * W;
  const [sx, sy] = [W * 0.62, H * 0.9];
  for (let i = 0; i < 5; i++) {
    c.fillStyle = i % 2 ? '#fff' : '#111';
    c.fillRect(sx + (i * km500) / 5, sy, km500 / 5, 10 * k);
  }
  c.strokeStyle = '#111';
  c.strokeRect(sx, sy, km500, 10 * k);
  c.fillStyle = '#111';
  c.font = `${16 * k}px sans-serif`;
  c.fillText('0', sx - 4 * k, sy + 30 * k);
  c.fillText('500 km', sx + km500 - 20 * k, sy + 30 * k);

  // Marco con patrón asimétrico (ayuda a fijar la orientación)
  const m = 14 * k;
  c.fillStyle = '#111';
  c.fillRect(0, 0, W, m); c.fillRect(0, H - m, W, m); c.fillRect(0, 0, m, H); c.fillRect(W - m, 0, m, H);
  for (let x = m; x < W - m; x += 40 * k) {
    if (rnd() > 0.45) c.fillRect(x, m, 20 * k, 10 * k);
    if (rnd() > 0.45) c.fillRect(x, H - m - 10 * k, 20 * k, 10 * k);
  }
  for (let y = m; y < H - m; y += 40 * k) {
    if (rnd() > 0.45) c.fillRect(m, y, 10 * k, 20 * k);
    if (rnd() > 0.45) c.fillRect(W - m - 10 * k, y, 10 * k, 20 * k);
  }
  return canvas;
}
