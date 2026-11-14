/*
 * Respuesta del par desde el correo — public routes (the peer has no account): the page opened by
 * a button of the invitation mail asks to confirm, then registers the answer by itself: accepts,
 * does not accept this invitation, or does not want to participate any more (the peer is blocked).
 * The link is signed and valid while the invitation has not been answered. RF-22, RF-15, RF-24.
 */
import { Router } from 'express'
import { enTransaccion, pool } from '../db.js'
import { ErrorHttp, siglaDe } from '../lib/http.js'
import { leerRespuesta } from '../lib/respuestas.js'
import { aplicarRespuesta, type EvaluacionParaResponder } from '../servicios/respuestas.js'

export const rutasInvitaciones = Router()

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

async function cargar(c: Parameters<typeof aplicarRespuesta>[0], id: number, bloquear = false): Promise<Fila> {
  const { rows } = await c.query<Fila>(`${SELECCION}${bloquear ? ' FOR UPDATE OF e' : ''}`, [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Enlace no válido', { motivo: 'invalido' })
  return rows[0]
}

rutasInvitaciones.get('/invitaciones/:token', async (req, res) => {
  const { idEvaluacion, accion } = leerRespuesta(req.params.token)
  const f = await cargar(pool, idEvaluacion)
  res.json({
    accion,
    revista: f.revista,
    sigla: siglaDe(f.id_revista),
    articulo: f.articulo,
    par: f.par,
    respondida: f.estado_par !== 'invitado',
  })
})

rutasInvitaciones.post('/invitaciones/:token', async (req, res) => {
  const { idEvaluacion, accion } = leerRespuesta(req.params.token)
  await enTransaccion(async (c) => {
    const f = await cargar(c, idEvaluacion, true)
    await aplicarRespuesta(c, f, accion, null, true)
  })
  res.json({ accion })
})
