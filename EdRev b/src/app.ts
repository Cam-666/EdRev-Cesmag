/*
 * app — the Express application: CORS for the frontend, JSON, the public access routes, the
 * routes behind the session, and the error handler that answers { mensaje } like the simulated
 * API, so the frontend shows the same messages.
 */
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import express, { type NextFunction, type Request, type Response } from 'express'
import { ZodError } from 'zod'
import { config } from './config.js'
import { requiereSesion } from './lib/auth.js'
import { ErrorHttp } from './lib/http.js'
import { rutasAcceso } from './rutas/acceso.js'
import { rutasAdmin } from './rutas/admin.js'
import { rutasInformes } from './rutas/informes.js'
import { rutasArticulos } from './rutas/articulos.js'
import { rutasAsignaciones } from './rutas/asignaciones.js'
import { rutasAutores } from './rutas/autores.js'
import { rutasConstancias } from './rutas/constancias.js'
import { rutasCorreos } from './rutas/correos.js'
import { rutasPanel } from './rutas/panel.js'
import { rutasPares } from './rutas/pares.js'
import { rutasWebhooks } from './rutas/webhooks.js'

export function crearApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: config.origenes }))
  // Brute force on the login and the password links (the screens also lock after 3 attempts).
  app.use(['/api/auth'], rateLimit({ windowMs: 15 * 60_000, limit: 100, standardHeaders: true, legacyHeaders: false }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok' })
  })
  app.use('/api', rutasAcceso)
  app.use('/api', rutasWebhooks)

  const privadas = express.Router()
  privadas.use(requiereSesion)
  privadas.use(rutasAdmin)
  privadas.use(rutasInformes)
  privadas.use(rutasPanel)
  privadas.use(rutasArticulos)
  privadas.use(rutasAutores)
  privadas.use(rutasPares)
  privadas.use(rutasAsignaciones)
  privadas.use(rutasConstancias)
  privadas.use(rutasCorreos)
  app.use('/api', privadas)

  app.use((_req, res) => {
    res.status(404).json({ mensaje: 'Recurso no encontrado' })
  })

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ErrorHttp) {
      res.status(error.estado).json({ mensaje: error.message, ...error.cuerpo })
      return
    }
    if (error instanceof ZodError) {
      res.status(422).json({ mensaje: error.issues[0]?.message ?? 'Datos no válidos' })
      return
    }
    const pg = error as { code?: string; message?: string }
    if (pg.code === '23505') {
      res.status(409).json({ mensaje: 'Ya existe un registro con esos datos' })
      return
    }
    if (pg.code === 'P0001' || pg.code === '23514') {
      res.status(409).json({ mensaje: pg.message ?? 'La base de datos rechazó el cambio' })
      return
    }
    console.error(error)
    res.status(500).json({ mensaje: 'Error interno del servidor' })
  })
  return app
}
