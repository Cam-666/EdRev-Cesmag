/*
 * respuestas — la respuesta de un par a una invitación, que comparten la pantalla (la registra la
 * Administradora o la Auxiliar) y los botones del correo de invitación (el par responde por sí mismo).
 * «Acepto» ocupa un lugar (el artículo pasa a «En evaluación»); «No acepto esta invitación» solo cierra esa
 * invitación; «No desea participar más» además bloquea al par en la base común; «Sin respuesta» lo aplica el
 * sistema tras el segundo intento.
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
 * Registra la respuesta. `usuario` es quien la registra; null cuando el par respondió por correo (el historial lo
 * dice). Lanza 409 si la invitación ya fue respondida.
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
    // El artículo pasa a «En evaluación» cuando acepta el primer par.
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
