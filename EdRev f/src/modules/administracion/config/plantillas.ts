/*
 * plantillas — validation of a template before saving it. A template may only use its own
 * markers and must keep the ones it exists for: the invitation and the thank-you mail need the
 * peer and the article; the constancia must replace the peer name and the article title and nothing
 * else (RF-30). Covers: RNF-19, RF-25, RF-30.
 */
import { marcadores } from '@/lib/plantillas'
import type { Plantilla, PlantillaId } from '@/types/plantilla'

export const OBLIGATORIOS: Record<PlantillaId, string[]> = {
  invitacion: ['par', 'articulo'],
  agradecimiento: ['par', 'articulo'],
  constancia: ['nombrePar', 'articulo'],
}

/** Returns the first problem found as a sentence, or null when the template is valid. */
export function validarPlantilla(
  plantilla: Pick<Plantilla, 'id' | 'variables'>,
  asunto: string | null,
  cuerpo: string,
): string | null {
  if (!cuerpo.trim()) return 'El texto no puede estar vacío.'
  const enCuerpo = marcadores(cuerpo)
  const usados = [...enCuerpo, ...marcadores(asunto ?? '')]
  const desconocido = usados.find((m) => !plantilla.variables.includes(m))
  if (desconocido) return `El marcador {{${desconocido}}} no existe en esta plantilla.`
  const falta = OBLIGATORIOS[plantilla.id].find((m) => !enCuerpo.includes(m))
  if (falta) return `Falta el marcador obligatorio {{${falta}}}.`
  return null
}

/** Sample data for the preview of a template. */
export const DATOS_EJEMPLO: Record<string, string> = {
  revista: 'Revista Electrónica en Educación y Pedagogía',
  par: 'Luz Marina Burbano',
  nombrePar: 'Luz Marina Burbano',
  articulo: 'Alfabetización mediática en la formación de maestros',
}
