/*
 * esquemas — esquemas de validación que usa más de un controlador (los datos de un par se piden igual al
 * registrarlo desde la base y al crearlo como candidato nuevo de un artículo).
 */
import { z } from 'zod'
import { CORREO_VALIDO } from '../lib/http.js'

export const datosPar = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre'),
  profesion: z.string().trim().optional(),
  correo: z.string().trim().toLowerCase().regex(CORREO_VALIDO, 'Escriba un correo válido'),
  universidad: z.string().trim().min(1, 'Escriba la universidad'),
  area: z.string().trim().min(1, 'Escriba el área temática'),
})

export type DatosPar = z.infer<typeof datosPar>
