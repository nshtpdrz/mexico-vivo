// Auditoría de interfaz para pegar en la consola del navegador (o ejecutar
// desde las pruebas). Revisa, en el tamaño de pantalla actual:
//  · desbordes horizontales de la página y de elementos visibles;
//  · botones y controles demasiado pequeños para el dedo (< 36 px);
//  · elementos fijos que se enciman (encabezado, guía, leyenda, panel, ficha…);
//  · textos cortados (contenido más ancho que su caja con overflow oculto).
// Devuelve un objeto con los problemas encontrados.
window.auditarUI = function auditarUI() {
  const W = innerWidth, H = innerHeight;
  const visible = (el) => {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const nombre = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + (el.textContent ? ` «${el.textContent.trim().slice(0, 24)}»` : '');
  const res = { tam: `${W}x${H}`, paginaDesborda: document.documentElement.scrollWidth > W + 1, fueraDePantalla: [], pequenos: [], encimados: [], cortados: [] };

  // dentro de contenedores con desplazamiento horizontal propio no cuenta
  const enScrollX = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true; } return false; };
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.closest('canvas, svg, #vista, .mindar-ui-overlay')) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !enScrollX(el) && getComputedStyle(el).position !== 'fixed') res.fueraDePantalla.push(nombre(el));
    if (el.matches('button, select, input:not([type=range]):not([type=checkbox]), [role=tab], summary') && !el.closest('.lt-marcas')) {
      if (r.height < 36 || r.width < 36) res.pequenos.push(`${nombre(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && el.textContent.trim()) res.cortados.push(nombre(el));
  }
  const fijos = ['header', '#btn-panel', '.axo-cara', '.axo-globo', '#leyenda', '#panel', '.recorrido', '#alerta-banner']
    .flatMap((s) => [...document.querySelectorAll(s)]).filter(visible);
  const toca = (a, b) => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return x.left < y.right - 2 && x.right > y.left + 2 && x.top < y.bottom - 2 && x.bottom > y.top + 2; };
  for (let i = 0; i < fijos.length; i++) for (let j = i + 1; j < fijos.length; j++) {
    const a = fijos[i], b = fijos[j];
    if (a.contains(b) || b.contains(a)) continue;
    if (toca(a, b)) res.encimados.push(`${nombre(a).split(' «')[0]} × ${nombre(b).split(' «')[0]}`);
  }
  res.fueraDePantalla = [...new Set(res.fueraDePantalla)].slice(0, 15);
  res.pequenos = [...new Set(res.pequenos)].slice(0, 25);
  res.cortados = [...new Set(res.cortados)].slice(0, 15);
  return res;
};
