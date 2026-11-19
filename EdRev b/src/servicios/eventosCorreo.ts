/*
 * eventosCorreo (servicio) — what the mail service reports after accepting a mail (RF-27): a hard
 * bounce or an invalid address marks it «rebotado» (correct the address); a soft bounce or a block,
 * «fallido» (retry). D12 keeps no provider id, so the mail is found by its address: the most recent
 * «enviado» one.
 */
import { pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'

const REBOTE = ['hard_bounce', 'invalid_email', 'hardBounce', 'invalid']
const FALLO = ['soft_bounce', 'blocked', 'error', 'softBounce']

export interface EventoCorreo {
  event?: string
  email?: string
}

export async function registrarEventos(eventos: EventoCorreo[]): Promise<void> {
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
}
