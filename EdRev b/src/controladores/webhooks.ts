/*
 * webhooks (controlador) — receives the events of the mail service. It is a public route that
 * protects itself with a shared token (BREVO_WEBHOOK_TOKEN); the rules are in servicios/eventosCorreo.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { ErrorHttp } from '../lib/http.js'
import { registrarEventos, type EventoCorreo } from '../servicios/eventosCorreo.js'

/** Compares in constant time, so the token cannot be guessed by measuring the answers. */
function mismoToken(recibido: string, esperado: string): boolean {
  const a = createHash('sha256').update(recibido).digest()
  const b = createHash('sha256').update(esperado).digest()
  return timingSafeEqual(a, b)
}

export async function eventosBrevo(req: Request, res: Response): Promise<void> {
  const esperado = process.env.BREVO_WEBHOOK_TOKEN
  if (!esperado || !mismoToken(String(req.query.token ?? ''), esperado)) throw new ErrorHttp(401, 'Webhook no autorizado')
  const eventos: EventoCorreo[] = Array.isArray(req.body) ? req.body : [req.body]
  await registrarEventos(eventos)
  res.json({ recibido: true })
}
