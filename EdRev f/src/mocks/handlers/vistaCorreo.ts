/*
 * vistaCorreo — en la API simulada, el correo de una plantilla armado con datos de ejemplo, como lo hace el servidor
 * real: reemplaza los datos ({{par}}, {{plazo}}…), aplica la alineación, la negrita y la cursiva, y muestra los
 * botones de respuesta. Así la vista previa de la demostración se ve igual que la real.
 */
import { analizar } from '@/lib/formato'
import { DATOS_EJEMPLO } from '@/modules/administracion/config/plantillas'

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ALINEAR = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
  justificado: 'justify',
} as const
const BOTONES =
  '<p><span style="background:#0b3a8c;color:#fff;padding:6px 10px;border-radius:4px">Acepto la invitación</span> ' +
  '<span style="background:#2563eb;color:#fff;padding:6px 10px;border-radius:4px">No acepto esta invitación</span> ' +
  '<span style="background:#b91c1c;color:#fff;padding:6px 10px;border-radius:4px">No deseo participar más</span></p>'

export function correoDeEjemplo(titulo: string, cuerpo: string, revista: string): string {
  const datos: Record<string, string> = {
    ...DATOS_EJEMPLO,
    revista,
    REVISTA: revista.toUpperCase(),
  }
  const texto = cuerpo.replace(/\{\{(\w+)\}\}/g, (marca, k: string) =>
    k === 'botones' ? marca : (datos[k] ?? marca),
  )
  const html = analizar(texto)
    .map((p) => {
      if (p.vacio) return '<p>&nbsp;</p>'
      const lineas = p.lineas
        .map((l) =>
          l
            .map((t) => {
              const base = escapar(t.texto)
              const c = t.cursiva ? `<i>${base}</i>` : base
              return t.negrita ? `<b>${c}</b>` : c
            })
            .join(''),
        )
        .join('<br>')
      return lineas.trim() === '{{botones}}'
        ? BOTONES
        : `<p style="text-align:${ALINEAR[p.alineacion]}">${lineas.replace('{{botones}}', BOTONES)}</p>`
    })
    .join('')
  return `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif"><h1>Universidad CESMAG</h1><h2>${titulo}</h2>${html}<small>Aviso de datos personales</small></body></html>`
}
