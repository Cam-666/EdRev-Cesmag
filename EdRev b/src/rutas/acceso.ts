/*
 * Acceso — login with institutional email and password (RF-39), with the attempt counter and the
 * 15-minute lockout the screens show, and the password-recovery request (RF-46; it always answers
 * 202 so accounts cannot be enumerated). Mail sending of the link is pending.
 */
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { pool } from '../db.js'
import { firmarToken } from '../lib/auth.js'
import { usuarioApi, type FilaUsuario } from '../lib/mapeo.js'

const intentos = new Map<string, number>()
const bloqueos = new Map<string, number>()

const credenciales = z.object({ correo: z.string(), contrasena: z.string() })

export const rutasAcceso = Router()

rutasAcceso.post('/auth/login', async (req, res) => {
  const { correo, contrasena } = credenciales.parse(req.body)
  const clave = correo.trim().toLowerCase()

  const hasta = bloqueos.get(clave)
  if (hasta !== undefined && hasta > Date.now()) {
    res.status(423).json({ motivo: 'bloqueada', bloqueadoHasta: new Date(hasta).toISOString() })
    return
  }

  const { rows } = await pool.query<FilaUsuario & { contrasena_hash: string }>(
    'SELECT * FROM usuario WHERE correo = $1',
    [clave],
  )
  const fila = rows[0]
  if (fila && !fila.activo) {
    res.status(403).json({ motivo: 'inhabilitada' })
    return
  }
  const valida = fila ? await bcrypt.compare(contrasena, fila.contrasena_hash) : false
  if (!fila || !valida) {
    const intento = (intentos.get(clave) ?? 0) + 1
    if (intento >= config.intentosIngreso) {
      const fin = Date.now() + config.bloqueoMinutos * 60_000
      intentos.delete(clave)
      bloqueos.set(clave, fin)
      res.status(423).json({ motivo: 'bloqueada', bloqueadoHasta: new Date(fin).toISOString() })
      return
    }
    intentos.set(clave, intento)
    res.status(401).json({ motivo: 'credenciales', intento, maximo: config.intentosIngreso })
    return
  }

  intentos.delete(clave)
  const { rows: actualizada } = await pool.query<FilaUsuario>(
    'UPDATE usuario SET ultimo_ingreso = now() WHERE id_usuario = $1 RETURNING *',
    [fila.id_usuario],
  )
  res.json({ usuario: usuarioApi(actualizada[0] ?? fila), token: firmarToken(fila.id_usuario) })
})

// RF-46: always 202. TODO: issue the signed 30-minute link and send it through the mail service.
rutasAcceso.post('/auth/recuperar', (_req, res) => {
  res.status(202).json({})
})
