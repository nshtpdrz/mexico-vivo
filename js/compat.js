// Compatibilidad con navegadores viejos (p. ej. Safari de un iPad sin actualizar).
// Script clásico: se carga ANTES que los módulos de la app.
//  · Array.prototype.at (Safari 15.4) y CanvasRenderingContext2D.roundRect (Safari 16), que la app usa.
//  · Si en 10 s la app no logró arrancar (navegador demasiado viejo para sus módulos), muestra un
//    aviso claro en la portada en lugar de dejarla a medias.
(function () {
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      value: function (n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; },
      writable: true, configurable: true,
    });
  }
  if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      var rr = Array.isArray(r) ? r[0] : r || 0;
      rr = Math.max(0, Math.min(rr, Math.abs(w) / 2, Math.abs(h) / 2));
      this.moveTo(x + rr, y);
      this.lineTo(x + w - rr, y); this.quadraticCurveTo(x + w, y, x + w, y + rr);
      this.lineTo(x + w, y + h - rr); this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      this.lineTo(x + rr, y + h); this.quadraticCurveTo(x, y + h, x, y + h - rr);
      this.lineTo(x, y + rr); this.quadraticCurveTo(x, y, x + rr, y);
      this.closePath();
      return this;
    };
  }
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (window.__mvListo) return;
      var p = document.createElement('p');
      p.className = 'aviso-navegador';
      p.textContent = 'Este navegador es demasiado antiguo para mostrar el mapa 3D. Actualiza el sistema (Ajustes › General › Actualización de software) o abre la página en otro navegador actualizado.';
      var c = document.querySelector('.inicio-cont') || document.body;
      c.appendChild(p);
    }, 10000);
  });
})();
