/*
 * app — the Express application. The order says what is public and what is private:
 *   1. security headers, CORS for the frontend, JSON;
 *   2. rutas/publicas — no session (login, the peer's answer from the mail, public images);
 *   3. middlewares/autenticacion — validates the JWT (signature, expiry) and loads the user;
 *   4. rutas/privadas — everything else, behind the session;
 *   5. middlewares/errores — 404 and the error handler, which answers { mensaje }.
 */
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import express from 'express'
import { config } from './config.js'
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js'
import { requiereSesion } from './middlewares/autenticacion.js'
import { rutasPrivadas } from './rutas/privadas/index.js'
import { rutasPublicas } from './rutas/publicas/index.js'

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

  app.use('/api', rutasPublicas)
  app.use('/api', requiereSesion, rutasPrivadas)

  app.use(rutaNoEncontrada)
  app.use(manejadorErrores)
  return app
}
