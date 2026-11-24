// =====================================================================
//  México Vivo — datos científicos
//  Todos los valores son aproximados y con fines didácticos.
//  Fuentes sugeridas para la bibliografía: SSN-UNAM, CENAPRED, CONABIO,
//  INEGI, Global Volcanism Program (Smithsonian), USGS, Open-Meteo.
// =====================================================================

export const REGIONES = {
  noroeste: { nombre: 'Noroeste', color: '#d98c4a' },
  norte: { nombre: 'Norte', color: '#c9a84a' },
  noreste: { nombre: 'Noreste', color: '#a8b44f' },
  occidente: { nombre: 'Occidente', color: '#5fae7c' },
  centro: { nombre: 'Centro', color: '#4fa3b4' },
  sur: { nombre: 'Sur', color: '#6b84c9' },
  golfo: { nombre: 'Golfo', color: '#8e6bc9' },
  peninsula: { nombre: 'Península de Yucatán', color: '#c96b9e' },
};

// Zona sísmica predominante (regionalización simplificada de la CFE):
// A = baja, B = moderada, C = alta, D = muy alta
export const ZONAS_SISMICAS = {
  A: { nombre: 'Zona A · baja', color: '#3d7d6a', altura: 0.006 },
  B: { nombre: 'Zona B · moderada', color: '#c6a43a', altura: 0.014 },
  C: { nombre: 'Zona C · alta', color: '#d9732f', altura: 0.026 },
  D: { nombre: 'Zona D · muy alta', color: '#d13b3b', altura: 0.042 },
};

export const BIOMAS = {
  desierto: {
    nombre: 'Desierto',
    color: '#d8b26a',
    sonido: 'desierto',
    texto: 'Lluvia menor a 250 mm al año. Las cactáceas guardan agua en sus tallos y abren sus estomas de noche (metabolismo CAM) para no perderla.',
  },
  semiarido: {
    nombre: 'Matorral semiárido',
    color: '#b9a35a',
    sonido: 'desierto',
    texto: 'Arbustos espinosos, magueyes y biznagas. México tiene la mayor diversidad de cactáceas del mundo: unas 670 especies, la mayoría endémicas.',
  },
  templado: {
    nombre: 'Bosque templado',
    color: '#4f9a5c',
    sonido: 'bosque',
    texto: 'Bosques de pino y encino en las sierras. México tiene cerca del 50 % de las especies de pino del mundo y más de 160 especies de encino.',
  },
  selvaSeca: {
    nombre: 'Selva seca',
    color: '#8bb04a',
    sonido: 'selvaSeca',
    texto: 'Pierde sus hojas en la temporada de secas para ahorrar agua. Es uno de los ecosistemas con más especies endémicas del país.',
  },
  selvaHumeda: {
    nombre: 'Selva húmeda',
    color: '#1f8a5a',
    sonido: 'selva',
    texto: 'Más de 2,000 mm de lluvia al año. Ocupa menos del 5 % del país pero alberga una parte enorme de su biodiversidad.',
  },
  humedal: {
    nombre: 'Humedales y costa',
    color: '#3f9bb0',
    sonido: 'humedal',
    texto: 'Manglares, pantanos y lagunas costeras. Filtran el agua, frenan huracanes y sirven de criadero a peces y aves.',
  },
};

