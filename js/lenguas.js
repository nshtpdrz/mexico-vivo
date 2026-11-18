// =====================================================================
//  Atlas de lenguas indígenas nacionales — datos VERIFICADOS
//  Consulta: 18 de noviembre de 2026. Cada dato indica su fuente (ver FUENTES_LENGUAS).
//  Política del módulo: no hay traducciones, ni pronunciaciones, ni audios, ni voces
//  sintetizadas; no se mezclan variantes ni se asigna una lengua a un solo estado.
// =====================================================================

export const FUENTES_LENGUAS = {
  inali: {
    titulo: 'Catálogo de las Lenguas Indígenas Nacionales: Variantes lingüísticas de México con sus autodenominaciones y referencias geoestadísticas',
    institucion: 'Instituto Nacional de Lenguas Indígenas (INALI)',
    fecha: 'Diario Oficial de la Federación, 14 de enero de 2008',
    url: 'https://www.inali.gob.mx/pdf/CLIN_completo.pdf',
    consulta: '2026-11-18', nivel: 'A',
    usado: 'Estructura de 11 familias, 68 agrupaciones y 364 variantes; 475 autodenominaciones; familia de cada agrupación.',
    limitaciones: 'Es de 2008. En la lista de agrupaciones el catálogo imprime «Triqui VI Familia oto-mangue»: el número romano es una errata; se usa el nombre de la familia (oto-mangue), que coincide con su esquema genealógico.',
  },
  inegiNacional: {
    titulo: 'Censo de Población y Vivienda 2020. Presentación de resultados: Estados Unidos Mexicanos',
    institucion: 'INEGI', fecha: '2021',
    url: 'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/Censo2020_Principales_resultados_EUM.pdf',
    consulta: '2026-11-18', nivel: 'A',
    usado: 'Total nacional de hablantes de 3 años y más (2010 y 2020), hablantes que no hablan español y número de hablantes de las 10 lenguas principales.',
    limitaciones: 'Los nombres de las 10 lenguas aparecen en una imagen; se identificaron con los tabulados del cuestionario básico citados en indigenousmexico.org, cuyos números coinciden exactamente con este documento.',
  },
  inegiEstados: {
    titulo: 'Censo de Población y Vivienda 2020. Presentación de resultados por entidad federativa (32 documentos)',
    institucion: 'INEGI', fecha: '2021',
    url: 'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/cpv2020_pres_res_hgo.pdf',
    consulta: '2026-11-18', nivel: 'A',
    usado: 'Porcentaje de población de 3 años y más hablante de lengua indígena por entidad (2010 y 2020) y, cuando se pudo leer sin ambigüedad, el número de hablantes.',
    limitaciones: 'El número de hablantes se omite en 15 entidades porque el documento no permitió leer los dos años sin ambigüedad. Los 32 porcentajes coinciden con la gráfica nacional del INEGI.',
  },
  inegiIndigenas2020: {
    titulo: 'Estadísticas a propósito del Día Internacional de los Pueblos Indígenas (comunicado 392/2020)',
    institucion: 'INEGI', fecha: '7 de agosto de 2020',
    url: 'https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2020/Indigenas2020.pdf',
    consulta: '2026-11-18', nivel: 'A',
    usado: 'Lista de las 68 agrupaciones con su familia (reproduce el catálogo del INALI).',
    limitaciones: 'Sus cifras de hablantes son del Censo 2010 y no se usan aquí.',
  },
};

// Totales nacionales (población de 3 años y más) — fuente: inegiNacional
export const RESUMEN_LENGUAS = {
  hablantes2010: 6913362, pct2010: 6.6,
  hablantes2020: 7364645, pct2020: 6.1,
  sinEspanol2010: 1096512, pctSinEspanol2010: 15.9,
  sinEspanol2020: 865972, pctSinEspanol2020: 11.8,
  familias: 11, agrupaciones: 68, variantes: 364, autodenominaciones: 475, // fuente: inali
};

// Las 10 agrupaciones con más hablantes en 2020 (3 años y más) — fuente: inegiNacional
export const TOP_LENGUAS = [
  ['Náhuatl', 1651958, 'yuto-nahua'], ['Maya', 774755, 'maya'], ['Tseltal', 589144, 'maya'],
  ['Tsotsil', 550274, 'maya'], ['Mixteco', 526593, 'oto-mangue'], ['Zapoteco', 490845, 'oto-mangue'],
  ['Otomí', 298861, 'oto-mangue'], ['Totonaco', 256344, 'totonaco-tepehua'], ["Ch'ol", 254715, 'maya'],
  ['Mazateco', 237212, 'oto-mangue'],
];

