# México Vivo — Mapa interactivo de realidad aumentada

Prototipo para el **26.º Concurso de Creatividad e Ingenio** (Museo El Rehilete).
Línea temática: **Exploración Científica y Realidades Extendidas (VR/AR)**, con apoyo de *Ciencias Integradas* y *Sostenibilidad*.

Es un mapa 3D de México que aparece sobre un mapa impreso al verlo con la cámara. El usuario puede:

| Capa | Qué hace el usuario | Ciencia que demuestra |
|---|---|---|
| 🗺️ Estados | Toca estados y ve datos | Geografía; contexto de Hidalgo |
| 📈 Sismos | Elige epicentro, magnitud y profundidad, y simula | Ondas P y S, velocidad = d/t, escala logarítmica de energía, atenuación de la intensidad, alerta temprana (ondas de radio contra ondas sísmicas), subducción |
| 🌋 Volcanes | Provoca erupciones y ve fumarolas | Origen del Eje Neovolcánico (fusión del manto por el agua de la placa que se hunde), prismas basálticos (contracción térmica) |
| 🦋 Biodiversidad | Escucha el paisaje sonoro de cada ecosistema | Biomas, endemismo, especies en riesgo; física del sonido (síntesis) |
| 🌦️ Clima en vivo | Ve el clima real de las 32 capitales | Gradiente térmico vertical: **mide con datos reales** cuántos °C baja la temperatura por km de altura (regresión lineal) |
| 🏆 Reto | Responde preguntas | Repaso con explicación |
| 📊 Evaluación | Prueba de 4 preguntas ANTES y DESPUÉS de explorar | Mide si el prototipo enseña (ganancia de Hake, exporta CSV) |

**Funciones didácticas añadidas tras la auditoría:**
- **Predecir → observar → explicar:** antes de simular, el visitante apuesta cuántos segundos de aviso tendrá su ciudad, y luego ve el cálculo.
- **Ver bajo la superficie:** la placa de Cocos en 3D bajo el mapa (profundidad ×4), con el hipocentro y los frentes de onda. Es la razón de ser de la AR.
- **Clima:** regresión múltiple (altitud + latitud) con la temperatura media de ayer.
- **Modo sencillo (Aa):** menos texto y botones grandes para niños.
- **Panel plegable:** en AR se pliega solo. Si la cámara pierde el mapa, el modelo se queda fijo 2.5 s.
- **Aviso permanente** de que es una simulación educativa, y una sección «Límites del modelo».

**Datos reales, sentidos y juego:**
- **Escucha un sismo real:** 5 sismogramas reales de la estación G.UNM (CU, UNAM) en `assets/sismos/*.mseed`, descargados del servicio FDSN de EarthScope. Los lee `js/miniseed.js` (descompresión Steim2) y los sonifica `js/sismograma.js` a ×100, ×200 o ×400. La onda P se detecta con STA/LTA. **Validación:** el modelo acierta la P con ±1 s hasta 400 km (Puebla 2017, Acapulco 2021, Michoacán 2022); más lejos falla porque la onda viaja por el manto (Pn).
- **Haz tu propio sismo (`js/sensor.js`):** usa el acelerómetro en tablet y el micrófono en laptop, con detección STA/LTA. En iPhone pide permiso de movimiento. **No se pudo probar en el navegador de desarrollo: pruébenlo en una tablet real.**
- **Simulacro:** agáchate, cúbrete, sujétate, con opciones incorrectas que explican por qué lo son, y el tiempo de reacción contra el tiempo de aviso.
- **Axo el ajolote (`js/guia.js`):** pistas por capa en un globo de texto y un pasaporte de 9 misiones. Usen el botón «Nuevo visitante» para reiniciarlo con cada persona.
- **Sonidos reales:** 8 grabaciones de Wikimedia Commons con licencia libre verificada (CC0, CC BY, CC BY-SA y dominio público), en `assets/sonidos/`, con autor y licencia en `sonidos.json`. La app los muestra en «Créditos». El desierto, el manatí, la vaquita y el flamenco usan sonido sintetizado porque no hubo grabación libre de la especie correcta.

Para actualizar los sismogramas o agregar otro (estación G.UNM, canal BHZ, empezando 60 s antes del origen):
```powershell
curl.exe -L -o assets/sismos/nuevo.mseed "https://service.earthscope.org/fdsnws/dataselect/1/query?net=G&sta=UNM&loc=00&cha=BHZ&start=2022-09-19T18:04:06&end=2022-09-19T18:19:06"
```
y agréguenlo a `SISMOS_HISTORICOS` en `js/datos.js` con `origen` y `archivo`.

