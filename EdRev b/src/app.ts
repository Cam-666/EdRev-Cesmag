/*
 * app — la aplicación Express. El orden de lo que se monta define qué es público y qué es privado:
 * 1. cabeceras de seguridad, CORS para la interfaz y JSON;
 * 2. rutas/publicas — sin sesión (ingreso, la respuesta del par desde el correo, imágenes públicas);
 * 3. middlewares/autenticacion — valida el JWT (firma, vencimiento) y carga al usuario;
 * 4. rutas/privadas — todo lo demás, detrás de la sesión;
 * 5. middlewares/errores — el 404 y el manejador de errores, que responde { mensaje }.
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
  // Freno a la fuerza bruta en el ingreso y en los enlaces de contraseña (las pantallas además se bloquean tras 3 intentos).
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
