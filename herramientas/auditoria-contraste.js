// Auditoría de contraste (WCAG 2.2 · 1.4.3). Cárgalo en la consola y llama auditarContraste().
// Recorre los textos visibles, calcula el color de fondo efectivo subiendo por los ancestros
// y devuelve los que no llegan a 4.5:1 (3:1 si el texto es grande).
window.auditarContraste = function (limite = 50, minimo = 4.5) {
  const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mezcla = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  const fondoDe = (el) => {
    const capas = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('gradient')) return { r: 247, g: 241, b: 228, a: 1, img: true };
      const c = rgb(cs.backgroundColor);
      if (c && c.a > 0) { capas.push(c); if (c.a >= 0.99) break; }
    }
    let base = { r: 243, g: 236, b: 221, a: 1 };
    for (let i = capas.length - 1; i >= 0; i--) base = mezcla(capas[i], base);
    return base;
  };
  const malos = new Map();
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  for (const el of document.querySelectorAll('body *:not(script):not(style):not(canvas):not(svg *)')) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!txt || !vis(el)) continue;
    if (el.closest('[hidden]')) continue;
    const cs = getComputedStyle(el);
    const c = rgb(cs.color); if (!c) continue;
    const bg = fondoDe(el);
    let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity;
    if (op < 0.05) continue; // oculto por un ancestro (p. ej. una capa que no está activa)
    const col = (c.a * op) < 1 ? mezcla({ ...c, a: c.a * op }, bg) : c;
    const L1 = lum(col), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (grande ? Math.max(3, minimo - 1.5) : minimo)) {
      const clave = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
      if (!malos.has(clave)) malos.set(clave, { selector: clave, ratio: +ratio.toFixed(2), color: cs.color, fondo: `rgb(${bg.r | 0},${bg.g | 0},${bg.b | 0})`, ejemplo: txt.slice(0, 50), padre: el.parentElement?.className || '' });
    }
  }
  return [...malos.values()].sort((a, b) => a.ratio - b.ratio).slice(0, limite);
};
