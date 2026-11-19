/*
 * respuestas — the answer of a peer to an invitation (RF-22, RF-15), shared by the screen (the
 * Administradora / Auxiliar registers it) and by the buttons of the invitation mail (the peer
 * answers by itself). «Acepto» takes a place (the article goes to «En evaluación»); «No acepto
 * esta invitación» only closes that invitation; «No desea participar más» also blocks the peer in
 * the common base; «Sin respuesta» is applied by the system after the second attempt (RF-29).
 */
import { config } from '../config.js'
import type { Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'

export type Respuesta = 'acepto' | 'no-acepto' | 'no-desea' | 'sin-respuesta'

export interface EvaluacionParaResponder {
  id_evaluacion: number
  id_articulo: number
  id_par: number
  estado_par: string
  id_revista: number
}

const ETIQUETA: Record<Respuesta, string> = {
  acepto: 'aceptó la invitación',
  'no-acepto': 'no aceptó esta invitación',
  'no-desea': 'no desea participar más',
  'sin-respuesta': 'no respondió',
}

/**
 * Registers the answer. `usuario` is who registers it; null when the peer answered by mail (the
 * history then says so). Throws 409 when the invitation was already answered.
 */
export async function aplicarRespuesta(
  c: Cliente,
  e: EvaluacionParaResponder,
  r: Respuesta,
  usuario: number | null,
  porCorreo = false,
): Promise<void> {
  if (e.estado_par !== 'invitado') throw new ErrorHttp(409, 'El par ya respondió esta invitación')
  const id = e.id_evaluacion
  if (r === 'acepto') {
    const ocupados = await c.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM evaluacion WHERE id_articulo = $1 AND estado_par IN ('acepto','entrego')`,
      [e.id_articulo],
    )
    if ((ocupados.rows[0]?.n ?? 0) >= config.maxPares) {
      throw new ErrorHttp(409, 'El artículo ya tiene tres pares que aceptaron')
    }
    await c.query("UPDATE evaluacion SET estado_par = 'acepto' WHERE id_evaluacion = $1", [id])
    // RF-22: the article is «En evaluación» when the first peer accepts.
    await c.query(
      "UPDATE articulo SET estado = 'en-evaluacion' WHERE id_articulo = $1 AND estado = 'en-revision'",
      [e.id_articulo],
    )
  } else if (r === 'no-acepto') {
    await c.query("UPDATE evaluacion SET estado_par = 'no-acepto' WHERE id_evaluacion = $1", [id])
  } else {
    if (r === 'sin-respuesta') {
      const intentos = await c.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM correo WHERE id_evaluacion = $1 AND tipo = 'invitacion' AND resultado = 'enviado'",
        [id],
      )
      if ((intentos.rows[0]?.n ?? 0) < config.intentosAntesBloqueo) {
        throw new ErrorHttp(409, 'El bloqueo por falta de respuesta se aplica tras el segundo intento')
      }
    }
    await c.query('UPDATE evaluacion SET estado_par = $1 WHERE id_evaluacion = $2', [
      r === 'sin-respuesta' ? 'sin-respuesta' : 'no-acepto',
      id,
    ])
    await c.query(
      'UPDATE par_evaluador SET motivo_bloqueo = $1, fecha_bloqueo = CURRENT_DATE WHERE id_par = $2',
      [r === 'sin-respuesta' ? 'sin-respuesta' : 'no-participa', e.id_par],
    )
  }
  await auditar(c, {
    usuario: r === 'sin-respuesta' || porCorreo ? null : usuario,
    tabla: 'evaluacion',
    idRegistro: id,
    accion: r === 'acepto' || r === 'no-acepto' ? 'respuesta' : 'bloqueo',
    texto: porCorreo
      ? `El par respondió desde el correo: ${ETIQUETA[r]}`
      : `Registró la respuesta del par: ${r}`,
    revista: e.id_revista,
    articulo: e.id_articulo,
  })
}
