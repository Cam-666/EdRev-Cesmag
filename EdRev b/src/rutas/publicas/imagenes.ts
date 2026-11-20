/* Imágenes públicas de los correos — el escudo de la universidad, que pide el cliente de correo del par (sin sesión). */
import { readFileSync } from 'node:fs'
import { Router } from 'express'

export const rutasImagenes = Router()

const ESCUDO = readFileSync(new URL('../../../assets/escudo-cesmag.png', import.meta.url))

// El escudo de la universidad en el encabezado de todos los correos (es público, no es un secreto).
rutasImagenes.get('/imagenes/escudo', (_req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.type('image/png').send(ESCUDO)
})
