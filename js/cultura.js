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

// platillo · artesanía · tradición, cada uno con el LUGAR o la COMUNIDAD de donde
// es propio (ninguno representa a todo el estado). Estado: EN REVISIÓN: falta
// registrar la fuente de cada afirmación (ver VERIFICACION.md).
// Se eliminaron entradas dudosas en lugar de inventar reemplazos.
export const CULTURA_ESTADOS = {
  'MX-AGU': { platillo: 'Pollo estilo San Marcos (ciudad de Aguascalientes)', artesania: 'Deshilado (Calvillo y otros municipios)', tradicion: 'Feria Nacional de San Marcos (ciudad de Aguascalientes)' },
  'MX-BCN': { platillo: 'Tacos de pescado (Ensenada)', artesania: 'Cestería (comunidades kumiai)', tradicion: 'Vendimias (Valle de Guadalupe, Ensenada)' },
  'MX-BCS': { platillo: 'Almejas chocolatas (costas de la península)', tradicion: 'Pinturas rupestres de la Sierra de San Francisco (Mulegé; patrimonio arqueológico, UNESCO)' },
  'MX-CAM': { platillo: 'Pan de cazón (ciudad de Campeche)', artesania: 'Sombreros de jipi (Bécal)', tradicion: 'Carnaval (ciudad de Campeche)' },
  'MX-CHP': { platillo: 'Cochito horneado (región Centro)', artesania: 'Textiles tsotsiles y tseltales (Altos de Chiapas) y ámbar (Simojovel)', tradicion: 'Marimba (en muchas regiones) y Parachicos (Chiapa de Corzo, UNESCO)', sonido: 'musica-chiapas' },
  'MX-CHH': { platillo: 'Carne seca (centro y norte del estado)', artesania: 'Cestería y textiles (comunidades rarámuri, Sierra Tarahumara)', tradicion: 'Carrera de bola (comunidades rarámuri)' },
  'MX-CMX': { platillo: 'Tacos al pastor', artesania: 'Cartonería y alebrijes de papel (tradición iniciada por Pedro Linares)', tradicion: 'Chinampas y trajineras (Xochimilco)' },
  'MX-COA': { platillo: 'Pan de pulque (Saltillo)', artesania: 'Sarape (Saltillo)', tradicion: 'Vendimia (Parras)' },
  'MX-COL': { platillo: 'Tatemado' },
  'MX-DUR': { platillo: 'Caldillo durangueño' },
  'MX-GUA': { platillo: 'Enchiladas mineras (Guanajuato capital y región minera)', artesania: 'Mayólica (ciudad de Guanajuato)', tradicion: 'Festival Internacional Cervantino (ciudad de Guanajuato)' },
  'MX-GRO': { platillo: 'Pozole verde (región Centro)', artesania: 'Platería (Taxco)', tradicion: 'Clavadistas de La Quebrada (Acapulco)' },
  'MX-HID': { platillo: 'Pastes (Pachuca y Real del Monte, herencia de mineros de Cornualles) y barbacoa (región Centro y Valle del Mezquital)', artesania: 'Tenangos (comunidades otomíes de Tenango de Doria)', tradicion: 'Huapango o son huasteco (región Huasteca)', sonido: 'musica-huasteca' },
  'MX-JAL': { platillo: 'Torta ahogada (Guadalajara) y birria', artesania: 'Vidrio soplado (Tlaquepaque y Tonalá)', tradicion: 'Mariachi (UNESCO; con raíces en el occidente de México) y tequila (región de Tequila)' },
  'MX-MEX': { platillo: 'Chorizo verde (Toluca)', artesania: 'Árbol de la vida (Metepec)' },
  'MX-MIC': { platillo: 'Uchepos y corundas (región purépecha) y carnitas', artesania: 'Guitarras (Paracho) y maque (Uruapan)', tradicion: 'Noche de Muertos (lago de Pátzcuaro) y pirekua (canto purépecha, UNESCO)' },
  'MX-MOR': { platillo: 'Cecina (Yecapixtla)', artesania: 'Alfarería (Tlayacapan)', tradicion: 'Brinco del Chinelo (Tepoztlán, Yautepec y otros pueblos)' },
  'MX-NAY': { platillo: 'Pescado zarandeado (costa)', artesania: 'Arte de chaquira y estambre (pueblo wixárika)', tradicion: 'Peregrinación a Wirikuta (pueblo wixárika)' },
  'MX-NLE': { platillo: 'Cabrito y machaca (región norte)', tradicion: 'Música norteña' },
  'MX-OAX': { platillo: 'Tlayudas (Valles Centrales) y moles de Oaxaca', artesania: 'Alebrijes de madera (San Martín Tilcajete y San Antonio Arrazola) y barro negro (San Bartolo Coyotepec)', tradicion: 'Guelaguetza (ciudad de Oaxaca, con delegaciones de las regiones del estado)' },
  'MX-PUE': { platillo: 'Mole poblano y chiles en nogada (ciudad de Puebla)', artesania: 'Talavera (Puebla y Tlaxcala, UNESCO)', tradicion: 'Batalla del 5 de mayo de 1862 (ciudad de Puebla)' },
  'MX-QUE': { platillo: 'Enchiladas queretanas', artesania: 'Muñecas de trapo (comunidades otomíes, Amealco)', tradicion: 'Misiones franciscanas (Sierra Gorda, UNESCO)' },
  'MX-ROO': { platillo: 'Tikin xic (pescado en achiote; península de Yucatán)', artesania: 'Bordado y hamacas (comunidades mayas)', tradicion: 'Comunidades mayas de la zona centro del estado' },
  'MX-SLP': { platillo: 'Enchiladas potosinas', artesania: 'Rebozo (Santa María del Río)', tradicion: 'Huapango (región Huasteca) y jardín de Edward James (Xilitla)', sonido: 'musica-huasteca' },
  'MX-SIN': { platillo: 'Aguachile', tradicion: 'Música de banda sinaloense' },
  'MX-SON': { platillo: 'Coyotas (Hermosillo) y carne asada', artesania: 'Tallas de palo fierro (pueblo comcáac o seri)', tradicion: 'Danza del venado (pueblos yoreme-mayo y yaqui)' },
  'MX-TAB': { platillo: 'Pejelagarto asado', artesania: 'Jícaras labradas', tradicion: 'Cacao y chocolate (región de la Chontalpa)' },
  'MX-TAM': { platillo: 'Carne a la tampiqueña (Tampico)', artesania: 'Cuera tamaulipeca', tradicion: 'Huapango (región Huasteca) y música norteña (centro y norte)' },
  'MX-TLA': { platillo: 'Mixiotes', artesania: 'Talavera (con Puebla, UNESCO) y sarapes (Santa Ana Chiautempan)', tradicion: 'Carnaval con huehues (varios municipios)' },
  'MX-VER': { platillo: 'Huachinango a la veracruzana (puerto de Veracruz)', artesania: 'Jaranas (región del Sotavento) y vainilla (Papantla)', tradicion: 'Son jarocho (Sotavento) y Voladores de Papantla (pueblo totonaco, UNESCO)', sonido: 'musica-veracruz' },
  'MX-YUC': { platillo: 'Cochinita pibil (península de Yucatán)', artesania: 'Hamacas y huipiles bordados (comunidades mayas)', tradicion: 'Jarana yucateca' },
  'MX-ZAC': { platillo: 'Asado de boda', artesania: 'Platería y cantera', tradicion: 'Tamborazo (región sur del estado y Jerez)' },
};
