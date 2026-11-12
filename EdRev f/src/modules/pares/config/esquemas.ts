/*
 * esquemas — Zod validation of the peers forms. Covers: RF-12, RF-13, RF-16, RNF-06.
 */
import { z } from 'zod'

export const esquemaPar = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre del par.'),
  correo: z
    .string()
    .trim()
    .min(1, 'Escriba el correo electrónico.')
    .regex(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Escriba un correo válido, por ejemplo nombre@universidad.edu.co.',
    ),
  universidad: z.string().trim().min(1, 'Escriba la universidad.'),
  area: z.string().trim().min(1, 'Escriba el área temática.'),
  autorizoDatos: z.boolean(),
})
export type ParForm = z.infer<typeof esquemaPar>

/** A new candidate typed while assigning peers to an article (RF-12, RF-19). */
export const esquemaCandidato = esquemaPar.omit({ autorizoDatos: true })
export type CandidatoForm = z.infer<typeof esquemaCandidato>

export const esquemaMotivo = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo.'),
})
export type MotivoForm = z.infer<typeof esquemaMotivo>
