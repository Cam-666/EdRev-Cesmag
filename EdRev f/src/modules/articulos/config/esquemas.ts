/*
 * esquemas — Zod validation of the article forms. Messages say how to fix each field.
 * Covers: RF-01, RF-05, RF-06, RF-07, RF-08, RF-09.
 */
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

export const esquemaEdicionArticulo = z.object({
  titulo: z.string().trim().min(1, 'Escriba el título del artículo.'),
  tipo: z.string().refine((v) => TIPOS.includes(v), 'Seleccione el tipo de artículo.'),
  numeroPublicacion: z.string().trim(),
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

export const esquemaObservacion = z.object({
  texto: z.string().trim().min(1, 'Escriba la observación.'),
})
export type ObservacionForm = z.infer<typeof esquemaObservacion>

export const esquemaReapertura = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la reapertura.'),
  estado: z.enum(['en-revision', 'postulado']),
})
export type ReaperturaForm = z.infer<typeof esquemaReapertura>
