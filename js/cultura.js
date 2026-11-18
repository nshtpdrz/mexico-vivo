// =====================================================================
//  Cultura e historia de México (datos didácticos, fechas aproximadas)
//  Fuentes sugeridas: INAH, UNESCO (Patrimonio Mundial y Patrimonio
//  Cultural Inmaterial), INEGI, Secretaría de Cultura.
// =====================================================================

// Años: negativos = antes de Cristo
export const ERAS = [
  { id: 'preclasico', nombre: 'Preclásico', desde: -1500, hasta: 200, texto: 'Aparecen las primeras aldeas agrícolas basadas en el maíz. Los olmecas del Golfo esculpen cabezas colosales y crean ideas que heredarán otras culturas: el juego de pelota, el calendario y los centros ceremoniales.' },
  { id: 'clasico', nombre: 'Clásico', desde: 200, hasta: 900, texto: 'Grandes ciudades: Teotihuacan llega a tener unos 100,000 habitantes, Monte Albán domina los valles de Oaxaca y las ciudades mayas como Palenque y Calakmul desarrollan escritura, astronomía y el concepto del cero.' },
  { id: 'posclasico', nombre: 'Posclásico', desde: 900, hasta: 1521, texto: 'Tula (Hidalgo) es la capital tolteca; luego Chichén Itzá florece en Yucatán. En 1325 los mexicas fundan México-Tenochtitlan sobre un islote del lago de Texcoco.' },
  { id: 'virreinato', nombre: 'Virreinato', desde: 1521, hasta: 1821, texto: 'Tras la caída de Tenochtitlan se forma la Nueva España. La plata de Zacatecas, Guanajuato y Real del Monte (Hidalgo) se exporta al mundo, y nace una cultura mestiza en el arte, la comida y la lengua.' },
  { id: 'independencia', nombre: 'Independencia y siglo XIX', desde: 1810, hasta: 1910, texto: 'En 1810 Miguel Hidalgo inicia la lucha por la independencia, que se consuma en 1821. El siglo XIX trae guerras, la Reforma, la victoria del 5 de mayo de 1862 en Puebla y la llegada del ferrocarril.' },
  { id: 'moderno', nombre: 'Revolución y México moderno', desde: 1910, hasta: 2026, texto: 'La Revolución (1910) lleva a la Constitución de 1917, firmada en Querétaro. En el siglo XX México crece, se urbaniza y su cultura (muralismo, cine, música) se vuelve conocida en todo el mundo.' },
];

