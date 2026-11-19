/*
 * Rutas públicas — the only ones that answer without a session (login and password links, the
 * answer of a peer from the mail, the mail service's events and the public images of the mails).
 * Anything that is not listed here is private: see rutas/privadas. Each of these routes protects
 * itself in its own way (a signed, single-use token, a signature or a limit of requests).
 */
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { rutasAcceso } from './acceso.js'
import { rutasImagenes } from './imagenes.js'
import { rutasInvitaciones } from './invitaciones.js'
import { rutasWebhooks } from './webhooks.js'

export const rutasPublicas = Router()

rutasPublicas.use(rutasAcceso)
// The mail service's events are public too: a token protects them and a limit of requests slows guessing.
rutasPublicas.use(
  '/webhooks',
  rateLimit({ windowMs: 15 * 60_000, limit: 600, standardHeaders: true, legacyHeaders: false }),
)
rutasPublicas.use(rutasWebhooks)
// The peer answers from the mail without an account: public, with a limit of requests.
rutasPublicas.use(
  '/invitaciones',
  rateLimit({ windowMs: 15 * 60_000, limit: 200, standardHeaders: true, legacyHeaders: false }),
)
rutasPublicas.use(rutasInvitaciones)
// The footer image of the mails is requested by the mail client of the peer (signed address).
rutasPublicas.use(rutasImagenes)
