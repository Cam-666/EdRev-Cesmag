/*
 * datosPlantilla — los datos que una plantilla puede traer (el nombre del par, el título del artículo…),
 * con nombres en español sencillo. Quien edita una plantilla ve y escribe [Nombre del par]; el sistema lo
 * guarda como la marca {{par}} que el correo y la constancia rellenan. Las dos formas se convierten una en la
 * otra sin pérdida.
 */

export const ETIQUETA_DATO: Record<string, string> = {
  par: 'Nombre del par',
  PAR: 'Nombre del par en mayúsculas',
  nombre: 'Nombre del destinatario',
  NOMBRE: 'Nombre del destinatario en mayúsculas',
  correo: 'Correo del destinatario',
  profesion: 'Profesión o título',
  universidad: 'Universidad o institución',
  area: 'Área temática del par',
  pais: 'País del autor',
  orcid: 'ORCID del autor',
  articulo: 'Título del artículo',
  numero: 'Número de la solicitud',
  tipo: 'Tipo de artículo',
  estado: 'Estado del artículo',
  entrega: 'Fecha de entrega de la evaluación',
  revista: 'Nombre de la revista',
  REVISTA: 'Nombre de la revista en mayúsculas',
  issn: 'ISSN de la revista',
  indexaciones: 'Indexaciones de la revista',
  contacto: 'Correo de la revista',
  plazo: 'Días para responder',
  limite: 'Fecha límite para responder',
  fecha: 'Fecha de emisión',
  anio: 'Año',
  botones: 'Botones de respuesta',
  firma: 'Firma',
}

const CLAVE_DE: Record<string, string> = Object.fromEntries(
  Object.entries(ETIQUETA_DATO).map(([clave, etiqueta]) => [etiqueta, clave]),
)

/** El nombre de un dato, tal como se escribe entre corchetes en el editor. */
export function datoVisible(clave: string): string {
  return `[${ETIQUETA_DATO[clave] ?? clave}]`
}

/** Texto guardado → texto que edita la persona: {{par}} se vuelve [Nombre del par]. */
export function aVisible(texto: string): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (marca, clave: string) =>
    clave in ETIQUETA_DATO ? datoVisible(clave) : marca,
  )
}

/** Texto que edita la persona → texto guardado: [Nombre del par] se vuelve {{par}}. */
export function aGuardado(texto: string): string {
  return texto.replace(/\[([^[\]\n]+)\]/g, (marca, etiqueta: string) => {
    const clave = CLAVE_DE[etiqueta.trim()]
    return clave ? `{{${clave}}}` : marca
  })
}
