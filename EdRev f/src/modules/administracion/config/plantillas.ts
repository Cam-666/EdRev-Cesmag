/*
 * plantillas — classes and uses of a template and validation before saving it. A template may only
 * use the data of its own use; none is mandatory. Covers: RNF-19, RF-25, RF-30, RF-45.
 */
import { ETIQUETA_DATO } from '@/lib/datosPlantilla'
import { marcadores } from '@/lib/plantillas'
import type { ClasePlantilla, Plantilla, UsoPlantilla } from '@/types/plantilla'

export const CLASES_PLANTILLA: Array<{ valor: ClasePlantilla; etiqueta: string }> = [
  { valor: 'correo', etiqueta: 'Correo' },
  { valor: 'archivo', etiqueta: 'Archivo' },
]

export const ETIQUETA_USO: Record<UsoPlantilla, string> = {
  invitacion: 'Invitación a evaluar',
  agradecimiento: 'Agradecimiento',
  constancia: 'Constancia de participación',
}

/** The mails a correo template can be for; the file template is the constancia. */
export const USOS_CORREO: Array<{ valor: Exclude<UsoPlantilla, 'constancia'>; etiqueta: string }> = [
  { valor: 'invitacion', etiqueta: 'Invitación a evaluar' },
  { valor: 'agradecimiento', etiqueta: 'Agradecimiento' },
]

/** Returns the first problem found as a sentence, or null when the template is valid. */
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

/** Sample data for the preview of a template; {{revista}} is the journal of the template. */
export const DATOS_EJEMPLO: Record<string, string> = {
  numero: '2026-034',
  profesion: 'Magíster en Educación',
  universidad: 'Universidad de Nariño',
  par: 'Luz Marina Burbano',
  articulo: 'Alfabetización mediática en la formación de maestros',
  botones: '[Botones: Acepto la invitación · No acepto esta invitación · No deseo participar más]',
  PAR: 'LUZ MARINA BURBANO',
  issn: '2590-7476',
  fecha: '14 de noviembre de 2026',
  anio: '2026',
  firma: '[Firma]',
}