// id del GeoJSON -> datos del estado
// zona: zona sísmica predominante · bioma: ecosistema dominante (simplificado)
export const ESTADOS = {
  'MX-AGU': { capital: 'Aguascalientes', lat: 21.88, lon: -102.29, region: 'centro', zona: 'B', bioma: 'semiarido', dato: 'Su nombre viene de los manantiales de aguas termales de la zona.' },
  'MX-BCN': { capital: 'Mexicali', lat: 32.62, lon: -115.45, region: 'noroeste', zona: 'D', bioma: 'desierto', dato: 'Está sobre la frontera entre las placas del Pacífico y Norteamericana. En Cerro Prieto se genera electricidad con calor de la Tierra (geotermia).' },
  'MX-BCS': { capital: 'La Paz', lat: 24.14, lon: -110.31, region: 'noroeste', zona: 'B', bioma: 'desierto', dato: 'La península viaja con la placa del Pacífico y se separa del continente unos 5 cm por año. Así se abrió el Golfo de California.' },
  'MX-CAM': { capital: 'Campeche', lat: 19.84, lon: -90.53, region: 'peninsula', zona: 'A', bioma: 'selvaHumeda', dato: 'Calakmul es la mayor reserva de selva tropical de México y Patrimonio Mixto de la Humanidad.' },
  'MX-CHP': { capital: 'Tuxtla Gutiérrez', lat: 16.75, lon: -93.12, region: 'sur', zona: 'D', bioma: 'selvaHumeda', dato: 'En 2017 su costa tuvo el sismo más fuerte registrado en México en un siglo: magnitud 8.2.' },
  'MX-CHH': { capital: 'Chihuahua', lat: 28.63, lon: -106.09, region: 'norte', zona: 'A', bioma: 'desierto', dato: 'Es el estado más grande. La Barranca del Cobre es más profunda que partes del Gran Cañón.' },
  'MX-CMX': { capital: 'Ciudad de México', lat: 19.43, lon: -99.13, region: 'centro', zona: 'B', bioma: 'templado', dato: 'Está sobre un antiguo lago: el suelo de arcilla blanda amplifica las ondas sísmicas hasta 50 veces.' },
  'MX-COA': { capital: 'Saltillo', lat: 25.42, lon: -101.0, region: 'noreste', zona: 'A', bioma: 'desierto', dato: 'En Cuatro Ciénegas, en pleno desierto, hay pozas con estromatolitos: estructuras vivas parecidas a las de la Tierra primitiva.' },
  'MX-COL': { capital: 'Colima', lat: 19.24, lon: -103.72, region: 'occidente', zona: 'D', bioma: 'selvaSeca', dato: 'El Volcán de Colima es uno de los más activos de Norteamérica.' },
  'MX-DUR': { capital: 'Durango', lat: 24.02, lon: -104.66, region: 'norte', zona: 'A', bioma: 'templado', dato: 'La Sierra Madre Occidental es una de las mayores provincias de rocas volcánicas del planeta.' },
  'MX-GUA': { capital: 'Guanajuato', lat: 21.02, lon: -101.26, region: 'centro', zona: 'B', bioma: 'semiarido', dato: 'Su riqueza en plata se formó cuando fluidos calientes depositaron minerales en las grietas de las rocas.' },
  'MX-GRO': { capital: 'Chilpancingo', lat: 17.55, lon: -99.5, region: 'sur', zona: 'D', bioma: 'selvaSeca', dato: 'La «Brecha de Guerrero» es un tramo de la costa que lleva más de 100 años sin un gran sismo y acumula energía.' },
  'MX-HID': { capital: 'Pachuca', lat: 20.1, lon: -98.76, region: 'centro', zona: 'B', bioma: 'templado', dato: 'Nuestro estado. El Geoparque Comarca Minera (UNESCO) y los Prismas Basálticos muestran millones de años de historia volcánica.' },
  'MX-JAL': { capital: 'Guadalajara', lat: 20.67, lon: -103.35, region: 'occidente', zona: 'C', bioma: 'templado', dato: 'Bajo su costa se hunde la pequeña placa de Rivera. En 1932 hubo ahí un sismo de magnitud 8.2.' },
  'MX-MEX': { capital: 'Toluca', lat: 19.29, lon: -99.66, region: 'centro', zona: 'B', bioma: 'templado', dato: 'El Nevado de Toluca tiene dos lagunas dentro de su cráter, a más de 4,000 m de altura.' },
  'MX-MIC': { capital: 'Morelia', lat: 19.7, lon: -101.19, region: 'occidente', zona: 'C', bioma: 'templado', dato: 'Millones de mariposas monarca invernan en sus bosques. En 1943 nació aquí el Paricutín, en medio de una milpa.' },
  'MX-MOR': { capital: 'Cuernavaca', lat: 18.92, lon: -99.23, region: 'centro', zona: 'C', bioma: 'selvaSeca', dato: 'A su capital, Cuernavaca, le dicen «la ciudad de la eterna primavera» por su clima templado casi todo el año.' },
  'MX-NAY': { capital: 'Tepic', lat: 21.5, lon: -104.89, region: 'occidente', zona: 'C', bioma: 'selvaSeca', dato: 'El volcán Ceboruco hizo erupción en 1870; aún se ven sus coladas de lava.' },
  'MX-NLE': { capital: 'Monterrey', lat: 25.69, lon: -100.32, region: 'noreste', zona: 'A', bioma: 'semiarido', dato: 'La Sierra Madre Oriental está hecha de capas de roca caliza de un antiguo mar, plegadas como una alfombra.' },
  'MX-OAX': { capital: 'Oaxaca', lat: 17.07, lon: -96.73, region: 'sur', zona: 'D', bioma: 'selvaSeca', dato: 'Es el estado con más biodiversidad de México: más de 12,000 especies de plantas.' },
  'MX-PUE': { capital: 'Puebla', lat: 19.04, lon: -98.21, region: 'centro', zona: 'C', bioma: 'templado', dato: 'Lo rodean tres de las montañas más altas del país: Popocatépetl, Iztaccíhuatl y Pico de Orizaba.' },
  'MX-QUE': { capital: 'Querétaro', lat: 20.59, lon: -100.39, region: 'centro', zona: 'B', bioma: 'semiarido', dato: 'La Sierra Gorda va del semidesierto al bosque de niebla en pocos kilómetros.' },
  'MX-ROO': { capital: 'Chetumal', lat: 18.5, lon: -88.3, region: 'peninsula', zona: 'A', bioma: 'selvaHumeda', dato: 'Bajo la península hay el sistema de ríos subterráneos inundados más largo del mundo (cenotes).' },
  'MX-SLP': { capital: 'San Luis Potosí', lat: 22.15, lon: -100.98, region: 'centro', zona: 'A', bioma: 'semiarido', dato: 'La Huasteca potosina tiene cascadas turquesa: el carbonato de calcio disuelto da ese color.' },
  'MX-SIN': { capital: 'Culiacán', lat: 24.81, lon: -107.39, region: 'noroeste', zona: 'B', bioma: 'selvaSeca', dato: 'Sus valles agrícolas dependen de presas que almacenan el agua de la Sierra Madre.' },
  'MX-SON': { capital: 'Hermosillo', lat: 29.07, lon: -110.96, region: 'noroeste', zona: 'B', bioma: 'desierto', dato: 'El Pinacate y Gran Desierto de Altar tiene cráteres volcánicos y dunas activas; es Patrimonio de la Humanidad.' },
  'MX-TAB': { capital: 'Villahermosa', lat: 17.99, lon: -92.93, region: 'golfo', zona: 'B', bioma: 'humedal', dato: 'Recibe los ríos Grijalva y Usumacinta, que juntos llevan cerca de un tercio del agua superficial del país.' },
  'MX-TAM': { capital: 'Ciudad Victoria', lat: 23.74, lon: -99.15, region: 'noreste', zona: 'A', bioma: 'semiarido', dato: 'La Reserva El Cielo pasa de selva a bosque de niebla y a bosque de pino conforme sube la montaña.' },
  'MX-TLA': { capital: 'Tlaxcala', lat: 19.32, lon: -98.24, region: 'centro', zona: 'B', bioma: 'templado', dato: 'Es el estado más pequeño después de la CDMX. Ahí está la Malinche, un volcán de 4,461 m.' },
  'MX-VER': { capital: 'Xalapa', lat: 19.54, lon: -96.91, region: 'golfo', zona: 'B', bioma: 'selvaHumeda', dato: 'Ahí está el Pico de Orizaba (5,636 m), la montaña más alta de México.' },
  'MX-YUC': { capital: 'Mérida', lat: 20.97, lon: -89.62, region: 'peninsula', zona: 'A', bioma: 'selvaSeca', dato: 'Bajo Chicxulub está el cráter del asteroide que extinguió a los dinosaurios hace 66 millones de años.' },
  'MX-ZAC': { capital: 'Zacatecas', lat: 22.77, lon: -102.58, region: 'centro', zona: 'A', bioma: 'semiarido', dato: 'Sus vetas de plata se explotan desde el siglo XVI.' },
};

