/*
 * Imágenes públicas de los correos — the shield of the university, requested by the mail client of
 * the peer (no session).
 */
import { readFileSync } from 'node:fs'
import { Router } from 'express'

export const rutasImagenes = Router()

const ESCUDO = readFileSync(new URL('../../../assets/escudo-cesmag.png', import.meta.url))

// The shield of the university in the header of every mail (public, it is not a secret).
rutasImagenes.get('/imagenes/escudo', (_req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.type('image/png').send(ESCUDO)
})
