/*
 * esquemas — validation schemas shared by more than one controller (the data of a peer is asked
 * when the peer is registered from the base and when it is a new candidate of an article).
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