Datos en tiempo real: **Open-Meteo** (clima) y **USGS** (sismos de los últimos 30 días). Si no hay internet, usa el último dato guardado o promedios de respaldo.

---

## Cómo correrlo

### En la laptop (recomendado para la presentación)
1. Abre PowerShell en esta carpeta y ejecuta:
   ```powershell
   powershell -ExecutionPolicy Bypass -File servidor.ps1
   ```
2. Abre **http://localhost:8080** en Chrome o Edge.
3. La AR funciona con la webcam de la laptop (en `localhost` el navegador permite usar la cámara).

### En celular o tablet
El navegador del teléfono solo permite usar la cámara con **https**. Opciones gratuitas:
- **GitHub Pages:** sube la carpeta a un repositorio, ve a Settings → Pages → Deploy from branch, y te da una URL `https://…github.io/…`.
- **Netlify Drop** (app.netlify.com/drop): arrastra la carpeta y te da un enlace https al instante.

Funciona en Android (Chrome) y iPhone (Safari).

### Marcador impreso
Abre `marcador.html` → **Imprimir** (carta horizontal o más grande, a color y en papel mate). Pégalo en cartón o MDF.
`assets/marcador.mind` ya viene generado. Si cambias el diseño del marcador, bórralo y la app lo recalcula sola.

### Controles
- Arrastra para girar, rueda o pellizco para zoom, toca para seleccionar.
- Teclas **1–5**: cambiar de capa · **Espacio**: simular sismo · **Esc**: cerrar ficha.

---

## Guion de demostración (5–7 min)

1. **Gancho (30 s):** «¿Sabían que en Pachuca tendríamos cerca de 90 segundos de aviso si temblara en Acapulco? Vamos a comprobarlo.»
2. **AR (1 min):** apuntar la tablet al mapa impreso; el país se levanta en 3D. Mostrar Hidalgo y el museo.
3. **Sismos (2 min):** capa Sismos → tocar la costa de Guerrero → Simular. Explicar:
   - las ondas P (azul) llegan antes que las S (roja): **6.5 contra 3.6 km/s**;
   - la alerta viaja por radio a la velocidad de la luz;
   - la tabla de tiempo de aviso por ciudad y el corte de la subducción.
   Luego reproducir **Puebla 2017**: está tan cerca que casi no hubo aviso.
4. **Volcanes (1 min):** erupción del Popocatépetl. Explicar por qué los volcanes están ahí (la placa que se hunde libera agua y funde el manto). Mostrar los Prismas Basálticos de Hidalgo.
5. **Clima en vivo (1 min):** «Estos datos son de hace minutos». Mostrar la gráfica de altitud contra temperatura: la pendiente medida se parece a −6.5 °C/km.
6. **Biodiversidad (30 s):** tocar Chiapas y escuchar la selva.
7. **Cierre:** invitar al jurado a hacer el Reto.

## Preguntas probables del jurado
- **¿Cómo calculan la intensidad?** Con una ley de atenuación simplificada: I = 2.7 + 1.5M − 3·log₁₀(R), +1 en la CDMX por el suelo lacustre. Es didáctica, no oficial.
- **¿Por qué la magnitud es logarítmica?** log₁₀E = 1.5M + 4.8: cada punto equivale a unas 32 veces más energía.
- **¿Cómo se sabe la distancia con S−P?** d = Δt / (1/v_S − 1/v_P).
- **¿Cómo funciona la AR?** MindAR detecta puntos característicos (esquinas y texturas) del mapa impreso, calcula la pose de la cámara en cada cuadro (homografía) y dibuja el modelo 3D con Three.js en esa posición.
- **¿Cómo hacen los sonidos?** Con la Web Audio API: ruido filtrado (viento, olas, retumbo), osciladores con modulación (aves, ranas, insectos) y paneo estéreo según la posición en el mapa.
- **¿Qué es aportación propia?** El diseño didáctico, el modelo físico de propagación y de alerta, la integración de los datos en vivo, el marcador, los paisajes sonoros y la interfaz. Las librerías (Three.js, MindAR) son herramientas.

