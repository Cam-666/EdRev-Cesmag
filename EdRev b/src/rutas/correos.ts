/*
 * Correos enviados — the log of each journal with its counters and filters (RF-26), retry of the
 * mails the service failed and of the queue (RF-27), and «corregir y reenviar» of a bounced or
 * failed one: the peer's address is fixed and a new mail is queued (RF-28).
 */
import { Router } from 'express'
import { z } from 'zod'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { usuarioDe } from '../lib/auth.js'
import { CORREO_VALIDO, ErrorHttp, idNumerico, idRevista } from '../lib/http.js'
import { correosApi, encolar, SELECCION_CORREOS, type FilaCorreo } from '../servicios/correos.js'

export const rutasCorreos = Router()

async function correosDeRevista(revista: number) {
  const { rows } = await pool.query<FilaCorreo>(`${SELECCION_CORREOS} WHERE a.id_revista = $1`, [revista])
  return correosApi(rows)
}

rutasCorreos.get('/:revista/correos', async (req, res) => {
  const todos = await correosDeRevista(idRevista(req.params.revista))
  const tipo = req.query.tipo ? String(req.query.tipo) : null
  const estado = req.query.estado ? String(req.query.estado) : null
  const pagina = Math.max(1, Number(req.query.pagina ?? 1))
  const porPagina = Math.min(100, Math.max(1, Number(req.query.porPagina ?? 10)))
  const filtrados = todos.filter((c) => (!tipo || c.tipo === tipo) && (!estado || c.estado === estado))
  res.json({
    items: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
    total: filtrados.length,
    enviados: todos.filter((c) => c.estado === 'enviado').length,
    rebotados: todos.filter((c) => c.estado === 'rebotado' && !c.atendido).length,
    fallidos: todos.filter((c) => c.estado === 'fallido' && !c.atendido).length,
    enCola: todos.filter((c) => c.estado === 'en-cola').length,
  })
})

/** RF-27: a failed or queued mail is queued again as it is (same record, new date). */
rutasCorreos.post('/:revista/correos/reintentar-fallidos', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const pendientes = (await correosDeRevista(revista)).filter(
    (c) => (c.estado === 'fallido' && !c.atendido) || c.estado === 'en-cola',
  )
  await pool.query(
    `UPDATE correo SET resultado = 'en-cola', fecha_envio = now() WHERE id_correo = ANY ($1::int[])`,
    [pendientes.map((c) => Number(c.id))],
  )
  // Until the mail service is connected nothing leaves the queue: none is reported as sent.
  res.json({ reintentados: pendientes.length, enviados: 0, siguenFallando: 0 })
})

rutasCorreos.post('/:revista/correos/:id/reintentar', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Correo')
  const correo = (await correosDeRevista(revista)).find((c) => c.id === String(id))
  if (!correo) throw new ErrorHttp(404, 'Correo no encontrado')
  if (!(correo.estado === 'en-cola' || (correo.estado === 'fallido' && !correo.atendido))) {
    throw new ErrorHttp(409, 'Este correo no necesita reintento')
  }
  await pool.query(`UPDATE correo SET resultado = 'en-cola', fecha_envio = now() WHERE id_correo = $1`, [id])
  res.json({ estado: 'en-cola' })
})

rutasCorreos.post('/:revista/correos/:id/corregir', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Correo')
  const usuario = usuarioDe(req)
  const { correo: nuevo } = z
    .object({ correo: z.string().trim().toLowerCase().regex(CORREO_VALIDO, 'Escriba un correo válido') })
    .parse(req.body)
  const correo = (await correosDeRevista(revista)).find((c) => c.id === String(id))
  if (!correo) throw new ErrorHttp(404, 'Correo no encontrado')
  if (!['rebotado', 'fallido'].includes(correo.estado) || correo.atendido) {
    throw new ErrorHttp(409, 'Solo se corrige un envío que rebotó o falló')
  }
  await enTransaccion(async (c) => {
    const { rows } = await c.query<{ id_par: number }>(
      'SELECT id_par FROM evaluacion WHERE id_evaluacion = $1',
      [Number(correo.asignacionId)],
    )
    await c.query('UPDATE par_evaluador SET correo = $1 WHERE id_par = $2', [nuevo, rows[0]?.id_par])
    await encolar(c, Number(correo.asignacionId), correo.tipo === 'agradecimiento' ? 'agradecimiento' : 'invitacion', nuevo)
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'correo',
      idRegistro: id,
      accion: 'envio',
      texto: `Corrigió el correo del par y lo reenvió a ${nuevo}`,
      revista,
      articulo: Number(correo.articuloId),
    })
  })
  res.json({ estado: 'en-cola' })
})
