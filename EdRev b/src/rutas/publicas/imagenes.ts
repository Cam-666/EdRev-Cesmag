/*
 * Imágenes públicas de los correos — the footer image of a mail template, requested by the mail
 * client of the peer (no session): the address is signed, see lib/imagenCorreo.
 */
import { readFileSync } from 'node:fs'
import { Router } from 'express'
import { pool } from '../../db.js'
import { ErrorHttp, idNumerico } from '../../lib/http.js'
import { firmaValida } from '../../lib/imagenCorreo.js'

export const rutasImagenes = Router()

const ESCUDO = readFileSync(new URL('../../../assets/escudo-cesmag.png', import.meta.url))

// The shield of the university in the header of every mail (public, it is not a secret).
rutasImagenes.get('/imagenes/escudo', (_req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.type('image/png').send(ESCUDO)
})

rutasImagenes.get('/imagenes/plantillas/:id/pie', async (req, res) => {
  const id = idNumerico(req.params.id, 'Imagen')
  if (!firmaValida(id, req.query.f)) throw new ErrorHttp(404, 'Imagen no encontrada')
  const { rows } = await pool.query<{ pie: Buffer | null }>(
    "SELECT pie FROM plantilla WHERE id_plantilla = $1 AND clase = 'correo'",
    [id],
  )
  const imagen = rows[0]?.pie
  if (!imagen) throw new ErrorHttp(404, 'Imagen no encontrada')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.type(imagen[0] === 0x89 ? 'image/png' : 'image/jpeg')
  res.send(imagen)
})
