// Fondo "de mesa" para la vista en pantalla (no AR).
// El marcador impreso (marcador.js) necesita mucha textura para que la cámara lo reconozca,
// pero en pantalla esa textura cansa la vista y compite con las capas. Aquí el mar es un
// solo tono tranquilo, con la plataforma continental como halo suave, una retícula apenas
// visible y un marco discreto. No cambia el marcador AR: solo la textura del tablero 3D.
import { proyectar, prepararEstados, MARCADOR_ASPECTO } from './geo.js';

export function dibujarMesa(canvas, ancho = 2048) {
  const W = ancho;
  const H = Math.round(W * MARCADOR_ASPECTO);
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const k = W / 1600;
  const P = (lon, lat) => {
    const [x, y] = proyectar(lon, lat);
    return [W / 2 + x * W, H / 2 - y * W];
  };

  // mar: un tono, con un claro muy suave al centro para llevar la vista al país
  const g = c.createRadialGradient(W * 0.48, H * 0.48, W * 0.05, W * 0.5, H * 0.5, W * 0.72);
  g.addColorStop(0, '#9aa6ae');
  g.addColorStop(1, '#6f7b82');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // plataforma continental: halos claros alrededor de la costa (sin dibujar la tierra encima)
  const estados = prepararEstados(window.MX_GEO, 0.01);
  const trazarTierra = () => {
    c.beginPath();
    estados.forEach((e) => e.poligonos.forEach((pol) => {
      pol[0].forEach(([lon, lat], i) => { const [x, y] = P(lon, lat); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath();
    }));
  };
  c.lineJoin = 'round';
  for (const [ancho, alfa] of [[46, 0.05], [30, 0.06], [16, 0.08]]) {
    trazarTierra();
    c.strokeStyle = `rgba(190,215,240,${alfa})`;
    c.lineWidth = ancho * k;
    c.stroke();
  }
  // retícula: cada 4°, casi invisible, con etiquetas al margen
  c.strokeStyle = 'rgba(225,235,250,0.07)';
  c.lineWidth = 1 * k;
  c.fillStyle = 'rgba(225,235,250,0.32)';
  c.font = `${12 * k}px sans-serif`;
  for (let lon = -116; lon <= -86; lon += 4) {
    const [x1, y1] = P(lon, 12), [x2, y2] = P(lon, 34);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.fillText(`${-lon}°O`, x1 + 4 * k, H - 22 * k);
  }
  for (let lat = 16; lat <= 32; lat += 4) {
    const [x1, y1] = P(-122, lat), [x2, y2] = P(-82, lat);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.fillText(`${lat}°N`, 18 * k, y1 - 4 * k);
  }

  // marco discreto
  c.strokeStyle = 'rgba(225,235,250,0.22)';
  c.lineWidth = 2 * k;
  c.strokeRect(10 * k, 10 * k, W - 20 * k, H - 20 * k);

  // rosa de los vientos pequeña y apagada
  const [rx, ry] = [W * 0.88, H * 0.18], r = 34 * k;
  c.save();
  c.translate(rx, ry);
  c.fillStyle = 'rgba(225,235,250,0.28)';
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.18, 0); c.lineTo(-r * 0.18, 0); c.closePath(); c.fill();
  }
  c.font = `600 ${15 * k}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('N', 0, -r - 8 * k);
  c.restore();
  return canvas;
}
