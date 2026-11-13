/*
 * enlaces — the links to define a password: the activation of a new account (RF-40) and the
 * recovery (RF-46). Temporary and signed by the server, no table needed (D15): they last 30
 * minutes and carry a piece of the current password hash, so once the password changes the link
 * no longer works (single use, RNF-04). Each new link also leaves the older ones without effect.
 */
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import type { Cliente } from '../db.js'
import { ErrorHttp } from './http.js'

export type MotivoEnlace = 'activacion' | 'recuperacion'
const SECRETO = () => `${config.jwtSecreto}:enlaces`
const huella = (hash: string) => hash.slice(-16)

/**
 * Renews the hash (so older links stop working) and returns the path of the new link. A new
 * account gets a random password nobody knows until its owner defines one.
 */
export async function crearEnlace(c: Cliente, idUsuario: number, motivo: MotivoEnlace): Promise<string> {
  const { rows } = await c.query<{ contrasena_hash: string }>(
    'SELECT contrasena_hash FROM usuario WHERE id_usuario = $1',
    [idUsuario],
  )
  let hash = rows[0]?.contrasena_hash ?? ''
  if (motivo === 'activacion' || !hash) {
    hash = await bcrypt.hash(randomBytes(24).toString('hex'), 10)
    await c.query('UPDATE usuario SET contrasena_hash = $1 WHERE id_usuario = $2', [hash, idUsuario])
  }
  const token = jwt.sign({ sub: String(idUsuario), motivo, h: huella(hash) }, SECRETO(), {
    expiresIn: '30m',
  })
  return `/acceso/contrasena?token=${encodeURIComponent(token)}`
}

/** Valid link → its account; otherwise 410 «vencido» / «usado» or 404 «invalido». */
export async function leerEnlace(c: Cliente, token: string) {
  let datos: { sub: string; motivo: MotivoEnlace; h: string }
  try {
    datos = jwt.verify(token, SECRETO()) as typeof datos
  } catch (e) {
    const vencido = (e as Error).name === 'TokenExpiredError'
    throw new ErrorHttp(vencido ? 410 : 404, 'Enlace no válido', { motivo: vencido ? 'vencido' : 'invalido' })
  }
  const { rows } = await c.query<{
    id_usuario: number
    nombre: string
    correo: string
    activo: boolean
    contrasena_hash: string
  }>('SELECT id_usuario, nombre, correo, activo, contrasena_hash FROM usuario WHERE id_usuario = $1', [
    Number(datos.sub),
  ])
  const u = rows[0]
  if (!u || !u.activo) throw new ErrorHttp(404, 'Enlace no válido', { motivo: 'invalido' })
  if (huella(u.contrasena_hash) !== datos.h) throw new ErrorHttp(410, 'Enlace ya usado', { motivo: 'usado' })
  return { usuario: u, motivo: datos.motivo }
}

/**
 * While the mail service is not connected, the API returns the link so the demo can open it
 * (ENLACE_DEMO=false hides it; in production the link only travels by mail).
 */
export const enlaceDemo = (ruta: string) => (process.env.ENLACE_DEMO === 'false' ? {} : { enlaceDemo: ruta })
