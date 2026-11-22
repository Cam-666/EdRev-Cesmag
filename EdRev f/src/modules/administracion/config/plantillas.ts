/*
 * plantillas — los textos que ve la persona en Plantillas y la validación antes de guardar. Hay dos listas:
 * los tres textos AUTOMÁTICOS de cada revista (la invitación al par, el agradecimiento y la constancia), que solo
 * se editan, y los MENSAJES que escribe la dependencia, que se crean y se eliminan. Una plantilla solo puede usar los
 * datos de su propio tipo; ninguno es obligatorio.
 */
import { ETIQUETA_DATO } from '@/lib/datosPlantilla'
import { marcadores } from '@/lib/plantillas'
import type { FinPlantilla, Plantilla } from '@/types/plantilla'

/** Los cuatro grupos de plantillas de cada revista, con su nombre y para qué sirven, en palabras sencillas. */
export const GRUPOS: Array<{ fin: FinPlantilla; nombre: string; descripcion: string }> = [
  {
    fin: 'invitacion',
    nombre: 'Invitación al par evaluador',
    descripcion:
      'Se envía cuando usted asigna un par a un artículo. Puede haber varias: al asignar se escoge cuál usar y sale elegida la «recomendada».',
  },
  {
    fin: 'agradecimiento',
    nombre: 'Agradecimiento al par evaluador',
    descripcion:
      'Se envía junto con la constancia cuando usted la emite. Puede haber varias: al emitir se escoge cuál usar y sale elegida la «recomendada».',
  },
  {
    fin: 'constancia',
    nombre: 'Constancia de participación',
    descripcion: 'Es el documento PDF que recibe el par por haber evaluado un artículo. Hay una sola por revista: solo se edita.',
  },
  {
    fin: 'mensaje',
    nombre: 'Mensajes libres',
    descripcion:
      'Los que usted escribe y envía cuando quiera, con el botón «Enviar correo» en la ficha de un par evaluador o de un autor.',
  },
]

/** Lo que dice el formulario de cada tipo de plantilla. */
export const EXPLICACION_FIN: Record<FinPlantilla, string> = {
  invitacion: 'Es la invitación que recibe el par cuando usted lo asigna a un artículo. Al asignar se puede escoger entre las invitaciones de la revista.',
  agradecimiento: 'Es el correo de agradecimiento que acompaña a la constancia. Al emitir la constancia se puede escoger entre los agradecimientos de la revista.',
  constancia: 'Este es el documento PDF de la constancia que recibe el par.',
  mensaje: 'Sirve para escribirle a un par o a un autor cuando usted quiera, desde su ficha, con el botón «Enviar correo».',
}

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
