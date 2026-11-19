/*
 * Webhook de Brevo — the mail service reports what happened after accepting a mail (RF-27). Brevo
 * is configured to call /api/webhooks/brevo?token=BREVO_WEBHOOK_TOKEN. The routes only say where
 * the request goes; the rules are in servicios/eventosCorreo.
 */
import { Router } from 'express'
import * as webhooks from '../../controladores/webhooks.js'

export const rutasWebhooks = Router()

rutasWebhooks.post('/webhooks/brevo', webhooks.eventosBrevo)
