// Sabores de México: evidencia científica sobre el origen de alimentos
// mesoamericanos y la técnica de la nixtamalización.
//
// Reglas de este módulo:
//  · Cada afirmación lleva su fuente (nivel A oficial/primaria, B académica).
//  · Solo se usan cifras que aparecen en el resumen o la ficha de la fuente.
//  · No se atribuyen orígenes exclusivos cuando hay disputa o distribución
//    compartida (chile: dos regiones candidatas; cacao: la evidencia más antigua
//    de domesticación está en Sudamérica).
//  · Las coordenadas de los sitios son APROXIMADAS (sirven para ubicarlos en el
//    mapa, no para localizarlos en campo).
//  · Los platillos regionales NO se repiten aquí: viven en la capa Cultura.

const CONSULTA = '18 nov 2026';

export const FUENTES_SABORES = {
  piperno2009: {
    cita: 'Piperno DR, Ranere AJ, Holst I, Iriarte J, Dickau R. Starch grain and phytolith evidence for early ninth millennium B.P. maize from the Central Balsas River Valley, Mexico. PNAS 2009;106(13):5019-5024.',
    url: 'https://doi.org/10.1073/pnas.0812525106', nivel: 'B', consulta: CONSULTA,
    usado: 'Maíz presente hace 8,700 años en el abrigo de Xihuatoxtla (valle del Balsas central).',
    limitaciones: 'Evidencia microscópica (almidones y fitolitos), no mazorcas completas. Se consultó el resumen.',
  },
  matsuoka2002: {
    cita: 'Matsuoka Y, Vigouroux Y, Goodman MM, Sanchez G J, Buckler E, Doebley J. A single domestication for maize shown by multilocus microsatellite genotyping. PNAS 2002;99(9):6080-6084.',
    url: 'https://doi.org/10.1073/pnas.052125199', nivel: 'B', consulta: CONSULTA,
    usado: 'Todo el maíz proviene de una sola domesticación en el sur de México, hace unos 9,000 años.',
    limitaciones: 'Estimación genética (264 plantas, 99 microsatélites); la fecha es aproximada. Se consultó el resumen.',
  },
  smith1997: {
    cita: 'Smith BD. The initial domestication of Cucurbita pepo in the Americas 10,000 years ago. Science 1997;276(5314):932-934.',
    url: 'https://doi.org/10.1126/science.276.5314.932', nivel: 'B', consulta: CONSULTA,
    usado: 'Calabaza (Cucurbita pepo) domesticada en la cueva de Guilá Naquitz, Oaxaca, hace entre 10,000 y 8,000 años.',
    limitaciones: 'Se consultaron registros bibliográficos y el resumen, no el artículo completo.',
  },
  kraft2014: {
    cita: 'Kraft KH, Brown CH, Nabhan GP, Luedeling E, Luna Ruiz JJ, Coppens d\'Eeckenbrugge G, Hijmans RJ, Gepts P. Multiple lines of evidence for the origin of domesticated chili pepper, Capsicum annuum, in Mexico. PNAS 2014;111(17):6165-6170.',
    url: 'https://doi.org/10.1073/pnas.1308933111', nivel: 'B', consulta: CONSULTA,
    usado: 'Dos áreas candidatas para el origen del chile domesticado (noreste y centro-este de México); restos precerámicos en el valle de Tehuacán.',
    limitaciones: 'Las cuatro líneas de evidencia no coinciden del todo: la genética apunta más al noreste. Se consultó el resumen.',
  },
  powis2011: {
    cita: 'Powis TG, Cyphers A, Gaikwad NW, Grivetti L, Cheong K. Cacao use and the San Lorenzo Olmec. PNAS 2011;108(21):8595-8600.',
    url: 'https://doi.org/10.1073/pnas.1100620108', nivel: 'B', consulta: CONSULTA,
    usado: 'Uso de cacao en San Lorenzo entre 1800 y 1000 a. C.; menciona evidencia previa en Paso de la Amada y El Manatí.',
    limitaciones: 'Habla de USO de cacao (residuos en vasijas), no de domesticación. Se consultó el resumen.',
  },
  zarrillo2018: {
    cita: 'Zarrillo S, et al. The use and domestication of Theobroma cacao during the mid-Holocene in the upper Amazon. Nature Ecology & Evolution 2018;2:1879-1888.',
    url: 'https://doi.org/10.1038/s41559-018-0697-x', nivel: 'B', consulta: CONSULTA,
    usado: 'Uso de cacao hace unos 5,300 años en Santa Ana-La Florida (Ecuador); la Amazonia alta es el centro de domesticación más antiguo identificado hasta ahora.',
    limitaciones: 'Hallazgo fuera de México; no niega la importancia del cacao en Mesoamérica.',
  },
  unesco2010: {
    cita: 'UNESCO. La cocina tradicional mexicana: Una cultura comunitaria, ancestral y viva y el paradigma de Michoacán. Lista Representativa del Patrimonio Cultural Inmaterial, 2010 (5.COM).',
    url: 'https://ich.unesco.org/es/RL/la-cocina-tradicional-mexicana-cultura-comunitaria-ancestral-y-viva-el-paradigma-de-michoacan-00400', nivel: 'A', consulta: CONSULTA,
    usado: 'Maíz, frijol y chile como base; milpa, chinampa y nixtamalización como técnicas; las cocineras tradicionales como portadoras.',
    limitaciones: 'Describe una práctica cultural viva, no fechas de origen.',
  },
  schaarschmidt2019: {
    cita: 'Schaarschmidt S, Fauhl-Hassek C. Mycotoxins during the processes of nixtamalization and tortilla production. Toxins 2019;11(4):227.',
    url: 'https://doi.org/10.3390/toxins11040227', nivel: 'B', consulta: CONSULTA,
    usado: 'Muchos estudios muestran menos micotoxinas en el maíz cocido con álcali y en las tortillas.',
    limitaciones: 'La reducción depende de las condiciones del proceso; no elimina todas las toxinas.',
  },
  glesener2026: {
    cita: 'Glesener H, Roberts AMP, Tanveer H, et al. Local nixtamalization processes reduce aflatoxin B1 concentration and shift metabolome in naturally contaminated maize. J Agric Food Chem 2026;74(17):13978-13989.',
    url: 'https://doi.org/10.1021/acs.jafc.5c13174', nivel: 'B', consulta: CONSULTA,
    usado: 'La nixtamalización aumentó mucho el contenido de calcio del maíz.',
    limitaciones: 'El aumento exacto depende de cuánta cal se usa; por eso la app no da una cifra.',
  },
  deboer2026: {
    cita: 'DeBoer MD, McDermid JM, Hampel D, et al. Human-milk vitamin B-3 (niacin and vitamer) concentrations… Am J Clin Nutr 2026;124(2):101397.',
    url: 'https://doi.org/10.1016/j.ajcnut.2026.101397', nivel: 'B', consulta: CONSULTA,
    usado: 'El riesgo de deficiencia de niacina (vitamina B3) aumenta si se come maíz sin mejorar su biodisponibilidad.',
    limitaciones: 'Estudio realizado en Tanzania; se usa solo la afirmación general del resumen.',
  },
};

