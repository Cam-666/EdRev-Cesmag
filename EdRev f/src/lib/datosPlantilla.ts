/*
 * datosPlantilla — the data a template can bring in (the name of the peer, the title of the
 * article…), named in plain Spanish. The person who edits a template sees and writes
 * [Nombre del par]; the system keeps it as the marker {{par}} that the mail and the constancia
 * fill in. The two forms convert into each other without loss. Covers: RF-45, RNF-11, RNF-12.
 */

export const ETIQUETA_DATO: Record<string, string> = {
  revista: 'Nombre de la revista',
  REVISTA: 'Nombre de la revista en mayúsculas',
  numero: 'Número de la solicitud',
  par: 'Nombre del par',
  PAR: 'Nombre del par en mayúsculas',
  profesion: 'Profesión del par',
  universidad: 'Universidad del par',
  articulo: 'Título del artículo',
  botones: 'Botones de respuesta',
  issn: 'ISSN de la revista',
  indexaciones: 'Indexaciones de la revista',
  fecha: 'Fecha de emisión',
  anio: 'Año',
  firma: 'Firma',
}

const CLAVE_DE: Record<string, string> = Object.fromEntries(
  Object.entries(ETIQUETA_DATO).map(([clave, etiqueta]) => [etiqueta, clave]),
)

/** The name of a data, as it is written between square brackets in the editor. */
export function datoVisible(clave: string): string {
  return `[${ETIQUETA_DATO[clave] ?? clave}]`
}

/** Stored text → the text the person edits: {{par}} becomes [Nombre del par]. */
export function aVisible(texto: string): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (marca, clave: string) =>
    clave in ETIQUETA_DATO ? datoVisible(clave) : marca,
  )
}

/** The text the person edits → stored text: [Nombre del par] becomes {{par}}. */
export function aGuardado(texto: string): string {
  return texto.replace(/\[([^[\]\n]+)\]/g, (marca, etiqueta: string) => {
    const clave = CLAVE_DE[etiqueta.trim()]
    return clave ? `{{${clave}}}` : marca
  })
}
