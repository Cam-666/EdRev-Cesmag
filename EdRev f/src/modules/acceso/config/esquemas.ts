/*
 * esquemas — validación con Zod de los formularios de acceso.
 * Los mensajes dicen cómo corregir el campo, nunca solo que está mal.
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

/** Contraseña nueva: al menos 8 caracteres con letras y números, escrita dos veces. */
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