// 11 familias (orden del catálogo, de norte a sur) y sus 68 agrupaciones — fuente: inali / inegiIndigenas2020
export const FAMILIAS = [
  { num: 'I', nombre: 'Álgica', color: '#8e6bc9', agrupaciones: ['Kickapoo'] },
  { num: 'II', nombre: 'Yuto-nahua', color: '#e2622b', agrupaciones: ['Cora', 'Guarijío', 'Huichol', 'Mayo', 'Náhuatl', 'Pápago', 'Pima', 'Tarahumara', 'Tepehuano del norte', 'Tepehuano del sur', 'Yaqui'] },
  { num: 'III', nombre: 'Cochimí-yumana', color: '#c9a84a', agrupaciones: ['Cucapá', 'Kiliwa', 'Kumiai', "Ku'ahl", 'Paipai'] },
  { num: 'IV', nombre: 'Seri', color: '#d98c4a', agrupaciones: ['Seri'] },
  { num: 'V', nombre: 'Oto-mangue', color: '#2f6fb5', agrupaciones: ['Amuzgo', 'Cuicateco', 'Chatino', 'Chichimeco jonaz', 'Chinanteco', 'Chocholteco', 'Ixcateco', 'Matlatzinca', 'Mazahua', 'Mazateco', 'Mixteco', 'Otomí', 'Pame', 'Popoloca', 'Triqui', 'Tlahuica', 'Tlapaneco', 'Zapoteco'] },
  { num: 'VI', nombre: 'Maya', color: '#2f8f6b', agrupaciones: ['Akateko', 'Awakateko', 'Chontal de Tabasco', 'Chuj', "Ch'ol", 'Huasteco', 'Ixil', 'Jakalteko', 'Kaqchikel', "K'iche'", 'Lacandón', 'Mam', 'Maya', "Qato'k", "Q'anjob'al", "Q'eqchí'", 'Teko', 'Tojolabal', 'Tseltal', 'Tsotsil'] },
  { num: 'VII', nombre: 'Totonaco-tepehua', color: '#c96b9e', agrupaciones: ['Tepehua', 'Totonaco'] },
  { num: 'VIII', nombre: 'Tarasca', color: '#4fa3b4', agrupaciones: ['Tarasco'] },
  { num: 'IX', nombre: 'Mixe-zoque', color: '#a8b44f', agrupaciones: ['Ayapaneco', 'Mixe', 'Oluteco', 'Popoluca de la Sierra', 'Sayulteco', 'Texistepequeño', 'Zoque'] },
  { num: 'X', nombre: 'Chontal de Oaxaca', color: '#9b3d2a', agrupaciones: ['Chontal de Oaxaca'] },
  { num: 'XI', nombre: 'Huave', color: '#5fae7c', agrupaciones: ['Huave'] },
];

// Generado desde las Presentaciones de resultados del Censo 2020 de cada entidad (INEGI).
// pct: % de población de 3 años y más que habla alguna lengua indígena. hab: personas, solo si el
// documento permitió leer los dos años sin ambigüedad (si no, null: no se adivina).
export const LENGUA_ESTADOS = {
  'MX-AGU': { pct2020: 0.2, pct2010: 0.2, hab2010: null, hab2020: null },
  'MX-BCN': { pct2020: 1.4, pct2010: 1.4, hab2010: null, hab2020: null },
  'MX-BCS': { pct2020: 1.8, pct2010: 1.8, hab2010: null, hab2020: null },
  'MX-CAM': { pct2020: 10.4, pct2010: 12.0, hab2010: 92128, hab2020: 91801 },
  'MX-COA': { pct2020: 0.2, pct2010: 0.2, hab2010: null, hab2020: null },
  'MX-COL': { pct2020: 0.7, pct2010: 0.7, hab2010: null, hab2020: null },
  'MX-CHP': { pct2020: 28.2, pct2010: 27.3, hab2010: null, hab2020: null },
  'MX-CHH': { pct2020: 3.1, pct2010: 3.5, hab2010: 109378, hab2020: 110498 },
  'MX-CMX': { pct2020: 1.4, pct2010: 1.5, hab2010: 123224, hab2020: 125153 },
  'MX-DUR': { pct2020: 2.7, pct2010: 2.2, hab2010: null, hab2020: null },
  'MX-GUA': { pct2020: 0.2, pct2010: 0.3, hab2010: 15204, hab2020: 14048 },
  'MX-GRO': { pct2020: 15.5, pct2010: 15.2, hab2010: 481098, hab2020: 515487 },
  'MX-HID': { pct2020: 12.3, pct2010: 14.8, hab2010: 369549, hab2020: 362629 },
  'MX-JAL': { pct2020: 0.8, pct2010: 0.8, hab2010: null, hab2020: null },
  'MX-MEX': { pct2020: 2.6, pct2010: 2.7, hab2010: null, hab2020: null },
  'MX-MIC': { pct2020: 3.4, pct2010: 3.5, hab2010: null, hab2020: null },
  'MX-MOR': { pct2020: 2.0, pct2010: 1.9, hab2010: null, hab2020: null },
  'MX-NAY': { pct2020: 5.9, pct2010: 5.2, hab2010: null, hab2020: null },
  'MX-NLE': { pct2020: 1.4, pct2010: 0.9, hab2010: null, hab2020: null },
  'MX-OAX': { pct2020: 31.2, pct2010: 33.8, hab2010: 1203150, hab2020: 1221555 },
  'MX-PUE': { pct2020: 9.9, pct2010: 11.5, hab2010: 617504, hab2020: 615622 },
  'MX-QUE': { pct2020: 1.4, pct2010: 1.8, hab2010: 30256, hab2020: 31383 },
  'MX-ROO': { pct2020: 11.7, pct2010: 16.2, hab2010: 198587, hab2020: 204949 },
  'MX-SLP': { pct2020: 8.6, pct2010: 10.6, hab2010: 256468, hab2020: 231213 },
  'MX-SIN': { pct2020: 1.2, pct2010: 0.9, hab2010: null, hab2020: null },
  'MX-SON': { pct2020: 2.2, pct2010: 2.5, hab2010: 61270, hab2020: 62808 },
  'MX-TAB': { pct2020: 4.0, pct2010: 2.9, hab2010: null, hab2020: null },
  'MX-TAM': { pct2020: 0.7, pct2010: 0.8, hab2010: 23478, hab2020: 22651 },
  'MX-TLA': { pct2020: 2.2, pct2010: 2.5, hab2010: 27959, hab2020: 27174 },
  'MX-VER': { pct2020: 8.6, pct2010: 9.3, hab2010: 662760, hab2020: 663503 },
  'MX-YUC': { pct2020: 23.7, pct2010: 29.6, hab2010: 544927, hab2020: 525092 },
  'MX-ZAC': { pct2020: 0.3, pct2010: 0.4, hab2010: 5157, hab2020: 5005 },
};
