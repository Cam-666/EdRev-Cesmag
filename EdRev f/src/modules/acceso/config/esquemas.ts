/*
 * esquemas — Zod validation for the access forms. Covers: HU-28.
 * Messages say how to fix the field, never only that it is wrong.
 */
import { z } from 'zod'
import { POLITICA_ACCESO } from './politicaAcceso'

const correoInstitucional = z
  .string()
  .trim()
  .min(1, 'Escriba su correo institucional.')
  .regex(
    /^[^\s@]+@unicesmag\.edu\.co$/i,
    `Use su correo institucional, por ejemplo nombre.apellido${POLITICA_ACCESO.dominioInstitucional}.`,
  )

export const esquemaIngreso = z.object({
  correo: correoInstitucional,
  contrasena: z.string().min(1, 'Escriba su contraseña.'),
})

export const esquemaRecuperacion = z.object({
  correo: correoInstitucional,
})

export type DatosIngreso = z.infer<typeof esquemaIngreso>
export type DatosRecuperacion = z.infer<typeof esquemaRecuperacion>