// Sitios con evidencia arqueológica. «hace» = años antes del presente según la fuente.
export const ORIGENES = [
  {
    id: 'xihuatoxtla', nombre: 'Abrigo de Xihuatoxtla', lugar: 'Valle del Balsas central, Guerrero',
    lon: -99.55, lat: 18.32, alimento: 'Maíz', color: '#f2c23a', hace: 8700, fuentes: ['piperno2009', 'matsuoka2002'],
    nino: 'Aquí se encontraron rastros de maíz de hace 8,700 años. ¡Es de los más antiguos que se conocen!',
    texto: 'En este abrigo rocoso se hallaron granos de almidón y fitolitos (partículas microscópicas de las plantas) que muestran que el maíz ya estaba presente hace unos 8,700 años, en un bosque tropical estacional y no en las tierras altas semiáridas. Estudios genéticos indican que todo el maíz proviene de una sola domesticación a partir del teocintle, en el sur de México, hace unos 9,000 años.',
    avanzado: 'Dos líneas de evidencia independientes: microfósiles fechados (Piperno et al. 2009) y genética de poblaciones con 264 plantas y 99 microsatélites (Matsuoka et al. 2002). La fecha genética es una estimación con incertidumbre.',
  },
  {
    id: 'guila', nombre: 'Cueva de Guilá Naquitz', lugar: 'Valle de Oaxaca',
    lon: -96.36, lat: 16.95, alimento: 'Calabaza', color: '#e2873a', hace: 10000, fuentes: ['smith1997'],
    nino: 'En esta cueva se encontraron semillas de calabaza de hace unos 10,000 años.',
    texto: 'Semillas, tallos y cáscaras de calabaza (Cucurbita pepo) fechados por radiocarbono muestran que se cultivaba aquí hace entre 10,000 y 8,000 años. Las semillas eran más grandes y los tallos más gruesos que los de las calabazas silvestres: señales de domesticación.',
    avanzado: 'Smith (1997) obtuvo nueve fechas por espectrometría de masas con acelerador (AMS) directamente sobre los restos, lo que resolvió la duda de si las semillas venían de capas más recientes.',
  },
  {
    id: 'tehuacan', nombre: 'Valle de Tehuacán', lugar: 'Sur de Puebla',
    lon: -97.4, lat: 18.46, alimento: 'Chile', color: '#d23a2a', hace: null, fuentes: ['kraft2014'],
    nino: 'Aquí se encontraron restos de chile muy antiguos, de antes de que existiera la cerámica.',
    texto: 'En el valle de Tehuacán se recuperaron restos precerámicos de chile. Un estudio que combinó cuatro tipos de evidencia (genética, arqueología, distribución de las plantas silvestres y lenguas antiguas) propone dos regiones posibles para su domesticación: el noreste y el centro-este de México. No hay una única respuesta: la evidencia combinada favorece el centro-este, pero la genética apunta más al noreste.',
    avanzado: 'La lengua reconstruida más antigua con una palabra para «chile» es el proto-otomangue, cuyo centro se ubica al este del valle de Tehuacán (Kraft et al. 2014). Es un ejemplo de cómo la lingüística histórica ayuda a la arqueología.',
  },
  {
    id: 'sanlorenzo', nombre: 'San Lorenzo', lugar: 'Sur de Veracruz',
    lon: -94.76, lat: 17.75, alimento: 'Cacao', color: '#7a4a2a', hace: 3800, fuentes: ['powis2011', 'zarrillo2018'],
    nino: 'Los olmecas de San Lorenzo ya usaban cacao hace más de 3,000 años.',
    texto: 'En vasijas de este sitio olmeca se detectaron residuos de cacao: se usaba aquí entre 1800 y 1000 a. C. Pero el cacao no se domesticó solo en México: la evidencia más antigua de su uso y domesticación está en la Amazonia alta de Ecuador, hace unos 5,300 años.',
    avanzado: 'Powis et al. (2011) analizaron residuos químicos de cacao en cerámica; eso prueba USO, no domesticación. Zarrillo et al. (2018) combinaron almidones, teobromina y ADN antiguo en Santa Ana-La Florida (Ecuador).',
  },
  {
    id: 'pasoamada', nombre: 'Paso de la Amada', lugar: 'Costa del Pacífico, Chiapas',
    lon: -92.45, lat: 14.86, alimento: 'Cacao', color: '#7a4a2a', hace: null, fuentes: ['powis2011'],
    nino: 'En esta aldea de la costa también se encontraron rastros de cacao muy antiguos.',
    texto: 'El estudio de San Lorenzo cita evidencia aún más temprana de uso de cacao aquí, en la costa del Pacífico. Esto muestra que el cacao se usaba en varias regiones de Mesoamérica, no en un solo lugar.',
    avanzado: 'La app no muestra la fecha de este sitio porque no se pudo consultar el artículo original que la reporta; queda pendiente de verificación.',
  },
];