// tipo: 'arqueologico' | 'virreinal' | 'moderno' · unesco: año de inscripción (si aplica)
export const SITIOS = [
  { id: 'laventa', nombre: 'La Venta (olmeca)', lat: 18.10, lon: -94.04, tipo: 'arqueologico', desde: -1200, hasta: -400, cultura: 'Olmeca', dato: 'Uno de los grandes centros olmecas, la llamada «cultura madre» de Mesoamérica. Sus cabezas colosales de basalto pesan hasta 40 toneladas y el basalto se trajo desde la sierra de Los Tuxtlas, a decenas de kilómetros, sin animales de carga ni rueda.' },
  { id: 'teotihuacan', nombre: 'Teotihuacan', lat: 19.69, lon: -98.84, tipo: 'arqueologico', desde: -100, hasta: 650, unesco: 1987, cultura: 'Teotihuacana', dato: '«El lugar donde los hombres se convierten en dioses». La Pirámide del Sol mide unos 65 m. La ciudad se trazó siguiendo una orientación astronómica precisa.' },
  { id: 'montealban', nombre: 'Monte Albán', lat: 17.04, lon: -96.77, tipo: 'arqueologico', desde: -500, hasta: 850, unesco: 1987, cultura: 'Zapoteca', dato: 'Los zapotecas aplanaron la cima de un cerro para construir su capital. Tiene algunos de los textos escritos más antiguos de Mesoamérica.' },
  { id: 'palenque', nombre: 'Palenque', lat: 17.48, lon: -92.05, tipo: 'arqueologico', desde: 200, hasta: 800, unesco: 1987, cultura: 'Maya', dato: 'Ahí está la tumba del rey Pakal, en el Templo de las Inscripciones. Sus relieves y jeroglíficos permitieron descifrar buena parte de la escritura maya.' },
  { id: 'calakmul', nombre: 'Calakmul', lat: 18.11, lon: -89.81, tipo: 'arqueologico', desde: -400, hasta: 900, unesco: 2002, cultura: 'Maya', dato: 'Fue la capital del reino de la Serpiente, rival de Tikal. Hoy está en medio de la mayor reserva de selva de México: es Patrimonio Mixto (cultural y natural).' },
  { id: 'tajin', nombre: 'El Tajín', lat: 20.45, lon: -97.38, tipo: 'arqueologico', desde: 600, hasta: 1200, unesco: 1992, cultura: 'Totonaca / Golfo', dato: 'Su Pirámide de los Nichos tiene 365 nichos. Ahí se han encontrado al menos 17 canchas de juego de pelota.' },
  { id: 'xochicalco', nombre: 'Xochicalco', lat: 18.80, lon: -99.30, tipo: 'arqueologico', desde: 650, hasta: 900, unesco: 1999, cultura: 'Epiclásica', dato: 'Tiene un observatorio subterráneo: el sol entra por un tiro vertical y marca fechas del calendario.' },
  { id: 'cacaxtla', nombre: 'Cacaxtla', lat: 19.24, lon: -98.34, tipo: 'arqueologico', desde: 650, hasta: 950, cultura: 'Olmeca-xicalanca', dato: 'Sus murales conservan colores brillantes después de más de 1,000 años.' },
  { id: 'tula', nombre: 'Tula (tolteca)', lat: 20.06, lon: -99.34, tipo: 'arqueologico', desde: 900, hasta: 1150, cultura: 'Tolteca', dato: '¡Está en Hidalgo! Fue la capital tolteca. Sus Atlantes, columnas de guerreros de unos 4.6 m de alto, sostenían el techo de un templo. Los mexicas consideraban a los toltecas el modelo de la civilización.' },
  { id: 'chichen', nombre: 'Chichén Itzá', lat: 20.68, lon: -88.57, tipo: 'arqueologico', desde: 600, hasta: 1200, unesco: 1988, cultura: 'Maya', dato: 'En los equinoccios, la luz y la sombra forman en la escalinata de El Castillo una serpiente que parece bajar. Es una de las nuevas siete maravillas del mundo.' },
  { id: 'uxmal', nombre: 'Uxmal', lat: 20.36, lon: -89.77, tipo: 'arqueologico', desde: 700, hasta: 1000, unesco: 1996, cultura: 'Maya (estilo Puuc)', dato: 'Sus fachadas tienen mosaicos de piedra con máscaras del dios de la lluvia, Chaac: en Yucatán no hay ríos y el agua era lo más importante.' },
  { id: 'paquime', nombre: 'Paquimé', lat: 30.37, lon: -107.95, tipo: 'arqueologico', desde: 1200, hasta: 1450, unesco: 1998, cultura: 'Casas Grandes', dato: 'Ciudad de adobe en pleno desierto de Chihuahua, con canales de agua y criaderos de guacamayas traídas desde el sur.' },
  { id: 'tenochtitlan', nombre: 'México-Tenochtitlan', lat: 19.435, lon: -99.131, tipo: 'arqueologico', desde: 1325, hasta: 1521, unesco: 1987, cultura: 'Mexica', dato: 'Se fundó en 1325 sobre un islote del lago de Texcoco. Tenía calzadas, acueductos y chinampas: islas de cultivo que todavía existen en Xochimilco.' },
  { id: 'tzintzuntzan', nombre: 'Tzintzuntzan', lat: 19.63, lon: -101.58, tipo: 'arqueologico', desde: 1300, hasta: 1530, cultura: 'Purépecha', dato: 'Capital del imperio purépecha, que nunca fue conquistado por los mexicas. Los purépechas dominaban la metalurgia del cobre.' },
  { id: 'tulum', nombre: 'Tulum', lat: 20.21, lon: -87.43, tipo: 'arqueologico', desde: 1200, hasta: 1550, cultura: 'Maya', dato: 'Ciudad amurallada frente al mar Caribe. Era un puerto de comercio por canoa.' },

  { id: 'puebla', nombre: 'Centro histórico de Puebla', lat: 19.04, lon: -98.20, tipo: 'virreinal', desde: 1531, hasta: 2026, unesco: 1987, dato: 'Ciudad trazada en 1531. Famosa por la talavera (Patrimonio Inmaterial de la UNESCO, 2019), el mole poblano y los chiles en nogada.' },
  { id: 'zacatecas', nombre: 'Zacatecas', lat: 22.77, lon: -102.58, tipo: 'virreinal', desde: 1546, hasta: 2026, unesco: 1993, dato: 'Ciudad minera fundada tras hallar plata en 1546. Su catedral es una joya del barroco.' },
  { id: 'guanajuato', nombre: 'Guanajuato', lat: 21.02, lon: -101.26, tipo: 'virreinal', desde: 1548, hasta: 2026, unesco: 1988, dato: 'A fines del siglo XVIII sus minas, como La Valenciana, estaban entre las mayores productoras de plata del mundo. Hoy es sede del Festival Internacional Cervantino.' },
  { id: 'tembleque', nombre: 'Acueducto del Padre Tembleque', lat: 19.79, lon: -98.67, tipo: 'virreinal', desde: 1554, hasta: 2026, unesco: 2015, dato: '¡Entre Hidalgo y el Estado de México! Fray Francisco de Tembleque y comunidades indígenas lo construyeron en el siglo XVI. Su arquería mayor tiene 68 arcos y combina técnicas romanas y mesoamericanas.' },
  { id: 'realdelmonte', nombre: 'Real del Monte', lat: 20.14, lon: -98.67, tipo: 'virreinal', desde: 1550, hasta: 2026, dato: '¡Hidalgo! Pueblo minero de plata. En 1766 sus mineros hicieron una de las primeras huelgas de América. En el siglo XIX llegaron mineros de Cornualles (Inglaterra), que trajeron los pastes y el fútbol.' },
  { id: 'campeche', nombre: 'Campeche amurallada', lat: 19.85, lon: -90.53, tipo: 'virreinal', desde: 1540, hasta: 2026, unesco: 1999, dato: 'Se amuralló a fines del siglo XVII para defenderse de los piratas.' },
  { id: 'morelia', nombre: 'Morelia', lat: 19.70, lon: -101.19, tipo: 'virreinal', desde: 1541, hasta: 2026, unesco: 1991, dato: 'Sus edificios de cantera rosa le dan un color único. Es la ciudad natal de José María Morelos.' },

  { id: 'dolores', nombre: 'Dolores Hidalgo', lat: 21.16, lon: -100.93, tipo: 'moderno', desde: 1810, hasta: 2026, dato: 'La madrugada del 16 de septiembre de 1810, Miguel Hidalgo llamó al pueblo a levantarse: el Grito de Dolores, inicio de la Independencia. El estado de Hidalgo lleva su nombre.' },
  { id: 'queretaro', nombre: 'Querétaro', lat: 20.59, lon: -100.39, tipo: 'moderno', desde: 1810, hasta: 2026, unesco: 1996, dato: 'Ahí se organizó la conspiración de 1810 y se promulgó la Constitución de 1917, que sigue vigente.' },
  { id: 'cu', nombre: 'Ciudad Universitaria (UNAM)', lat: 19.33, lon: -99.19, tipo: 'moderno', desde: 1952, hasta: 2026, unesco: 2007, dato: 'Construida sobre la lava del Xitle, con murales de Siqueiros y la Biblioteca Central de Juan O\'Gorman. Ahí está el sismógrafo G.UNM cuyos registros reales usa esta aplicación.' },
  { id: 'pachuca', nombre: 'Pachuca: cuna del fútbol', lat: 20.12, lon: -98.73, tipo: 'moderno', desde: 1900, hasta: 2026, dato: 'Los mineros ingleses de Pachuca y Real del Monte jugaron fútbol desde fines del siglo XIX; el Pachuca es uno de los clubes más antiguos del país. Su Reloj Monumental se inauguró en 1910.' },
];

