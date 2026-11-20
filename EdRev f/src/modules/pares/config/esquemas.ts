/* esquemas — validación con Zod de los formularios de pares. */
import { z } from 'zod'

export const esquemaPar = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre del par.'),
  profesion: z.string().trim().min(1, 'Escriba la profesión o el título del par.'),
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
})
export type ParForm = z.infer<typeof esquemaPar>

/** Un candidato nuevo escrito mientras se asignan pares a un artículo. */
export const esquemaCandidato = esquemaPar
export type CandidatoForm = z.infer<typeof esquemaCandidato>

export const esquemaMotivo = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo.'),
})
export type MotivoForm = z.infer<typeof esquemaMotivo>
