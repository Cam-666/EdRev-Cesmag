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

/** New password: at least 8 characters with letters and numbers, typed twice. */
export const esquemaNuevaContrasena = z
  .object({
    contrasena: z
      .string()
      .min(
        POLITICA_ACCESO.contrasenaMinima,
        `Use al menos ${POLITICA_ACCESO.contrasenaMinima} caracteres.`,
      )
      .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, 'Incluya al menos una letra.')
      .regex(/\d/, 'Incluya al menos un número.'),
    confirmacion: z.string().min(1, 'Escriba de nuevo la contraseña.'),
  })
  .refine((v) => v.contrasena === v.confirmacion, {
    path: ['confirmacion'],
    message: 'Las dos contraseñas no coinciden.',
  })

export type DatosIngreso = z.infer<typeof esquemaIngreso>
export type DatosNuevaContrasena = z.infer<typeof esquemaNuevaContrasena>
export type DatosRecuperacion = z.infer<typeof esquemaRecuperacion>
