// Maravillas naturales de México: patrimonio natural y mixto de la UNESCO,
// Geoparques Mundiales y el Anillo de Cenotes. Cada lugar responde a la
// pregunta «¿por qué existe?».
//
// Reglas de este módulo:
//  · Fuente oficial (UNESCO, nivel A) o artículo científico (nivel B) en cada lugar.
//  · Las cifras salen del texto de la fuente; las coordenadas son APROXIMADAS.
//  · No se duplica lo que ya existe: los geositios siguen en Volcanes y las
//    especies en Biodiversidad; aquí se enlazan.
//  · Los pueblos que dan nombre a un lugar se presentan como pueblos vivos.

const CONSULTA = '18 nov 2026';
const WHC = (id) => `https://whc.unesco.org/es/list/${id}/`;

export const TIPOS_MARAVILLA = {
  natural: { nombre: 'Patrimonio natural (UNESCO)', color: '#2fae7a' },
  mixto: { nombre: 'Patrimonio mixto: natural y cultural (UNESCO)', color: '#d0a22e' },
  geoparque: { nombre: 'Geoparque Mundial (UNESCO)', color: '#7b86e0' },
  cenotes: { nombre: 'Formación estudiada por la ciencia', color: '#2aa7c9' },
};

export const MARAVILLAS = [
  {
    id: 'revillagigedo', nombre: 'Archipiélago de Revillagigedo', tipo: 'natural', anio: 2016, lugar: 'Océano Pacífico',
    lon: -110.95, lat: 18.78,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Archipiélago de Revillagigedo (1510).', url: WHC(1510), nivel: 'A' },
    nino: 'Son cuatro islas que en realidad son las puntas de volcanes que salen del fondo del mar.',
    porque: 'Las cuatro islas (San Benedicto, Socorro, Roca Partida y Clarión) son las cimas de volcanes de una cordillera submarina. Por ese origen volcánico, el mar se vuelve muy profundo a solo 10 o 12 km de la costa. Ahí se mezclan la corriente de California y la corriente Ecuatorial, y esa mezcla crea una zona muy productiva, rica en tiburones, mantarrayas y grandes peces.',
    dato: 'Está a 386 km al suroeste de la punta de Baja California y entre 720 y 970 km de la costa continental.',
    pregunta: { p: '¿Qué son en realidad estas islas?', o: ['Restos de un continente hundido', 'Cimas de volcanes submarinos', 'Arrecifes de coral'], r: 1 },
  },
  {
    id: 'pinacate', relieve: 'lugar-pinacate', nombre: 'El Pinacate y Gran Desierto de Altar', tipo: 'natural', anio: 2013, lugar: 'Desierto de Sonora, Sonora',
    lon: -113.92, lat: 32.0,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Reserva de la Biosfera El Pinacate y Gran Desierto de Altar (1410).', url: WHC(1410), nivel: 'A' },
    nino: 'Aquí hay cráteres enormes y casi redondos, y dunas de arena que se mueven y llegan a medir 200 metros.',
    porque: 'Tiene dos paisajes. Al este, un escudo volcánico con coladas de lava negras y rojas y 10 cráteres enormes, profundos y casi circulares llamados maares: se formaron por explosiones de vapor. Al oeste está el Gran Desierto de Altar, el mayor campo de dunas activas de Norteamérica; la arena viene de los sedimentos del delta del río Colorado y de fuentes locales.',
    dato: 'Las dunas pueden alcanzar 200 m de altura.',
    pregunta: { p: '¿Qué formó los cráteres circulares del Pinacate?', o: ['Explosiones de vapor', 'Meteoritos', 'Minas antiguas'], r: 0 },
    enlace: { capa: 'volcanes', texto: 'Ver los volcanes de México' },
  },
  {
    id: 'golfo', nombre: 'Islas y áreas protegidas del Golfo de California', tipo: 'natural', anio: 2005, lugar: 'Golfo de California, noroeste de México',
    lon: -112.6, lat: 28.6, peligro: true,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Islas y áreas protegidas del Golfo de California (1182).', url: WHC(1182), nivel: 'A' },
    nino: 'Le dicen «el acuario del mundo» por toda la vida que hay en sus aguas y sus 244 islas.',
    porque: 'El golfo tiene zonas oceanográficas muy distintas entre sí, y por eso reúne paisajes y formas de vida muy variadas. Sus islas y costas son parte del Desierto de Sonora: ahí el desierto llega hasta el mar. El sitio protegido va del delta del río Colorado hasta 270 km al sureste de la punta de Baja California.',
    dato: 'Incluye 244 islas e islotes. La UNESCO lo tiene en su Lista del Patrimonio Mundial en Peligro.',
    pregunta: { p: '¿Cómo apodan al Golfo de California?', o: ['El jardín del mundo', 'El acuario del mundo', 'El desierto azul'], r: 1 },
    enlace: { capa: 'biodiversidad', texto: 'Ver especies en Biodiversidad' },
  },
  {
    id: 'vizcaino', nombre: 'Santuario de ballenas de El Vizcaíno', tipo: 'natural', anio: 1993, lugar: 'Centro de la península de Baja California',
    lon: -114.1, lat: 27.75,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Santuario de ballenas de El Vizcaíno (554).', url: WHC(554), nivel: 'A' },
    nino: 'Las ballenas grises vienen a estas lagunas tranquilas a tener a sus crías.',
    porque: 'Las lagunas costeras de Ojo de Liebre y San Ignacio son sitios importantes de reproducción e invernada de la ballena gris, la foca de puerto, el lobo marino de California, el elefante marino del norte y la ballena azul. También viven ahí cuatro especies de tortugas marinas en peligro.',
    dato: 'Está en la parte central de la península de Baja California.',
    pregunta: { p: '¿Para qué llegan las ballenas grises a estas lagunas?', o: ['Para reproducirse y pasar el invierno', 'Para morir', 'Para huir de los volcanes'], r: 0 },
    enlace: { capa: 'biodiversidad', texto: 'Ver especies en Biodiversidad' },
  },
  {
    id: 'monarca', relieve: 'lugar-monarca', nombre: 'Reserva de la Biosfera de la Mariposa Monarca', tipo: 'natural', anio: 2008, lugar: 'Montañas a unos 100 km al noroeste de la Ciudad de México',
    lon: -100.25, lat: 19.6,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Reserva de la Biosfera de la Mariposa Monarca (1290).', url: WHC(1290), nivel: 'A' },
    nino: 'Cada otoño llegan millones de mariposas y pintan los árboles de naranja. ¡Pesan tanto juntas que doblan las ramas!',
    porque: 'Cada otoño, millones (quizás mil millones) de mariposas de grandes zonas de Norteamérica regresan a estos bosques de montaña y se agrupan en áreas pequeñas. En primavera inician una migración de 8 meses hasta el este de Canadá y de regreso; en ese viaje nacen y mueren cuatro generaciones. Cómo encuentran el camino de vuelta sigue siendo un misterio.',
    dato: 'La reserva mide 56,259 ha y está a unos 100 km al noroeste de la Ciudad de México.',
    pregunta: { p: '¿Cuántas generaciones de mariposas nacen y mueren durante el viaje de ida y vuelta?', o: ['Una', 'Cuatro', 'Diez'], r: 1 },
    enlace: { capa: 'biodiversidad', texto: 'Ver la mariposa monarca en Biodiversidad' },
  },
  {
    id: 'siankaan', nombre: "Sian Ka'an", tipo: 'natural', anio: 1987, lugar: 'Costa oriental de la península de Yucatán, Quintana Roo',
    lon: -87.79, lat: 19.38,
    fuente: { cita: "UNESCO, Centro del Patrimonio Mundial. Sian Ka'an (410).", url: WHC(410), nivel: 'A' },
    nino: 'Tiene selva, manglares, pantanos y un arrecife de coral. ¡Viven ahí más de 300 tipos de aves!',
    porque: 'Su complejo sistema de agua une selvas tropicales, manglares y pantanos con una gran zona marina atravesada por un arrecife de barrera. Esa variedad de ambientes da casa a una flora muy rica y a más de 300 especies de aves.',
    dato: "En maya, Sian Ka'an significa «origen del cielo».",
    pregunta: { p: "¿Qué hay en la parte marina de Sian Ka'an?", o: ['Un arrecife de barrera', 'Un volcán activo', 'Dunas de arena'], r: 0 },
  },
  {
    id: 'calakmul', nombre: 'Antigua ciudad maya y bosques tropicales protegidos de Calakmul', tipo: 'mixto', anio: '2002, 2014', lugar: 'Centro-sur de la península de Yucatán, Campeche',
    lon: -89.74, lat: 18.05,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Antigua ciudad maya y bosques tropicales protegidos de Calakmul, Campeche (1061).', url: WHC(1061), nivel: 'A' },
    nino: 'Es una gran ciudad maya rodeada de selva. Naturaleza e historia juntas.',
    porque: 'Aquí la civilización maya alcanzó su mayor esplendor entre mediados del primer milenio a. C. y cerca del año 1000 d. C. Después, muchos asentamientos fueron abandonados y la selva tropical los cubrió. Por eso hoy se protegen juntos la ciudad antigua y el bosque.',
    dato: 'El sitio ampliado mide 331,397 ha, y con su zona de amortiguamiento ocupa toda la Reserva de la Biosfera de Calakmul.',
    pregunta: { p: '¿Por qué Calakmul es patrimonio «mixto»?', o: ['Porque tiene dos volcanes', 'Porque protege naturaleza y cultura juntas', 'Porque está en dos países'], r: 1 },
    enlace: { capa: 'historia', texto: 'Ver la historia de México' },
  },
  {
    id: 'tehuacan', relieve: 'lugar-tehuacan', nombre: 'Valle de Tehuacán-Cuicatlán', tipo: 'mixto', anio: 2018, lugar: 'Sureste de Puebla y norte de Oaxaca',
    lon: -97.2, lat: 18.1,
    fuente: { cita: 'UNESCO, Centro del Patrimonio Mundial. Valle de Tehuacán-Cuicatlán: hábitat originario de Mesoamérica (1534).', url: WHC(1534), nivel: 'A' },
    nino: 'Es una zona seca llena de cactus gigantes que forman «bosques». Aquí vivieron algunos de los primeros agricultores de Mesoamérica.',
    porque: 'Es una zona árida o semiárida con una de las mayores diversidades biológicas de Norteamérica. Esa riqueza permitió adaptaciones humanas clave para el surgimiento de Mesoamérica, una de las cunas de la civilización. Tiene más de 3,000 especies de plantas vasculares (10 % solo existen aquí) y es un centro de diversificación de cactáceas: 28 géneros y 86 especies, 21 de ellas exclusivas del valle.',
    dato: 'Reúne representantes del 70 % de las familias de plantas del mundo.',
    pregunta: { p: '¿Qué plantas forman «bosques» en este valle?', o: ['Pinos', 'Cactus', 'Manglares'], r: 1 },
    enlace: { capa: 'sabores', texto: 'Ver el chile del valle de Tehuacán en Sabores' },
  },
  {
    id: 'comarca', relieve: 'lugar-comarca', nombre: 'Geoparque Comarca Minera', tipo: 'geoparque', anio: 2017, lugar: 'Centro-sur de Hidalgo',
    lon: -98.73, lat: 20.12,
    fuente: { cita: 'UNESCO, Programa Internacional de Ciencias de la Tierra y Geoparques. Comarca Minera UNESCO Global Geopark.', url: 'https://www.unesco.org/en/iggp/comarca-minera-unesco-global-geopark', nivel: 'A' },
    nino: '¡Es el geoparque de Hidalgo! Los volcanes de hace millones de años dejaron metales y obsidiana.',
    porque: 'Se extiende por las sierras de Pachuca y Las Navajas, donde se encuentran dos provincias magmáticas: una más antigua, ligada a los volcanes de la Sierra Madre Occidental, y otra ligada a la Faja Volcánica Transmexicana, formada porque las placas de Cocos y Rivera se hunden bajo la placa Norteamericana. Ese vulcanismo intenso formó una de las regiones mineras más importantes del mundo. Teotihuacanos, toltecas y mexicas extrajeron aquí obsidiana.',
    dato: 'Mide 184,800 ha. Según la UNESCO, aquí Alexander von Humboldt describió los prismas basálticos más altos del mundo, y aquí se jugó el primer partido de futbol en México.',
    pregunta: { p: '¿Qué vidrio volcánico extraían aquí los pueblos prehispánicos?', o: ['Cuarzo', 'Obsidiana', 'Ámbar'], r: 1 },
    enlace: { capa: 'volcanes', texto: 'Ver sus geositios en Volcanes' },
  },
  {
    id: 'mixteca', relieve: 'lugar-mixteca', nombre: 'Geoparque Mixteca Alta', tipo: 'geoparque', anio: 2017, lugar: 'Mixteca Alta, Oaxaca',
    lon: -97.33, lat: 17.55,
    fuente: { cita: 'UNESCO, Programa Internacional de Ciencias de la Tierra y Geoparques. Mixteca Alta UNESCO Global Geopark.', url: 'https://www.unesco.org/en/iggp/mixteca-alta-unesco-global-geopark', nivel: 'A' },
    nino: 'Aquí los agricultores mixtecos construyen muros de piedra que atrapan agua y tierra para sembrar. ¡Una técnica de miles de años que se sigue usando!',
    porque: 'Está en el límite entre dos terrenos geológicos distintos, una de las regiones geológicamente más complejas de México; su base incluye rocas metamórficas del Precámbrico y del Paleozoico. Su paisaje también lo moldeó la agricultura: los lama-bordos, muros de piedra desarrollados por agricultores mixtecos, atrapan agua y sedimento y crean terrazas fértiles. La técnica tiene entre 3,400 y 3,500 años y se sigue usando hoy.',
    dato: 'Mide 41,540 ha. El pueblo mixteco vive en la región: el mixteco es hoy una de las lenguas indígenas con más hablantes de México (INEGI, Censo 2020).',
    pregunta: { p: '¿Para qué sirven los lama-bordos?', o: ['Para atrapar agua y tierra y sembrar', 'Para defenderse de invasores', 'Para marcar fronteras'], r: 0 },
    enlace: { capa: 'lenguas', texto: 'Ver las lenguas de México' },
  },
  {
    id: 'cenotes', nombre: 'Anillo de Cenotes', tipo: 'cenotes', anio: null, lugar: 'Noroeste de la península de Yucatán',
    lon: -89.6, lat: 20.75,
    fuente: {
      cita: 'Perry E, Marin L, McClain J, Velázquez G. Ring of Cenotes (sinkholes), northwest Yucatan, Mexico: its hydrogeologic characteristics and possible association with the Chicxulub impact crater. Geology 1995;23:17. · Hildebrand AR, et al. Size and structure of the Chicxulub crater revealed by horizontal gravity gradients and cenotes. Nature 1995;376:415-417.',
      url: 'https://doi.org/10.1038/376415a0', nivel: 'B',
    },
    nino: 'Los cenotes son pozos naturales de agua. En Yucatán forman un gran arco que podría tener que ver con el asteroide de los dinosaurios.',
    porque: 'Los cenotes son hundimientos del terreno (dolinas) que dejan ver el agua subterránea. En el noroeste de Yucatán, muchos cenotes forman un arco. Dos estudios de 1995 lo relacionaron con el cráter de impacto de Chicxulub: uno usó los cenotes y la gravedad para medir el tamaño y la estructura del cráter, y otro describió el anillo y su posible relación con él. La palabra «posible» importa: es una hipótesis estudiada, no algo que se vea a simple vista.',
    dato: 'El cráter de Chicxulub está en la capa Volcanes, entre los sitios geológicos.',
    pregunta: { p: '¿Con qué evento relacionan los científicos el anillo de cenotes?', o: ['Una erupción volcánica', 'El impacto de Chicxulub', 'Un terremoto reciente'], r: 1 },
    enlace: { capa: 'volcanes', texto: 'Ver el cráter de Chicxulub en Volcanes' },
  },
];

