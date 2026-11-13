/*
 * Webhook de Brevo — the mail service reports what happened after accepting a mail (RF-27):
 * a hard bounce or an invalid address marks it «rebotado» (correct the address); a soft bounce or a
 * block, «fallido» (retry). D12 keeps no provider id, so the mail is found by its address: the most
 * recent «enviado» one. Brevo is configured to call /api/webhooks/brevo?token=BREVO_WEBHOOK_TOKEN.
 */
import { Router } from 'express'
import { pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'

export const rutasWebhooks = Router()

const REBOTE = ['hard_bounce', 'invalid_email', 'hardBounce', 'invalid']
const FALLO = ['soft_bounce', 'blocked', 'error', 'softBounce']

rutasWebhooks.post('/webhooks/brevo', async (req, res) => {
  const esperado = process.env.BREVO_WEBHOOK_TOKEN
  if (!esperado || req.query.token !== esperado) throw new ErrorHttp(401, 'Webhook no autorizado')
  const eventos: Array<{ event?: string; email?: string }> = Array.isArray(req.body) ? req.body : [req.body]
  for (const e of eventos) {
    const resultado = REBOTE.includes(e.event ?? '') ? 'rebotado' : FALLO.includes(e.event ?? '') ? 'fallido' : null
    if (!resultado || !e.email) continue
    const { rows } = await pool.query<{ id_correo: number; id_articulo: number; id_revista: number }>(
      `UPDATE correo c SET resultado = $1
         FROM evaluacion ev JOIN articulo a ON a.id_articulo = ev.id_articulo
        WHERE c.id_evaluacion = ev.id_evaluacion
          AND c.id_correo = (SELECT id_correo FROM correo WHERE lower(destinatario) = lower($2)
                              AND resultado = 'enviado' ORDER BY fecha_envio DESC LIMIT 1)
        RETURNING c.id_correo, a.id_articulo, a.id_revista`,
      [resultado, e.email],
    )
    const fila = rows[0]
    if (fila) {
      await auditar(pool, {
        usuario: null,
        tabla: 'correo',
        idRegistro: fila.id_correo,
        accion: 'fallo',
        texto: resultado === 'rebotado' ? `La dirección ${e.email} rebotó` : `Falló el envío a ${e.email}`,
        revista: fila.id_revista,
        articulo: fila.id_articulo,
      })
    }
  }
  res.json({ recibido: true })
})
