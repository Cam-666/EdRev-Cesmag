/*
 * esquemas — validación con Zod del formulario de autor: nombre, ORCID, correo, filiación y país. El correo es
 * obligatorio aunque el formulario de Figma no lo muestre.
 */
import { z } from 'zod'

export const esquemaAutor = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre completo.'),
  correo: z
    .string()
    .trim()
    .min(1, 'Escriba el correo electrónico.')
    .regex(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Escriba un correo válido, por ejemplo nombre@universidad.edu.co.',
    ),
  orcid: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])?$/, 'Use el formato 0000-0000-0000-0000.'),
  filiacion: z.string().trim().min(1, 'Escriba la filiación institucional.'),
  pais: z.string().trim().min(1, 'Escriba el país.'),
})

export type AutorForm = z.infer<typeof esquemaAutor>