## Estructura
```
index.html          interfaz
marcador.html       mapa imprimible + generador del .mind
servidor.ps1        servidor local sin instalar nada
js/app.js           lógica de la interfaz
js/mapa3d.js        construcción del mapa 3D (Three.js)
js/sismo.js         simulador de ondas y alerta + corte de subducción
js/apis.js          Open-Meteo y USGS (+ caché sin conexión)
js/audio.js         sonido sintetizado (Web Audio API)
js/ar.js            realidad aumentada (MindAR)
js/marcador.js      generador del marcador impreso
js/datos.js         datos científicos (editar aquí)
js/geo.js           proyección y geometría
data/               límites estatales (GeoJSON)
vendor/             Three.js 0.160 y MindAR 1.2.5 (funciona sin internet)
```

## Protocolo de pruebas (llenar con resultados reales; no inventar)

| Prueba | Cómo se hace | Criterio de aceptación | Resultado |
|---|---|---|---|
| AR en laptop | Webcam + marcador impreso, luz normal | Detecta en < 3 s y no tiembla al mover el papel | |
| AR en tablet | Igual, a 40–60 cm | Igual, ≥ 24 FPS (ver con `chrome://inspect` o a ojo) | |
| AR con poca luz / reflejos | Lámpara de lado, papel inclinado | Recupera el mapa en < 3 s | |
| Toque en AR | Tocar 5 estados distintos en AR | Se abre la ficha correcta 5 de 5 | |
| Sin internet | Modo avión, recargar | Abre; clima en «respaldo»; USGS dice «no disponible» | |
| Simulador | Sismo Acapulco M7.4, 20 km, escuchar Pachuca | Aviso ≈ 91 s, CDMX ≈ 68 s | |
| Evaluación | 15+ visitantes antes/después | CSV exportado y resultados en el documento | |
| Sesión larga | Dejarla 1 h cambiando capas | Sin congelarse ni alentarse | |

## Antes de presentar (checklist)
- [ ] Revisar con su asesor los datos de `js/datos.js` (son aproximados) y citar las fuentes.
- [ ] Probar la AR con la iluminación del museo y llevar una lámpara por si acaso.
- [ ] Llevar laptop, tablet, cargadores, extensión eléctrica y el marcador impreso más uno de repuesto.
- [ ] Grabar un video de respaldo de la demo.
- [ ] Declarar en el documento técnico el uso de IA generativa: para qué se usó y qué aportó el equipo (lo pide la convocatoria).

## Fuentes sugeridas para la bibliografía
- Servicio Sismológico Nacional (SSN-UNAM): www.ssn.unam.mx
- CIRES, Sistema de Alerta Sísmica Mexicano: www.cires.org.mx
- CENAPRED, monitoreo volcánico: www.gob.mx/cenapred
- CONABIO, biodiversidad mexicana: www.biodiversidad.gob.mx
- Smithsonian Global Volcanism Program: volcano.si.edu
- USGS Earthquake Catalog: earthquake.usgs.gov
- Open-Meteo: open-meteo.com
- INEGI, Marco Geoestadístico. Límites estatales del repositorio `angelnmara/geojson` (GitHub).

Librerías: Three.js (MIT), MindAR (MIT).

## Novedades: relieve real, cultura y más sonidos
- **Relieve real de 6 volcanes** (Popocatépetl–Iztaccíhuatl, Pico de Orizaba, Colima, Nevado de Toluca, Paricutín, La Malinche): en Volcanes, toca uno y elige «Explorar su relieve real». El modelo 3D se construye con miles de mediciones de elevación de **Terrain Tiles** (AWS Open Data: SRTM, GMTED y otros). Tiene pisos de vegetación por altitud, control de exageración vertical y erupción. Para regenerar o agregar volcanes:
  ```powershell
  powershell -ExecutionPolicy Bypass -File herramientas\relieve.ps1 -Id orizaba -Lat 19.03 -Lon -97.27 -Medio 0.13 -N 61
  ```
- **Volcanes del mapa rediseñados:** perfil cóncavo, cráter, barrancas y colores por altitud (bosque, roca y nieve).
- **Capa 6 · Cultura e historia:** línea del tiempo de 1500 a.C. a hoy. Los sitios de cada época se encienden en el mapa (26 lugares: zonas arqueológicas, ciudades virreinales e historia moderna, con énfasis en Hidalgo: Tula, Real del Monte, Acueducto del Padre Tembleque y Pachuca). Cada estado muestra su platillo, artesanía y tradición, y algunos suenan con su música (marimba, son jarocho, son huasteco).
- **12 misiones** en el pasaporte, incluidas «Conoce a los Atlantes» y «Viaja a 1325».
- **Más sonidos (opcionales):** `sonidos.json` trae 9 grabaciones nuevas con su enlace de descarga y licencia. La app usa las que encuentre en `assets/sonidos/`.