// Ciudad sede del concurso
export const PACHUCA = { nombre: 'Pachuca, Hidalgo', lat: 20.12, lon: -98.73 };

// --------------------------------------------------------------------
// Tectónica (trazos esquemáticos, [lon, lat])
// --------------------------------------------------------------------
export const LIMITES_PLACAS = [
  {
    nombre: 'Fosa Mesoamericana (subducción)',
    tipo: 'subduccion',
    puntos: [[-105.9, 20.3], [-105.3, 19.2], [-104.2, 18.5], [-102.8, 17.7], [-101.5, 16.9], [-100.0, 16.3], [-98.5, 15.6], [-97.0, 15.1], [-95.5, 14.8], [-94.0, 14.45], [-92.5, 13.9]],
  },
  {
    nombre: 'Límite Rivera–Cocos',
    tipo: 'transformante',
    puntos: [[-104.4, 18.6], [-105.6, 18.4], [-106.8, 18.3], [-108.4, 18.5]],
  },
  {
    nombre: 'Sistema del Golfo de California (divergente + transformante)',
    tipo: 'divergente',
    puntos: [[-108.4, 18.5], [-108.7, 20.6], [-108.9, 22.6], [-109.5, 23.6], [-110.5, 24.9], [-111.7, 26.4], [-112.9, 27.9], [-113.9, 29.4], [-114.6, 30.9], [-115.3, 32.3], [-115.6, 32.8]],
  },
  {
    nombre: 'Falla Motagua–Polochic (transformante)',
    tipo: 'transformante',
    puntos: [[-92.3, 15.3], [-91.0, 15.25], [-89.6, 15.3], [-88.3, 15.6]],
  },
];

