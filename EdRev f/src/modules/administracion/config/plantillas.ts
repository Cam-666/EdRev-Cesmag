/*
 * plantillas — clases y usos de una plantilla y la validación antes de guardarla. Una plantilla solo puede usar los
 * datos de su propio fin; ninguno es obligatorio.
 */
import { ETIQUETA_DATO } from '@/lib/datosPlantilla'
import { marcadores } from '@/lib/plantillas'
import type { ClasePlantilla, FinPlantilla, Plantilla, UsoPlantilla } from '@/types/plantilla'

export const CLASES_PLANTILLA: Array<{ valor: ClasePlantilla; etiqueta: string }> = [
  { valor: 'correo', etiqueta: 'Correo' },
  { valor: 'archivo', etiqueta: 'Archivo' },
]

export const ETIQUETA_USO: Record<UsoPlantilla, string> = {
  invitacion: 'Invitación a evaluar',
  agradecimiento: 'Agradecimiento',
  constancia: 'Constancia de participación',
}

/**
 * Cómo se llama cada tipo de plantilla y qué hace, en palabras sencillas (se usa al crear una plantilla y al
 * mostrar para qué sirve).
 */
export const ETIQUETA_FIN: Record<FinPlantilla, string> = {
  invitacion: 'Correo de invitación',
  agradecimiento: 'Correo de agradecimiento',
  constancia: 'Constancia',
  mensaje: 'Correo libre',
}

export const EXPLICACION_FIN: Record<FinPlantilla, string> = {
  invitacion: 'Se envía sola al par cuando usted lo asigna a un artículo.',
  agradecimiento: 'Se envía sola, junto con la constancia, cuando usted emite la constancia.',
  constancia: 'Es el documento PDF de la constancia que recibe el par. Siempre está en uso: solo se edita.',
  mensaje: 'Sirve para escribirle a un par o a un autor cuando usted quiera, desde su ficha, con el botón «Enviar correo».',
}

/**
 * Los datos que acepta cada uso (los mismos que valida el servidor). Al cambiar el uso de una plantilla en la
 * pantalla, el editor ofrece los datos del uso elegido antes de guardar.
 */
export const VARIABLES_POR_FIN: Record<FinPlantilla, string[]> = {
  invitacion: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo', 'botones'],
  agradecimiento: ['revista', 'par', 'articulo'],
  constancia: ['revista', 'REVISTA', 'par', 'PAR', 'articulo', 'issn', 'indexaciones', 'fecha', 'anio', 'firma'],
  mensaje: ['revista', 'nombre', 'universidad', 'profesion', 'fecha', 'anio'],
}

/** Los correos para los que puede servir una plantilla de correo; la plantilla de archivo es la constancia. */
export const USOS_CORREO: Array<{ valor: Exclude<UsoPlantilla, 'constancia'>; etiqueta: string }> = [
  { valor: 'invitacion', etiqueta: 'Invitación a evaluar' },
  { valor: 'agradecimiento', etiqueta: 'Agradecimiento' },
]

/** El menú «Uso» de una plantilla de correo (la constancia no cambia de uso y no aparece). */
export const USOS_DE_CORREO: Array<{ valor: Exclude<FinPlantilla, 'constancia'>; etiqueta: string }> = [
  { valor: 'invitacion', etiqueta: 'Correo de invitación' },
  { valor: 'agradecimiento', etiqueta: 'Correo de agradecimiento' },
  { valor: 'mensaje', etiqueta: 'Correo libre' },
]

/** Devuelve el primer problema encontrado como frase, o null cuando la plantilla es válida. */
export function validarPlantilla(
  plantilla: Pick<Plantilla, 'variables'>,
  asunto: string | null,
  cuerpo: string,
): string | null {
  if (!cuerpo.trim()) return 'El texto no puede estar vacío.'
  const enCuerpo = marcadores(cuerpo)
  const usados = [...enCuerpo, ...marcadores(asunto ?? '')]
  const desconocido = usados.find((m) => !plantilla.variables.includes(m))
  if (desconocido) return `El dato «${ETIQUETA_DATO[desconocido] ?? desconocido}» no se puede usar en esta plantilla.`
  return null
}

/** Datos de ejemplo para la vista previa de una plantilla; {{revista}} es la revista de la plantilla. */
export const DATOS_EJEMPLO: Record<string, string> = {
  numero: '2026-034',
  profesion: 'Magíster en Educación',
  universidad: 'Universidad de Nariño',
  par: 'Luz Marina Burbano',
  nombre: 'Luz Marina Burbano',
  articulo: 'Alfabetización mediática en la formación de maestros',
  botones: '[Botones: Acepto la invitación · No acepto esta invitación · No deseo participar más]',
  PAR: 'LUZ MARINA BURBANO',
  issn: '2590-7476',
  fecha: '14 de noviembre de 2026',
  anio: '2026',
  firma: '[Firma]',
}
