/*
 * Acceso — login with institutional email and password (RF-39), with the attempt counter and the
 * 15-minute lockout the screens show, and the password-recovery request (RF-46; it always answers
 * 202 so accounts cannot be enumerated) and the links to define a password (RF-40, RF-46).
 */
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { pool } from '../db.js'
import { firmarToken } from '../lib/auth.js'
import { crearEnlace, enlaceDemo, leerEnlace } from '../lib/enlaces.js'
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

// RF-46: always 202, whether or not the account exists.
rutasAcceso.post('/auth/recuperar', async (req, res) => {
  const { correo } = z.object({ correo: z.string() }).parse(req.body)
  const { rows } = await pool.query<{ id_usuario: number }>(
    'SELECT id_usuario FROM usuario WHERE correo = $1 AND activo',
    [correo.trim().toLowerCase()],
  )
  const fila = rows[0]
  res.status(202).json(fila ? enlaceDemo(await crearEnlace(pool, fila.id_usuario, 'recuperacion')) : {})
})

rutasAcceso.get('/auth/enlaces/:token', async (req, res) => {
  const { usuario, motivo } = await leerEnlace(pool, req.params.token)
  res.json({ motivo, nombre: usuario.nombre, correo: usuario.correo })
})

const CONTRASENA_SEGURA = /^(?=.*[A-Za-zÁÉÍÓÚÑáéíóúñ])(?=.*\d).{8,}$/

rutasAcceso.post('/auth/enlaces/:token', async (req, res) => {
  const { usuario } = await leerEnlace(pool, req.params.token)
  const { contrasena } = z.object({ contrasena: z.string() }).parse(req.body)
  if (!CONTRASENA_SEGURA.test(contrasena)) {
    res.status(422).json({ mensaje: 'La contraseña necesita al menos 8 caracteres, con letras y números' })
    return
  }
  await pool.query('UPDATE usuario SET contrasena_hash = $1 WHERE id_usuario = $2', [
    await bcrypt.hash(contrasena, 10),
    usuario.id_usuario,
  ])
  intentos.delete(usuario.correo)
  bloqueos.delete(usuario.correo)
  res.status(204).end()
})