export const PLACAS = [
  { nombre: 'Placa Norteamericana', lat: 27.2, lon: -102.5, mov: null },
  { nombre: 'Placa del Pacífico', lat: 21.6, lon: -115.0, mov: { dir: 315, cm: 5 } },
  { nombre: 'Placa de Cocos', lat: 15.0, lon: -100.0, mov: { dir: 35, cm: 6.5 } },
  { nombre: 'Placa de Rivera', lat: 19.2, lon: -107.3, mov: { dir: 40, cm: 2 } },
  { nombre: 'Placa del Caribe', lat: 14.9, lon: -88.6, mov: { dir: 90, cm: 2 } },
];

// Velocidades medias en la corteza (km/s)
export const VEL_P = 6.5;
export const VEL_S = 3.6;
export const T_PROCESO_ALERTA = 6; // s: detección + cálculo + difusión (aprox.)

// Red simplificada de sensores costeros (inspirada en el SASMEX)
export const SENSORES = [
  { nombre: 'Costa de Jalisco', lat: 19.3, lon: -104.85 },
  { nombre: 'Manzanillo', lat: 19.05, lon: -104.3 },
  { nombre: 'Lázaro Cárdenas', lat: 17.96, lon: -102.2 },
  { nombre: 'Zihuatanejo', lat: 17.64, lon: -101.55 },
  { nombre: 'Tecpan', lat: 17.22, lon: -100.63 },
  { nombre: 'Acapulco', lat: 16.86, lon: -99.88 },
  { nombre: 'Costa Chica', lat: 16.55, lon: -98.75 },
  { nombre: 'Pinotepa', lat: 16.34, lon: -98.05 },
  { nombre: 'Puerto Escondido', lat: 15.87, lon: -97.07 },
  { nombre: 'Huatulco', lat: 15.77, lon: -96.13 },
  { nombre: 'Salina Cruz', lat: 16.17, lon: -95.2 },
  { nombre: 'Tonalá', lat: 16.09, lon: -93.75 },
  { nombre: 'Tapachula', lat: 14.9, lon: -92.26 },
  { nombre: 'Chilpancingo', lat: 17.55, lon: -99.5 },
  { nombre: 'Oaxaca', lat: 17.07, lon: -96.73 },
  { nombre: 'Tehuacán', lat: 18.46, lon: -97.39 },
];

// origen: hora UTC del inicio de la ruptura (catálogo USGS) · archivo: sismograma real
// de la estación G.UNM (Ciudad Universitaria, CDMX), canal BHZ, 20 muestras/s,
// descargado del servicio FDSN de EarthScope. Cada archivo empieza 60 s antes del origen.
export const SISMOS_HISTORICOS = [
  { nombre: 'Michoacán 1985', fecha: '19 sep 1985', lat: 18.19, lon: -102.53, mag: 8.1, prof: 17, nota: 'Causó la peor tragedia sísmica de la CDMX. De ahí nació el Sistema de Alerta Sísmica Mexicano (1991).' },
  { nombre: 'Chiapas 2017', fecha: '7 sep 2017', lat: 15.02, lon: -93.9, mag: 8.2, prof: 47, origen: '2017-09-08T04:49:19Z', archivo: 'chiapas2017', nota: 'El más fuerte en un siglo. Se rompió la placa de Cocos por dentro (falla normal), no el contacto entre placas.' },
  { nombre: 'Puebla–Morelos 2017', fecha: '19 sep 2017', lat: 18.55, lon: -98.49, mag: 7.1, prof: 57, origen: '2017-09-19T18:14:38Z', archivo: 'puebla2017', nota: 'Fue intraplaca y cercano: llegó a la CDMX con muy poco tiempo de alerta.' },
  { nombre: 'Oaxaca 2020', fecha: '23 jun 2020', lat: 15.89, lon: -96.01, mag: 7.4, prof: 20, origen: '2020-06-23T15:29:04Z', archivo: 'oaxaca2020', nota: 'Sismo de subducción cerca de Crucecita, Huatulco.' },
  { nombre: 'Acapulco 2021', fecha: '7 sep 2021', lat: 16.98, lon: -99.77, mag: 7.0, prof: 20, origen: '2021-09-08T01:47:47Z', archivo: 'acapulco2021', nota: 'La alerta dio cerca de un minuto de aviso a la CDMX.' },
  { nombre: 'Michoacán 2022', fecha: '19 sep 2022', lat: 18.46, lon: -102.96, mag: 7.6, prof: 15, origen: '2022-09-19T18:05:06Z', archivo: 'michoacan2022', nota: 'Otra vez un 19 de septiembre: pura coincidencia estadística.' },
];