export const EVENTOS = [
  { anio: -1200, texto: 'Florece la cultura olmeca en la costa del Golfo.' },
  { anio: 0, texto: 'Teotihuacan empieza a crecer como gran ciudad.' },
  { anio: 615, texto: 'Pakal sube al trono de Palenque.' },
  { anio: 950, texto: 'Tula, en Hidalgo, es la capital tolteca.' },
  { anio: 1325, texto: 'Se funda México-Tenochtitlan.' },
  { anio: 1521, texto: 'Cae Tenochtitlan; inicia el virreinato.' },
  { anio: 1546, texto: 'Se descubre plata en Zacatecas.' },
  { anio: 1766, texto: 'Huelga de los mineros de Real del Monte, Hidalgo.' },
  { anio: 1810, texto: 'Grito de Dolores: inicia la Independencia.' },
  { anio: 1821, texto: 'Se consuma la Independencia.' },
  { anio: 1862, texto: 'Batalla de Puebla: victoria del 5 de mayo.' },
  { anio: 1869, texto: 'Se crea el estado de Hidalgo.' },
  { anio: 1910, texto: 'Inicia la Revolución mexicana.' },
  { anio: 1917, texto: 'Se promulga la Constitución en Querétaro.' },
  { anio: 1938, texto: 'Expropiación petrolera.' },
  { anio: 1968, texto: 'México es sede de los Juegos Olímpicos.' },
  { anio: 1985, texto: 'Sismo de Michoacán; nace la cultura de protección civil.' },
  { anio: 2017, texto: 'Sismos de Chiapas y Puebla–Morelos.' },
];

