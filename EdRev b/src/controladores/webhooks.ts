/*
 * webhooks (controlador) — recibe los eventos del servicio de correo (rebotes, bloqueos). Es una ruta pública
 * que se protege con un token compartido (BREVO_WEBHOOK_TOKEN). Las reglas están en servicios/eventosCorreo.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { ErrorHttp } from '../lib/http.js'
import { registrarEventos, type EventoCorreo } from '../servicios/eventosCorreo.js'

/** Compara en tiempo constante, para que el token no pueda adivinarse midiendo cuánto tarda la respuesta. */
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
