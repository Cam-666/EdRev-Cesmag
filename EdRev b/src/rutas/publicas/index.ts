/*
 * Rutas públicas — las únicas que responden sin sesión (ingreso y enlaces de contraseña, la respuesta de un par
 * desde el correo, los eventos del servicio de correo y las imágenes públicas de los correos). Lo que no esté
 * listado aquí es privado: ver rutas/privadas. Cada una se protege a su manera (un token firmado de un solo
 * uso, una firma o un límite de peticiones).
 */
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { rutasAcceso } from './acceso.js'
import { rutasImagenes } from './imagenes.js'
import { rutasInvitaciones } from './invitaciones.js'
import { rutasWebhooks } from './webhooks.js'

export const rutasPublicas = Router()

rutasPublicas.use(rutasAcceso)
// Los eventos del servicio de correo también son públicos: los protege un token y un límite de peticiones frena los intentos de adivinarlo.
rutasPublicas.use(
  '/webhooks',
  rateLimit({ windowMs: 15 * 60_000, limit: 600, standardHeaders: true, legacyHeaders: false }),
)
rutasPublicas.use(rutasWebhooks)
// El par responde desde el correo sin tener cuenta: ruta pública, con límite de peticiones.
rutasPublicas.use(
  '/invitaciones',
  rateLimit({ windowMs: 15 * 60_000, limit: 200, standardHeaders: true, legacyHeaders: false }),
)
rutasPublicas.use(rutasInvitaciones)
// El cliente de correo del par pide las imágenes públicas (el escudo).
rutasPublicas.use(rutasImagenes)