export const ESTACION_UNM = { codigo: 'G.UNM', nombre: 'Ciudad Universitaria, UNAM (CDMX)', lat: 19.3297, lon: -99.1781 };

// --------------------------------------------------------------------
// Volcanes y geología
// --------------------------------------------------------------------
export const VOLCANES = [
  { nombre: 'Pico de Orizaba (Citlaltépetl)', relieve: 'orizaba', lat: 19.03, lon: -97.27, alt: 5636, estado: 'Dormido · última erupción 1846', tipo: 'Estratovolcán', dato: 'Es la montaña más alta de México y el volcán más alto de Norteamérica.' },
  { nombre: 'Popocatépetl', relieve: 'popo-izta', lat: 19.02, lon: -98.62, alt: 5393, estado: 'Activo', tipo: 'Estratovolcán', dato: 'Unos 25 millones de personas viven a menos de 100 km. El CENAPRED lo vigila las 24 horas.', activo: true },
  { nombre: 'Iztaccíhuatl', relieve: 'popo-izta', lat: 19.18, lon: -98.64, alt: 5230, estado: 'Inactivo', tipo: 'Estratovolcán', dato: 'Su forma de «mujer dormida» la dan varios conos que se erosionaron.' },
  { nombre: 'Nevado de Toluca (Xinantécatl)', relieve: 'toluca', lat: 19.11, lon: -99.76, alt: 4680, estado: 'Dormido', tipo: 'Estratovolcán', dato: 'En su cráter están la Laguna del Sol y la Laguna de la Luna.' },
  { nombre: 'La Malinche (Matlalcuéyetl)', relieve: 'malinche', lat: 19.23, lon: -98.03, alt: 4461, estado: 'Dormido', tipo: 'Estratovolcán', dato: 'Su última actividad fue hace unos 3,000 años.' },
  { nombre: 'Volcán de Colima', relieve: 'colima', lat: 19.51, lon: -103.62, alt: 3820, estado: 'Muy activo', tipo: 'Estratovolcán', dato: 'Hace erupciones explosivas y flujos piroclásticos con frecuencia.', activo: true },
  { nombre: 'Paricutín', relieve: 'paricutin', lat: 19.49, lon: -102.25, alt: 2800, estado: 'Extinto · activo 1943–1952', tipo: 'Cono de escoria', dato: 'Nació en 1943 en la milpa de Dionisio Pulido y creció 336 m en su primer año. Su lava sepultó San Juan Parangaricutiro.' },
  { nombre: 'Ceboruco', relieve: 'ceboruco', lat: 21.12, lon: -104.51, alt: 2280, estado: 'Activo · erupción 1870', tipo: 'Estratovolcán', dato: 'Tiene fumarolas activas.' },
  { nombre: 'El Chichón', relieve: 'chichon', lat: 17.36, lon: -93.23, alt: 1150, estado: 'Activo · erupción 1982', tipo: 'Domo / estratovolcán', dato: 'Su erupción de 1982 mató a unas 2,000 personas y bajó la temperatura global por las cenizas en la estratósfera.', activo: true },
  { nombre: 'Tacaná', relieve: 'tacana', lat: 15.13, lon: -92.11, alt: 4060, estado: 'Activo', tipo: 'Estratovolcán', dato: 'Está en la frontera con Guatemala.' },
  { nombre: 'Las Tres Vírgenes', relieve: 'tres-virgenes', lat: 27.47, lon: -112.59, alt: 1940, estado: 'Dormido', tipo: 'Estratovolcán', dato: 'Su calor se aprovecha en una planta geotérmica.' },
  { nombre: 'San Martín Tuxtla', relieve: 'san-martin', lat: 18.57, lon: -95.17, alt: 1650, estado: 'Dormido · erupción 1793', tipo: 'Volcán en escudo', dato: 'Está aislado en la costa de Veracruz, fuera del Eje Neovolcánico.' },
  { nombre: 'Xitle', relieve: 'xitle', lat: 19.25, lon: -99.22, alt: 3100, estado: 'Extinto', tipo: 'Cono de escoria', dato: 'Hace unos 1,670 años su lava cubrió Cuicuilco y formó el Pedregal de San Ángel, donde hoy está Ciudad Universitaria.' },
];

