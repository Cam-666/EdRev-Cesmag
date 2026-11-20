/*
 * registroCorreos (servicio) — el registro de correos de cada revista con sus contadores y filtros, el reintento
 * de los correos que falló el servicio y de los que siguen en cola, y «corregir y reenviar» uno rebotado o
 * fallido: se corrige la dirección del par y se encola un correo nuevo. La cola y el envío están en
 * servicios/correos y servicios/envioCorreos.
 */
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'
import { correosApi, encolar, SELECCION_CORREOS, type FilaCorreo } from './correos.js'
import { mensajesDeRevista } from './mensajes.js'

async function correosDeRevista(revista: number) {
  const { rows } = await pool.query<FilaCorreo>(`${SELECCION_CORREOS} WHERE a.id_revista = $1`, [revista])
  // Los mensajes que se envían a mano a un par o a un autor van en el mismo registro, mezclados por fecha.
  const mensajes = await mensajesDeRevista(revista)
  return [...correosApi(rows), ...mensajes].sort((a, b) => (b.fechaEnvio ?? '').localeCompare(a.fechaEnvio ?? ''))
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

/** Todo correo fallido o en cola vuelve a encolarse tal cual (mismo registro, fecha nueva). */
export async function reintentarPendientes(revista: number) {
  const pendientes = (await correosDeRevista(revista)).filter(
    (c) => (c.estado === 'fallido' && !c.atendido) || c.estado === 'en-cola',
  )
  await pool.query(
    `UPDATE correo SET resultado = 'en-cola', fecha_envio = now() WHERE id_correo = ANY ($1::int[])`,
    [pendientes.filter((c) => !c.id.startsWith('m')).map((c) => Number(c.id))],
  )
  await pool.query(
    `UPDATE mensaje SET resultado = 'en-cola', fecha_envio = now() WHERE id_mensaje = ANY ($1::int[])`,
    [pendientes.filter((c) => c.id.startsWith('m')).map((c) => Number(c.id.slice(1)))],
  )
  // Mientras el servicio de correo no esté conectado nada sale de la cola: ninguno se reporta como enviado.
  return { reintentados: pendientes.length, enviados: 0, siguenFallando: 0 }
}

export async function reintentarCorreo(revista: number, id: string) {
  const correo = (await correosDeRevista(revista)).find((c) => c.id === id)
  if (!correo) throw new ErrorHttp(404, 'Correo no encontrado')
  if (!(correo.estado === 'en-cola' || (correo.estado === 'fallido' && !correo.atendido))) {
    throw new ErrorHttp(409, 'Este correo no necesita reintento')
  }
  if (id.startsWith('m')) {
    await pool.query(`UPDATE mensaje SET resultado = 'en-cola', fecha_envio = now() WHERE id_mensaje = $1`, [Number(id.slice(1))])
  } else {
    await pool.query(`UPDATE correo SET resultado = 'en-cola', fecha_envio = now() WHERE id_correo = $1`, [Number(id)])
  }
  return { estado: 'en-cola' }
}

/** Corrige la dirección del par y encola hacia ella un correo nuevo del mismo tipo. */
export async function corregirYReenviar(revista: number, idTexto: string, nuevoCorreo: string, actor: number) {
  const correo = (await correosDeRevista(revista)).find((c) => c.id === idTexto)
  if (!correo) throw new ErrorHttp(404, 'Correo no encontrado')
  if (correo.tipo === 'mensaje') {
    throw new ErrorHttp(409, 'Corrija el correo en la ficha de la persona y vuelva a enviarle el mensaje')
  }
  const id = Number(idTexto)
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
