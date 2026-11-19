/*
 * acceso (servicio) — login with institutional email and password (RF-39), with the attempt counter
 * and the lockout the screens show, the password-recovery request (RF-46) and the links to define a
 * password (RF-40, RF-46). The counters live in memory: they only slow down guessing, the real
 * protection is the password hash and the limit of requests (app.ts).
 */
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { pool } from '../db.js'
import { crearEnlace, enlaceDemo, leerEnlace } from '../lib/enlaces.js'
import { ErrorHttp } from '../lib/http.js'
import { usuarioApi, type FilaUsuario } from '../lib/mapeo.js'
import { firmarToken } from '../middlewares/autenticacion.js'
import { enviarEnlaceContrasena } from './correoCuentas.js'

const intentos = new Map<string, number>()
const bloqueos = new Map<string, number>()

export type ResultadoLogin =
  | { tipo: 'ok'; usuario: ReturnType<typeof usuarioApi>; token: string }
  | { tipo: 'bloqueada'; bloqueadoHasta: string }
  | { tipo: 'inhabilitada' }
  | { tipo: 'credenciales'; intento: number; maximo: number }

export async function iniciarSesion(correo: string, contrasena: string): Promise<ResultadoLogin> {
  const clave = correo.trim().toLowerCase()

  const hasta = bloqueos.get(clave)
  if (hasta !== undefined && hasta > Date.now()) {
    return { tipo: 'bloqueada', bloqueadoHasta: new Date(hasta).toISOString() }
  }

  const { rows } = await pool.query<FilaUsuario & { contrasena_hash: string }>(
    'SELECT * FROM usuario WHERE correo = $1',
    [clave],
  )
  const fila = rows[0]
  if (fila && !fila.activo) return { tipo: 'inhabilitada' }
  const valida = fila ? await bcrypt.compare(contrasena, fila.contrasena_hash) : false
  if (!fila || !valida) {
    const intento = (intentos.get(clave) ?? 0) + 1
    if (intento >= config.intentosIngreso) {
      const fin = Date.now() + config.bloqueoMinutos * 60_000
      intentos.delete(clave)
      bloqueos.set(clave, fin)
      return { tipo: 'bloqueada', bloqueadoHasta: new Date(fin).toISOString() }
    }
    intentos.set(clave, intento)
    return { tipo: 'credenciales', intento, maximo: config.intentosIngreso }
  }

  intentos.delete(clave)
  const { rows: actualizada } = await pool.query<FilaUsuario>(
    'UPDATE usuario SET ultimo_ingreso = now() WHERE id_usuario = $1 RETURNING *',
    [fila.id_usuario],
  )
  return { tipo: 'ok', usuario: usuarioApi(actualizada[0] ?? fila), token: firmarToken(fila.id_usuario) }
}

/** RF-46: the answer is the same whether or not the account exists, so accounts cannot be enumerated. */
export async function solicitarRecuperacion(correo: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query<{ id_usuario: number; nombre: string }>(
    'SELECT id_usuario, nombre FROM usuario WHERE correo = $1 AND activo',
    [correo.trim().toLowerCase()],
  )
  const fila = rows[0]
  if (!fila) return {}
  const ruta = await crearEnlace(pool, fila.id_usuario, 'recuperacion')
  enviarEnlaceContrasena(correo.trim().toLowerCase(), fila.nombre, 'recuperacion', ruta)
  return enlaceDemo(ruta)
}

export async function datosDelEnlace(token: string) {
  const { usuario, motivo } = await leerEnlace(pool, token)
  return { motivo, nombre: usuario.nombre, correo: usuario.correo }
}

const CONTRASENA_SEGURA = /^(?=.*[A-Za-zÁÉÍÓÚÑáéíóúñ])(?=.*\d).{8,}$/

export async function definirContrasena(token: string, contrasena: string): Promise<void> {
  const { usuario } = await leerEnlace(pool, token)
  if (!CONTRASENA_SEGURA.test(contrasena)) {
    throw new ErrorHttp(422, 'La contraseña necesita al menos 8 caracteres, con letras y números')
  }
  await pool.query('UPDATE usuario SET contrasena_hash = $1 WHERE id_usuario = $2', [
    await bcrypt.hash(contrasena, 10),
    usuario.id_usuario,
  ])
  intentos.delete(usuario.correo)
  bloqueos.delete(usuario.correo)
}