export const EJE_NEOVOLCANICO = [[-105.3, 21.0], [-104.0, 20.6], [-102.5, 19.7], [-101.0, 19.6], [-99.7, 19.3], [-98.6, 19.1], [-97.2, 19.1], [-96.3, 19.3]];

export const GEOSITIOS = [
  { nombre: 'Prismas Basálticos', lat: 20.23, lon: -98.57, dato: 'Columnas de basalto de hasta 40 m en Santa María Regla, Hidalgo. Se forman cuando una colada de lava se enfría y se contrae: se agrieta en prismas hexagonales, igual que el lodo al secarse.' },
  { nombre: 'Geoparque Comarca Minera', lat: 20.12, lon: -98.73, dato: 'Geoparque Mundial de la UNESCO desde 2017. Abarca 9 municipios de Hidalgo con historia minera y volcánica.' },
  { nombre: 'Cráter de Chicxulub', lat: 21.3, lon: -89.5, dato: 'Un asteroide de unos 10 km cayó aquí hace 66 millones de años y dejó un cráter de unos 180 km. El anillo de cenotes marca su borde.' },
];

// --------------------------------------------------------------------
// Biodiversidad
// --------------------------------------------------------------------
export const ESPECIES = [
  { nombre: 'Ajolote', cientifico: 'Ambystoma mexicanum', icono: 'ajolote', lat: 19.26, lon: -99.1, estado: 'En peligro crítico', bioma: 'humedal', dato: 'Puede regenerar extremidades, corazón e incluso partes del cerebro. Solo vive en los canales de Xochimilco.' },
  { nombre: 'Vaquita marina', cientifico: 'Phocoena sinus', icono: 'vaquita', lat: 31.2, lon: -114.4, estado: 'En peligro crítico', bioma: 'humedal', dato: 'Es el mamífero marino más amenazado del mundo: quedan alrededor de 10. Muere atrapada en redes ilegales.' },
  { nombre: 'Mariposa monarca', cientifico: 'Danaus plexippus', icono: 'monarca', lat: 19.6, lon: -100.25, estado: 'Vulnerable', bioma: 'templado', dato: 'Vuela hasta 4,000 km desde Canadá y se orienta con el sol y el campo magnético de la Tierra.' },
  { nombre: 'Jaguar', cientifico: 'Panthera onca', icono: 'jaguar', lat: 18.3, lon: -89.75, estado: 'En peligro (NOM-059)', bioma: 'selvaHumeda', dato: 'Es el felino más grande de América. Un jaguar necesita decenas de km² de selva continua.' },
  { nombre: 'Quetzal', cientifico: 'Pharomachrus mocinno', icono: 'quetzal', lat: 15.65, lon: -92.8, estado: 'En peligro (NOM-059)', bioma: 'selvaHumeda', dato: 'Vive en el bosque de niebla de El Triunfo. Su verde no viene de un pigmento sino de cómo sus plumas reflejan la luz.' },
  { nombre: 'Guacamaya roja', cientifico: 'Ara macao', icono: 'guacamaya', lat: 16.45, lon: -91.05, estado: 'En peligro (NOM-059)', bioma: 'selvaHumeda', dato: 'En la Selva Lacandona quedan pocos cientos de ejemplares silvestres.' },
  { nombre: 'Tiburón ballena', cientifico: 'Rhincodon typus', icono: 'tiburon-ballena', lat: 21.6, lon: -87.15, estado: 'En peligro', bioma: 'humedal', dato: 'Es el pez más grande del mundo (más de 12 m) y solo come plancton.' },
  { nombre: 'Lobo mexicano', cientifico: 'Canis lupus baileyi', icono: 'lobo', lat: 29.9, lon: -108.3, estado: 'En peligro', bioma: 'templado', dato: 'Se extinguió en la naturaleza en México. Desde 2011 se reintroduce gracias a la cría en cautiverio.' },
  { nombre: 'Teporingo', cientifico: 'Romerolagus diazi', icono: 'teporingo', lat: 19.1, lon: -98.7, estado: 'En peligro', bioma: 'templado', dato: 'Es uno de los conejos más pequeños del mundo. Solo vive en los pastizales de los volcanes del centro.' },
  { nombre: 'Tortuga golfina', cientifico: 'Lepidochelys olivacea', icono: 'tortuga', lat: 15.72, lon: -96.73, estado: 'Protegida', bioma: 'humedal', dato: 'En La Escobilla, Oaxaca, llegan miles de hembras a desovar al mismo tiempo («arribada»). La temperatura de la arena decide si las crías son machos o hembras.' },
  { nombre: 'Perrito llanero mexicano', cientifico: 'Cynomys mexicanus', icono: 'perrito', lat: 24.7, lon: -100.6, estado: 'En peligro', bioma: 'semiarido', dato: 'Sus madrigueras airean el suelo y ayudan a que el agua de lluvia se infiltre.' },
  { nombre: 'Berrendo peninsular', cientifico: 'Antilocapra americana peninsularis', icono: 'berrendo', lat: 27.6, lon: -113.6, estado: 'En peligro crítico', bioma: 'desierto', dato: 'Puede correr a más de 80 km/h. Sobrevive en el Desierto de El Vizcaíno.' },
  { nombre: 'Cactus «viejito»', cientifico: 'Cephalocereus senilis', icono: 'cactus', lat: 20.6, lon: -98.75, estado: 'Amenazada', bioma: 'semiarido', dato: 'Es endémico de la Barranca de Metztitlán, Hidalgo. Sus «canas» lo protegen del sol intenso.' },
  { nombre: 'Flamenco americano', cientifico: 'Phoenicopterus ruber', icono: 'flamenco', lat: 20.85, lon: -90.38, estado: 'Amenazada', bioma: 'humedal', dato: 'Su color rosa viene de los carotenoides de los crustáceos que come en Celestún y Ría Lagartos.' },
  { nombre: 'Manatí', cientifico: 'Trichechus manatus', icono: 'manati', lat: 18.6, lon: -88.2, estado: 'En peligro', bioma: 'humedal', dato: 'Es herbívoro y come hasta el 10 % de su peso al día en pastos marinos.' },
  { nombre: 'Mono aullador de manto', cientifico: 'Alouatta palliata', icono: 'mono', lat: 18.45, lon: -95.05, estado: 'En peligro (NOM-059)', bioma: 'selvaHumeda', dato: 'Su rugido se oye a más de un kilómetro: un hueso del cuello agrandado (el hioides) funciona como caja de resonancia. Vive en Los Tuxtlas y las selvas del sureste.' },
  { nombre: 'Tucán real', cientifico: 'Ramphastos sulfuratus', icono: 'tucan', lat: 17.55, lon: -92.2, estado: 'Amenazada (NOM-059)', bioma: 'selvaHumeda', dato: 'Su pico enorme es hueco y ligero. Además de alcanzar frutas, le sirve para soltar calor y regular su temperatura.' },
  { nombre: 'Ballena jorobada', cientifico: 'Megaptera novaeangliae', icono: 'ballena', lat: 20.7, lon: -105.6, estado: 'Protegida en México', bioma: 'humedal', dato: 'Cada invierno viaja miles de kilómetros desde Alaska y Canadá para tener a sus crías en el Pacífico mexicano (Bahía de Banderas, Los Cabos). Los machos cantan canciones que cambian de un año a otro.' },
];