export const FUENTES_MARAVILLAS = [
  { cita: 'UNESCO, Centro del Patrimonio Mundial: ficha de México y de cada sitio natural y mixto (8 sitios).', url: 'https://whc.unesco.org/es/statesparties/mx', nivel: 'A', consulta: CONSULTA,
    limitaciones: 'La app resume en español las descripciones de la UNESCO.' },
  { cita: 'UNESCO, Programa Internacional de Ciencias de la Tierra y Geoparques: lista de Geoparques Mundiales (México: Comarca Minera y Mixteca Alta, 2017).', url: 'https://www.unesco.org/en/iggp/geoparks', nivel: 'A', consulta: CONSULTA,
    limitaciones: 'Se consultaron las fichas de cada geoparque en inglés.' },
  { cita: 'Hildebrand AR, Pilkington M, Connors M, Ortiz-Alemán C, Chávez RE. Size and structure of the Chicxulub crater revealed by horizontal gravity gradients and cenotes. Nature 1995;376:415-417.', url: 'https://doi.org/10.1038/376415a0', nivel: 'B', consulta: CONSULTA,
    limitaciones: 'Se consultaron los datos bibliográficos y el título.' },
  { cita: 'Perry E, Marin L, McClain J, Velázquez G. Ring of Cenotes (sinkholes), northwest Yucatan, Mexico. Geology 1995;23:17.', url: 'https://doi.org/10.1130/0091-7613(1995)023%3C0017:ROCSNY%3E2.3.CO;2', nivel: 'B', consulta: CONSULTA,
    limitaciones: 'Se consultaron los datos bibliográficos y el título.' },
];
