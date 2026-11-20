/*
 * autenticacion — el token de sesión (JWT) y los guardias de las rutas. La Auxiliar puede hacer todo menos
 * Administración; el perfil se lee de la base de datos en cada petición, así una cuenta inhabilitada deja de
 * funcionar de inmediato aunque su token no haya vencido.
 */
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { pool } from '../db.js'
import { ErrorHttp } from '../lib/http.js'

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
    algorithm: 'HS256',
    expiresIn: `${config.jwtHoras}h`,
  })
}

export async function requiereSesion(req: Request, _res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization ?? ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : ''
  let id: number
  try {
    // Se comprueban la firma, el vencimiento y el algoritmo; un token firmado de otra manera se rechaza.
    const datos = jwt.verify(token, config.jwtSecreto, { algorithms: ['HS256'] }) as { sub?: string }
    id = Number(datos.sub)
    if (!Number.isInteger(id)) throw new Error('sub')
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

/** Administración es solo de la Administradora. */
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