// --------------------------------------------------------------------
// Clima: respaldo sin internet (temperatura media anual aproximada, °C,
// y altitud aproximada de la capital en m)
// --------------------------------------------------------------------
export const CLIMA_RESPALDO = {
  'MX-AGU': [18.5, 1880], 'MX-BCN': [22.8, 5], 'MX-BCS': [24.0, 27], 'MX-CAM': [26.5, 10],
  'MX-CHP': [25.0, 530], 'MX-CHH': [18.5, 1440], 'MX-CMX': [16.5, 2240], 'MX-COA': [18.0, 1600],
  'MX-COL': [25.0, 490], 'MX-DUR': [17.5, 1890], 'MX-GUA': [18.5, 2000], 'MX-GRO': [20.5, 1250],
  'MX-HID': [14.5, 2400], 'MX-JAL': [20.5, 1560], 'MX-MEX': [13.5, 2660], 'MX-MIC': [18.0, 1920],
  'MX-MOR': [21.0, 1510], 'MX-NAY': [21.0, 920], 'MX-NLE': [23.0, 540], 'MX-OAX': [21.0, 1550],
  'MX-PUE': [17.5, 2135], 'MX-QUE': [18.5, 1820], 'MX-ROO': [26.5, 10], 'MX-SLP': [17.5, 1860],
  'MX-SIN': [25.5, 54], 'MX-SON': [25.0, 210], 'MX-TAB': [27.0, 10], 'MX-TAM': [24.0, 320],
  'MX-TLA': [16.0, 2240], 'MX-VER': [18.5, 1420], 'MX-YUC': [26.5, 10], 'MX-ZAC': [15.5, 2440],
};

