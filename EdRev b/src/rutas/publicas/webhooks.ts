/*
 * Webhook de Brevo — el servicio de correo avisa qué pasó después de aceptar un correo (rebote, bloqueo).
 * En Brevo se configura para llamar a /api/webhooks/brevo?token=BREVO_WEBHOOK_TOKEN. Las rutas solo dicen a
 * dónde va la petición; las reglas están en servicios/eventosCorreo.
 */
import { Router } from 'express'
import * as webhooks from '../../controladores/webhooks.js'

export const rutasWebhooks = Router()

rutasWebhooks.post('/webhooks/brevo', webhooks.eventosBrevo)
