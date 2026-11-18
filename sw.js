// Service worker de México Vivo: hace que la app funcione SIN INTERNET.
// - Al instalarse guarda la app completa (código, datos, relieve, sismogramas,
//   tipografías y sonidos pequeños).
// - Los audios grandes (música, selva) se guardan la primera vez que suenan.
// - Para el código usa «primero la copia guardada y en segundo plano actualiza»:
//   abre al instante y la siguiente visita trae la versión nueva.
// - Las APIs externas (clima, USGS) no pasan por aquí: la app ya guarda su
//   último dato con fecha en el navegador.
const VERSION = 'mexico-vivo-v6';
const PRECARGA = [
  './',
  'manifest.webmanifest',
  'icono.svg',
  'assets/marcador.mind',
  'assets/sismos/acapulco2021.mseed',
  'assets/sismos/chiapas2017.mseed',
  'assets/sismos/michoacan2022.mseed',
  'assets/sismos/oaxaca2020.mseed',
  'assets/sismos/puebla2017.mseed',
  'assets/sonidos/ballena-jorobada.mp3',
  'assets/sonidos/carpintero-bellotero.mp3',
  'assets/sonidos/chara-yucateca.mp3',
  'assets/sonidos/guacamaya-roja.mp3',
  'assets/sonidos/jaguar.mp3',
  'assets/sonidos/lobo.mp3',
  'assets/sonidos/mono-aullador.mp3',
  'assets/sonidos/popocatepetl-pronunciacion.mp3',
  'assets/sonidos/quetzal.mp3',
  'assets/sonidos/rio-san-pedro.mp3',
  'assets/sonidos/sonidos.json',
  'assets/sonidos/truenos-lluvia.mp3',
  'assets/sonidos/tucan.mp3',
  'css/estilo.css',
  'data/mexico-estados.js',
  'data/relieve/colima.json',
  'data/relieve/malinche.json',
  'data/relieve/orizaba.json',
  'data/relieve/paricutin.json',
  'data/relieve/popo-izta.json',
  'data/relieve/toluca.json',
  'fonts/fuentes.css',
  'fonts/inter-latin-ext.woff2',
  'fonts/inter-latin.woff2',
  'fonts/spacegrotesk-latin-ext.woff2',
  'fonts/spacegrotesk-latin.woff2',
  'index.html',
  'js/apis.js',
  'js/app.js',
  'js/ar.js',
  'js/audio.js',
  'js/cultura.js',
  'js/datos.js',
  'js/evaluacion.js',
  'js/geo.js',
  'js/guia.js',
  'js/mapa3d.js',
  'js/marcador.js',
  'js/miniseed.js',
  'js/sensor.js',
  'js/sismo.js',
  'js/recorrido.js',
  'js/lenguas.js',
  'js/sabores.js',
  'js/sismograma.js',
  'js/tsunami.js',
  'js/volcan3d.js',
  'marcador.html',
  'vendor/mindar/controller-mGt1s8dJ.js',
  'vendor/mindar/mindar-image-three.prod.js',
  'vendor/mindar/mindar-image.prod.js',
  'vendor/mindar/ui-fBadYuor.js',
  'vendor/three/addons/controls/OrbitControls.js',
  'vendor/three/addons/renderers/CSS3DRenderer.js',
  'vendor/three/three.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // APIs externas: directo a la red
  if (req.method === 'HEAD') {
    e.respondWith(caches.match(req, { ignoreMethod: true, ignoreSearch: true })
      .then((r) => (r ? new Response(null, { status: 200, headers: r.headers }) : fetch(req))));
    return;
  }
  if (req.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const guardada = await cache.match(req, { ignoreSearch: true });
    const red = fetch(req).then((r) => {
      if (r.ok && r.type === 'basic') cache.put(req, r.clone());
      return r;
    }).catch(() => null);
    if (guardada) { e.waitUntil(red); return guardada; }
    const r = await red;
    return r || new Response('Sin conexión y sin copia guardada de este archivo.', { status: 503 });
  }));
});
