/*
 * registroCorreos (servicio) — the log of the mails of each journal with its counters and filters
 * (RF-26), the retry of the mails the service failed and of the queue (RF-27), and «corregir y
 * reenviar» of a bounced or failed one: the peer's address is fixed and a new mail is queued
 * (RF-28). The queue itself and the sending are in servicios/correos and servicios/envioCorreos.
 */
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'
import { correosApi, encolar, SELECCION_CORREOS, type FilaCorreo } from './correos.js'

async function correosDeRevista(revista: number) {
  const { rows } = await pool.query<FilaCorreo>(`${SELECCION_CORREOS} WHERE a.id_revista = $1`, [revista])
  return correosApi(rows)
}

export interface FiltrosCorreos {
  tipo: string | null
  estado: string | null
  pagina: number
  porPagina: number
}

export async function listarCorreos(revista: number, f: FiltrosCorreos) {
  const todos = await correosDeRevista(revista)
  const filtrados = todos.filter((c) => (!f.tipo || c.tipo === f.tipo) && (!f.estado || c.estado === f.estado))
  return {
    items: filtrados.slice((f.pagina - 1) * f.porPagina, f.pagina * f.porPagina),
    total: filtrados.length,
    enviados: todos.filter((c) => c.estado === 'enviado').length,
    rebotados: todos.filter((c) => c.estado === 'rebotado' && !c.atendido).length,
    fallidos: todos.filter((c) => c.estado === 'fallido' && !c.atendido).length,
    enCola: todos.filter((c) => c.estado === 'en-cola').length,
  }
}

/** RF-27: every failed or queued mail is queued again as it is (same record, new date). */
export async function reintentarPendientes(revista: number) {
  const pendientes = (await correosDeRevista(revista)).filter(
    (c) => (c.estado === 'fallido' && !c.atendido) || c.estado === 'en-cola',
  )
  await pool.query(
    `UPDATE correo SET resultado = 'en-cola', fecha_envio = now() WHERE id_correo = ANY ($1::int[])`,
    [pendientes.map((c) => Number(c.id))],
  )
  // Until the mail service is connected nothing leaves the queue: none is reported as sent.
  return { reintentados: pendientes.length, enviados: 0, siguenFallando: 0 }
}

export async function reintentarCorreo(revista: number, id: number) {
  const correo = (await correosDeRevista(revista)).find((c) => c.id === String(id))
  if (!correo) throw new ErrorHttp(404, 'Correo no encontrado')
  if (!(correo.estado === 'en-cola' || (correo.estado === 'fallido' && !correo.atendido))) {
    throw new ErrorHttp(409, 'Este correo no necesita reintento')
  }
  await pool.query(`UPDATE correo SET resultado = 'en-cola', fecha_envio = now() WHERE id_correo = $1`, [id])
  return { estado: 'en-cola' }
}

/** Fixes the address of the peer and queues a new mail of the same kind to it. */
export async function corregirYReenviar(revista: number, id: number, nuevoCorreo: string, actor: number) {
  const correo = (await correosDeRevista(revista)).find((c) => c.id === String(id))
  if (!correo) throw new ErrorHttp(404, 'Correo no encontrado')
  if (!['rebotado', 'fallido'].includes(correo.estado) || correo.atendido) {
    throw new ErrorHttp(409, 'Solo se corrige un envío que rebotó o falló')
  }
  await enTransaccion(async (c) => {
    const { rows } = await c.query<{ id_par: number }>('SELECT id_par FROM evaluacion WHERE id_evaluacion = $1', [
      Number(correo.asignacionId),
    ])
    await c.query('UPDATE par_evaluador SET correo = $1 WHERE id_par = $2', [nuevoCorreo, rows[0]?.id_par])
    await encolar(
      c,
      Number(correo.asignacionId),
      correo.tipo === 'agradecimiento' || correo.tipo === 'constancia' ? correo.tipo : 'invitacion',
      nuevoCorreo,
    )
    await auditar(c, {
      usuario: actor,
      tabla: 'correo',
      idRegistro: id,
      accion: 'envio',
      texto: `Corrigió el correo del par y lo reenvió a ${nuevoCorreo}`,
      revista,
      articulo: Number(correo.articuloId),
    })
  })
  return { estado: 'en-cola' }
}
