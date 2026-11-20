/* esquemas — validación con Zod de los formularios de artículos. Los mensajes dicen cómo corregir cada campo. */
import { z } from 'zod'
import { aNumero } from './reglas'

const TIPOS = ['investigacion', 'reflexion', 'revision']
const RESULTADOS = ['aprobado', 'rechazado', 'ajustes']

const porcentaje = z
  .string()
  .trim()
  .min(1, 'Escriba el porcentaje.')
  .refine((v) => {
    const n = aNumero(v)
    return Number.isFinite(n) && n >= 0 && n <= 100
  }, 'Escriba un número entre 0 y 100.')

export const esquemaDatosArticulo = z.object({
  numeroOjs: z.string().trim().min(1, 'Escriba el número de OJS.'),
  fechaPostulacion: z.string().min(1, 'Seleccione la fecha de postulación.'),
  titulo: z.string().trim().min(1, 'Escriba el título del artículo.'),
  tipo: z.string().refine((v) => TIPOS.includes(v), 'Seleccione el tipo de artículo.'),
})
export type DatosArticuloForm = z.infer<typeof esquemaDatosArticulo>

const entero = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0

/** El volumen y el número van juntos (los dos o ninguno). */
export const esquemaEdicionArticulo = z
  .object({
    titulo: z.string().trim().min(1, 'Escriba el título del artículo.'),
    tipo: z.string().refine((v) => TIPOS.includes(v), 'Seleccione el tipo de artículo.'),
    volumen: z.string().trim(),
    numero: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (!v.volumen && !v.numero) return
    if (!entero(v.volumen)) {
      ctx.addIssue({
        code: 'custom',
        path: ['volumen'],
        message: 'Escriba el volumen junto con el número.',
      })
    }
    if (!entero(v.numero)) {
      ctx.addIssue({
        code: 'custom',
        path: ['numero'],
        message: 'Escriba el número junto con el volumen.',
      })
    }
  })
export type EdicionArticuloForm = z.infer<typeof esquemaEdicionArticulo>

export const esquemaRonda = z.object({
  coincidencias: porcentaje,
  atribuidoIa: porcentaje,
  resultado: z
    .string()
    .refine((v) => RESULTADOS.includes(v), 'Seleccione el resultado del comité.'),
  observacion: z.string().trim(),
})
export type RondaForm = z.infer<typeof esquemaRonda>

export const esquemaReapertura = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la reapertura.'),
  estado: z.enum(['en-revision', 'postulado']),
})
export type ReaperturaForm = z.infer<typeof esquemaReapertura>

/** Cerrar exige un motivo; aprobar exige además el volumen y el número. */
export const esquemaCierre = z
  .object({
    estado: z
      .string()
      .refine(
        (v) => ['aprobado', 'rechazado', 'archivado'].includes(v),
        'Elija cómo se cierra el proceso.',
      ),
    motivo: z.string().trim().min(1, 'Escriba el motivo del cierre.'),
    volumen: z.string().trim(),
    numero: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.estado !== 'aprobado') return
    if (!entero(v.volumen)) {
      ctx.addIssue({
        code: 'custom',
        path: ['volumen'],
        message: 'Escriba el volumen de la publicación.',
      })
    }
    if (!entero(v.numero)) {
      ctx.addIssue({
        code: 'custom',
        path: ['numero'],
        message: 'Escriba el número de la publicación.',
      })
    }
  })
export type CierreForm = z.infer<typeof esquemaCierre>
