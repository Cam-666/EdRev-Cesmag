/*
 * eventosCorreo (servicio) — lo que informa el servicio de correo después de aceptar un correo: un rebote duro o
 * una dirección inválida lo marca «rebotado» (hay que corregir la dirección); un rebote blando o un bloqueo, «fallido»
 * (se reintenta). El registro no guarda el identificador del proveedor, así que el correo se busca por su
 * dirección: el «enviado» más reciente.
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
    // El mismo aviso también puede ser de un mensaje que se envió a mano a esa dirección.
    await pool.query(
      `UPDATE mensaje SET resultado = $1
        WHERE id_mensaje = (SELECT id_mensaje FROM mensaje WHERE lower(destinatario) = lower($2)
                              AND resultado = 'enviado' ORDER BY fecha_envio DESC LIMIT 1)`,
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