// Códigos WMO usados por Open-Meteo
export function describeTiempo(code) {
  if (code === 0) return ['despejado', 'Despejado'];
  if (code <= 2) return ['poco-nublado', 'Poco nublado'];
  if (code === 3) return ['nublado', 'Nublado'];
  if (code <= 48) return ['niebla', 'Niebla'];
  if (code <= 57) return ['llovizna', 'Llovizna'];
  if (code <= 67) return ['lluvia', 'Lluvia'];
  if (code <= 77) return ['nieve', 'Nieve'];
  if (code <= 82) return ['lluvia', 'Chubascos'];
  if (code <= 86) return ['nieve', 'Chubascos de nieve'];
  return ['tormenta', 'Tormenta'];
}

// --------------------------------------------------------------------
// Reto (quiz)
// --------------------------------------------------------------------
export const RETO = [
  { p: '¿Por qué tiembla tanto en la costa de Guerrero y Oaxaca?', o: ['La placa de Cocos se hunde bajo la Norteamericana', 'Por los volcanes de la costa', 'Por el calor del océano', 'Por la Luna'], r: 0, e: 'En la Fosa Mesoamericana, la placa de Cocos se mete (subduce) bajo la Norteamericana unos 6 cm por año. La fricción acumula energía que se libera en sismos.' },
  { p: '¿Qué onda sísmica llega primero?', o: ['La onda S', 'La onda P', 'Llegan al mismo tiempo', 'Depende de la hora'], r: 1, e: 'La onda P (primaria) comprime la roca y viaja a unos 6.5 km/s. La S (secundaria) la sacude de lado a lado a unos 3.6 km/s y es la que más daña.' },
  { p: '¿Cómo puede sonar la alerta sísmica en CDMX antes de que llegue el sismo?', o: ['Predice los sismos días antes', 'Las ondas de radio viajan mucho más rápido que las ondas sísmicas', 'Los sensores están en la CDMX', 'Por satélites que ven las placas'], r: 1, e: 'Los sensores de la costa detectan el sismo y avisan por radio, casi a la velocidad de la luz. Las ondas S tardan más de un minuto en recorrer unos 300 km.' },
  { p: '¿Por qué la CDMX se sacude más que otras ciudades a la misma distancia?', o: ['Está muy alta', 'Su suelo es arcilla de un antiguo lago que amplifica las ondas', 'Tiene muchos edificios', 'Está sobre un volcán'], r: 1, e: 'Las arcillas blandas del lago de Texcoco resuenan con las ondas sísmicas y las amplifican varias veces, como gelatina.' },
  { p: 'Toluca y Villahermosa están casi a la misma latitud. ¿Por qué Toluca es mucho más fría?', o: ['Por la contaminación', 'Porque está a más de 2,600 m de altura', 'Porque está más al norte', 'Por los volcanes'], r: 1, e: 'Por cada kilómetro que subes, la temperatura baja en promedio unos 6.5 °C (gradiente térmico vertical). Puedes medirlo con los datos en vivo de la capa de Clima.' },
  { p: '¿Qué forma tienen los Prismas Basálticos de Hidalgo y por qué?', o: ['Cúbica, por la erosión', 'Hexagonal, porque la lava se contrajo al enfriarse', 'Redonda, por el agua', 'Fueron talladas'], r: 1, e: 'Al enfriarse, la lava se contrae y se agrieta en polígonos, sobre todo hexágonos. Es la forma que libera la tensión con menos «grieta».' },
  { p: '¿Cuál de estas especies SOLO vive en Xochimilco?', o: ['Jaguar', 'Ajolote', 'Mariposa monarca', 'Flamenco'], r: 1, e: 'El ajolote (Ambystoma mexicanum) es endémico de los canales de Xochimilco y está en peligro crítico.' },
  { p: '¿Qué formó el Golfo de California?', o: ['Un meteorito', 'La placa del Pacífico separando la península del continente', 'Un río enorme', 'Una erupción'], r: 1, e: 'La península viaja al noroeste con la placa del Pacífico. El Golfo se abrió en los últimos ~6 millones de años.' },
];