// Patrimonio Cultural Inmaterial de la UNESCO (selección)
export const INMATERIAL = [
  ['Día de Muertos', 2008], ['Voladores de Papantla', 2009], ['Cocina tradicional mexicana', 2010],
  ['Parachicos de Chiapa de Corzo', 2010], ['Pirekua, canto purépecha', 2010], ['Mariachi', 2011],
  ['Charrería', 2016], ['Talavera de Puebla y Tlaxcala', 2019],
];

// platillo · artesanía · música/baile o tradición · clave de sonido (opcional)
export const CULTURA_ESTADOS = {
  'MX-AGU': { platillo: 'Pollo estilo San Marcos', artesania: 'Deshilado', tradicion: 'Feria Nacional de San Marcos' },
  'MX-BCN': { platillo: 'Tacos de pescado de Ensenada', artesania: 'Cerámica de Rosarito', tradicion: 'Vendimias del Valle de Guadalupe' },
  'MX-BCS': { platillo: 'Almejas chocolatas', artesania: 'Talabartería', tradicion: 'Pinturas rupestres de la Sierra de San Francisco (UNESCO)' },
  'MX-CAM': { platillo: 'Pan de cazón', artesania: 'Sombreros de jipi', tradicion: 'Carnaval de Campeche' },
  'MX-CHP': { platillo: 'Tamales chiapanecos y cochito horneado', artesania: 'Textiles de los Altos y ámbar', tradicion: 'Marimba y Parachicos (UNESCO)', sonido: 'musica-chiapas' },
  'MX-CHH': { platillo: 'Carne seca y burritos', artesania: 'Cestería rarámuri', tradicion: 'Carrera de bola rarámuri' },
  'MX-CMX': { platillo: 'Tacos al pastor', artesania: 'Cartonería y alebrijes de papel', tradicion: 'Trajineras de Xochimilco' },
  'MX-COA': { platillo: 'Cabrito y pan de pulque', artesania: 'Sarape de Saltillo', tradicion: 'Fiestas de la vendimia en Parras' },
  'MX-COL': { platillo: 'Tatemado', artesania: 'Perritos de barro de Colima', tradicion: 'Danza de los morenos' },
  'MX-DUR': { platillo: 'Caldillo durangueño', artesania: 'Alacranes encapsulados', tradicion: 'El cine del oeste filmado en sus desiertos' },
  'MX-GUA': { platillo: 'Enchiladas mineras', artesania: 'Mayólica de Guanajuato', tradicion: 'Festival Internacional Cervantino' },
  'MX-GRO': { platillo: 'Pozole verde', artesania: 'Platería de Taxco', tradicion: 'Clavadistas de La Quebrada' },
  'MX-HID': { platillo: 'Pastes y barbacoa', artesania: 'Tenangos bordados de Tenango de Doria', tradicion: 'Huapango huasteco', sonido: 'musica-huasteca' },
  'MX-JAL': { platillo: 'Birria y torta ahogada', artesania: 'Vidrio soplado de Tlaquepaque', tradicion: 'Mariachi y tequila (UNESCO)' },
  'MX-MEX': { platillo: 'Chorizo verde de Toluca', artesania: 'Árbol de la vida de Metepec', tradicion: 'Mercados de Toluca' },
  'MX-MIC': { platillo: 'Carnitas, uchepos y corundas', artesania: 'Guitarras de Paracho y laca de Uruapan', tradicion: 'Noche de Muertos en Pátzcuaro y pirekua (UNESCO)' },
  'MX-MOR': { platillo: 'Cecina de Yecapixtla', artesania: 'Alfarería de Tlayacapan', tradicion: 'Brinco del Chinelo' },
  'MX-NAY': { platillo: 'Pescado zarandeado', artesania: 'Arte wixárika (huichol) de chaquira y estambre', tradicion: 'Peregrinación wixárika a Wirikuta' },
  'MX-NLE': { platillo: 'Cabrito y machaca', artesania: 'Talabartería', tradicion: 'Música norteña' },
  'MX-OAX': { platillo: 'Mole negro y tlayudas', artesania: 'Alebrijes y barro negro', tradicion: 'Guelaguetza' },
  'MX-PUE': { platillo: 'Mole poblano y chiles en nogada', artesania: 'Talavera (UNESCO)', tradicion: 'Batalla del 5 de mayo' },
  'MX-QUE': { platillo: 'Enchiladas queretanas', artesania: 'Muñecas de trapo otomíes', tradicion: 'Misiones franciscanas de la Sierra Gorda (UNESCO)' },
  'MX-ROO': { platillo: 'Tikin xic (pescado en achiote)', artesania: 'Hamacas y bordado maya', tradicion: 'Cultura maya viva de la zona centro' },
  'MX-SLP': { platillo: 'Enchiladas potosinas', artesania: 'Rebozo de Santa María del Río', tradicion: 'Huapango huasteco y Xilitla', sonido: 'musica-huasteca' },
  'MX-SIN': { platillo: 'Aguachile', artesania: 'Muebles de Elota', tradicion: 'Banda sinaloense' },
  'MX-SON': { platillo: 'Carne asada y coyotas', artesania: 'Tallas de palo fierro (seri)', tradicion: 'Danza del venado (yoreme y yaqui)' },
  'MX-TAB': { platillo: 'Pejelagarto asado', artesania: 'Jícaras labradas', tradicion: 'Cacao y chocolate, herencia olmeca y maya' },
  'MX-TAM': { platillo: 'Carne a la tampiqueña', artesania: 'Cuera tamaulipeca', tradicion: 'Huapango y música norteña' },
  'MX-TLA': { platillo: 'Mixiotes', artesania: 'Talavera y sarapes de Santa Ana Chiautempan', tradicion: 'Carnaval de Tlaxcala (huehues)' },
  'MX-VER': { platillo: 'Huachinango a la veracruzana', artesania: 'Jaranas y vainilla de Papantla', tradicion: 'Son jarocho y Voladores de Papantla (UNESCO)', sonido: 'musica-veracruz' },
  'MX-YUC': { platillo: 'Cochinita pibil', artesania: 'Hamacas y huipiles bordados', tradicion: 'Jarana yucateca' },
  'MX-ZAC': { platillo: 'Asado de boda', artesania: 'Platería y cantera', tradicion: 'Tamborazo zacatecano' },
};