// Línea del tiempo (solo fechas presentes en las fuentes)
export const LINEA_SABORES = [
  { hace: 10000, texto: 'Calabaza en Guilá Naquitz, Oaxaca', fuente: 'smith1997' },
  { hace: 9000, texto: 'Domesticación del maíz en el sur de México (estimación genética)', fuente: 'matsuoka2002' },
  { hace: 8700, texto: 'Maíz en Xihuatoxtla, Guerrero', fuente: 'piperno2009' },
  { hace: 5300, texto: 'Cacao en la Amazonia alta (Ecuador)', fuente: 'zarrillo2018' },
  { hace: 3800, texto: 'Cacao en San Lorenzo, Veracruz (1800–1000 a. C.)', fuente: 'powis2011' },
  { hace: 16, texto: 'La cocina tradicional mexicana, Patrimonio Inmaterial (2010)', fuente: 'unesco2010' },
];

// Laboratorio de nixtamalización: pasos cualitativos (sin tiempos ni
// temperaturas inventados; varían según la comunidad y la receta).
export const PASOS_NIXTAMAL = [
  { id: 'maiz', titulo: 'Maíz seco', texto: 'Se usa maíz maduro y seco. Su cáscara (pericarpio) es dura y protege al grano.' },
  { id: 'cal', titulo: 'Agua y cal', texto: 'Se pone el maíz en agua con cal (hidróxido de calcio). La cal hace el agua alcalina.' },
  { id: 'coccion', titulo: 'Cocción', texto: 'Se cuece el maíz en el agua con cal. La cáscara se ablanda y empieza a desprenderse.' },
  { id: 'reposo', titulo: 'Reposo', texto: 'Se deja reposar en esa agua. El grano absorbe agua y calcio. Al maíz cocido así se le llama nixtamal.' },
  { id: 'lavado', titulo: 'Lavado', texto: 'Se lava el nixtamal para quitar el exceso de cal y la cáscara suelta. Al agua que sobra se le llama nejayote.' },
  { id: 'molienda', titulo: 'Molienda', texto: 'Se muele (en metate o molino) y se obtiene la masa: base de tortillas, tamales y muchos platillos.' },
];

export const EFECTOS_NIXTAMAL = [
  { titulo: 'Más calcio', texto: 'El grano absorbe calcio de la cal.', fuente: 'glesener2026' },
  { titulo: 'Niacina aprovechable', texto: 'Comer maíz sin un tratamiento que mejore la biodisponibilidad de la niacina (vitamina B3) aumenta el riesgo de deficiencia.', fuente: 'deboer2026' },
  { titulo: 'Menos micotoxinas', texto: 'Muchos estudios muestran menos micotoxinas (toxinas de hongos) en el maíz nixtamalizado y en las tortillas.', fuente: 'schaarschmidt2019' },
  { titulo: 'Mayor valor nutritivo', texto: 'La UNESCO describe la nixtamalización como una técnica que aumenta el valor nutritivo del maíz.', fuente: 'unesco2010' },
];
