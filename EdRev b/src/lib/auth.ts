/*
 * auth — session token (JWT) and the guards of the routes. The Auxiliar can do everything except
 * Administración (RNF-05); the profile is read from the database on every request, so a disabled
 * account stops working at once (HU-29).
 */
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { pool } from '../db.js'
import { ErrorHttp } from './http.js'

export interface UsuarioSesion {
  id: number
  nombre: string
  perfil: 'administrador' | 'auxiliar'
}

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioSesion
  }
}

export function firmarToken(idUsuario: number): string {
  return jwt.sign({ sub: String(idUsuario) }, config.jwtSecreto, {
    expiresIn: `${config.jwtHoras}h`,
  })
}

export async function requiereSesion(req: Request, _res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization ?? ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : ''
  let id: number
  try {
    const datos = jwt.verify(token, config.jwtSecreto) as { sub?: string }
    id = Number(datos.sub)
  } catch {
    throw new ErrorHttp(401, 'No autenticado')
  }
  const { rows } = await pool.query<{ nombre: string; rol: UsuarioSesion['perfil'] }>(
    'SELECT nombre, rol FROM usuario WHERE id_usuario = $1 AND activo',
    [id],
  )
  const fila = rows[0]
  if (!fila) throw new ErrorHttp(401, 'No autenticado')
  req.usuario = { id, nombre: fila.nombre, perfil: fila.rol }
  next()
}

/** Administración is the Administradora's only (RNF-05). */
export function soloAdministradora(req: Request, _res: Response, next: NextFunction) {
  if (req.usuario?.perfil !== 'administrador') {
    throw new ErrorHttp(403, 'Sin permiso para esta acción')
  }
  next()
}

export function usuarioDe(req: Request): UsuarioSesion {
  if (!req.usuario) throw new ErrorHttp(401, 'No autenticado')
  return req.usuario
}
