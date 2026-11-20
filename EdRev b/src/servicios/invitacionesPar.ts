/*
 * invitacionesPar (servicio) — la respuesta del par desde el correo (el par no tiene cuenta): la página que abre
 * un botón del correo de invitación le pide confirmar y luego registra la respuesta por sí sola: acepta, no
 * acepta esta invitación o no desea participar más (el par queda bloqueado). El enlace va firmado y sirve
 * mientras la invitación no haya sido respondida.
 */
import { enTransaccion, pool, type Cliente } from '../db.js'
import { ErrorHttp, siglaDe } from '../lib/http.js'
import { leerRespuesta } from '../lib/respuestas.js'
import { aplicarRespuesta, type EvaluacionParaResponder } from './respuestas.js'

interface Fila extends EvaluacionParaResponder {
  revista: string
  articulo: string
  par: string
}

const SELECCION = `
  SELECT e.id_evaluacion, e.id_articulo, e.id_par, e.estado_par, a.id_revista,
         r.nombre AS revista, a.titulo AS articulo, p.nombre AS par
    FROM evaluacion e
    JOIN articulo a ON a.id_articulo = e.id_articulo
    JOIN revista r ON r.id_revista = a.id_revista
    JOIN par_evaluador p ON p.id_par = e.id_par
   WHERE e.id_evaluacion = $1`

async function cargar(c: Cliente, id: number, bloquear = false): Promise<Fila> {
  const { rows } = await c.query<Fila>(`${SELECCION}${bloquear ? ' FOR UPDATE OF e' : ''}`, [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Enlace no válido', { motivo: 'invalido' })
  return rows[0]
}

/** Lo que muestra la página antes de que el par confirme. */
export async function datosDeLaInvitacion(token: string) {
  const { idEvaluacion, accion } = leerRespuesta(token)
  const f = await cargar(pool, idEvaluacion)
  return {
    accion,
    revista: f.revista,
    sigla: siglaDe(f.id_revista),
    articulo: f.articulo,
    par: f.par,
    respondida: f.estado_par !== 'invitado',
  }
}

/** Registra la respuesta que el par confirmó. */
export async function responderDesdeCorreo(token: string) {
  const { idEvaluacion, accion } = leerRespuesta(token)
  await enTransaccion(async (c) => {
    const f = await cargar(c, idEvaluacion, true)
    await aplicarRespuesta(c, f, accion, null, true)
  })
  return { accion }
}
