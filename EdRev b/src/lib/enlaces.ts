/*
 * enlaces — los enlaces para definir una contraseña: la activación de una cuenta nueva y la recuperación.
 * Son temporales y los firma el servidor, así que no hace falta una tabla: duran 30 minutos y llevan un trozo
 * del hash de la contraseña actual; cuando la contraseña cambia, el enlace deja de servir (un solo uso).
 * Cada enlace nuevo también deja sin efecto a los anteriores.
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
 * Renueva el hash (así los enlaces anteriores dejan de servir) y devuelve la ruta del enlace nuevo. Una
 * cuenta nueva recibe una contraseña aleatoria que nadie conoce hasta que su dueño define la suya.
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
    algorithm: 'HS256',
    expiresIn: '30m',
  })
  return `/acceso/contrasena?token=${encodeURIComponent(token)}`
}

/** Enlace válido → su cuenta; si no, 410 «vencido» / «usado» o 404 «invalido». */
export async function leerEnlace(c: Cliente, token: string) {
  let datos: { sub: string; motivo: MotivoEnlace; h: string }
  try {
    datos = jwt.verify(token, SECRETO(), { algorithms: ['HS256'] }) as typeof datos
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
 * Mientras el servicio de correo no esté conectado, la API devuelve el enlace para que la demostración pueda
 * abrirlo (ENLACE_DEMO=false lo oculta; en producción el enlace solo viaja por correo).
 */
export const enlaceDemo = (ruta: string) => (process.env.ENLACE_DEMO === 'false' ? {} : { enlaceDemo: ruta })
