/*
 * segundoIntento — RF-29 / RF-15 / D7: if a peer does not answer within the waiting days, the
 * invitation is sent again by itself as the second attempt; if the second one is not answered
 * either, the evaluation goes to «Sin respuesta» and the peer is blocked with that reason.
 * Only invitations that were actually sent count as attempts (a resend after a correction does not
 * add an attempt, RF-28, because it replaces a failed one). Runs every minute.
 * DIAS_ESPERA_RESPUESTA accepts decimals (e.g. 0.002 ≈ 3 minutes) to show it in a demo.
 */
import { config } from '../config.js'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { encolar } from './correos.js'

interface Vencida {
  id_evaluacion: number
  id_articulo: number
  id_revista: number
  id_par: number
  nombre: string
  correo: string | null
  enviados: number
}

async function revisar(): Promise<void> {
  const { rows } = await pool.query<Vencida>(
    `SELECT e.id_evaluacion, e.id_articulo, a.id_revista, p.id_par, p.nombre, p.correo,
            count(c.*) FILTER (WHERE c.resultado = 'enviado')::int AS enviados
       FROM evaluacion e
       JOIN articulo a ON a.id_articulo = e.id_articulo
       JOIN par_evaluador p ON p.id_par = e.id_par
       JOIN correo c ON c.id_evaluacion = e.id_evaluacion AND c.tipo = 'invitacion'
      WHERE e.estado_par = 'invitado'
      GROUP BY e.id_evaluacion, a.id_revista, p.id_par
     HAVING count(*) FILTER (WHERE c.resultado IN ('en-cola','rebotado','fallido')) = 0
        AND max(c.fecha_envio) < now() - make_interval(secs => $1)`,
    [config.diasEspera * 86_400],
  )
  for (const v of rows) {
    await enTransaccion(async (c) => {
      if (v.enviados < config.intentosAntesBloqueo && v.correo) {
        await encolar(c, v.id_evaluacion, 'invitacion', v.correo)
        await auditar(c, {
          usuario: null,
          tabla: 'evaluacion',
          idRegistro: v.id_evaluacion,
          accion: 'envio',
          texto: `Envió el ${v.enviados + 1}.º intento de la invitación a ${v.nombre}`,
          revista: v.id_revista,
          articulo: v.id_articulo,
        })
      } else if (v.enviados >= config.intentosAntesBloqueo) {
        await c.query("UPDATE evaluacion SET estado_par = 'sin-respuesta' WHERE id_evaluacion = $1", [
          v.id_evaluacion,
        ])
        await c.query(
          `UPDATE par_evaluador SET motivo_bloqueo = 'sin-respuesta', fecha_bloqueo = CURRENT_DATE
            WHERE id_par = $1 AND motivo_bloqueo IS NULL`,
          [v.id_par],
        )
        await auditar(c, {
          usuario: null,
          tabla: 'evaluacion',
          idRegistro: v.id_evaluacion,
          accion: 'bloqueo',
          texto: `Bloqueó a ${v.nombre}: no respondió tras el ${v.enviados}.º intento`,
          revista: v.id_revista,
          articulo: v.id_articulo,
        })
      }
    })
  }
}

export function iniciarSegundoIntento(): void {
  let ocupado = false
  setInterval(() => {
    if (ocupado) return
    ocupado = true
    revisar()
      .catch((e: unknown) => console.error('Segundo intento:', (e as Error).message))
      .finally(() => {
        ocupado = false
      })
  }, 60_000)
}
