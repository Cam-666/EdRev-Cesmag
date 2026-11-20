/*
 * asignaciones (servicio) — asignar un par cuando el comité aprobó el artículo, eligiendo uno disponible o
 * registrando un candidato nuevo; como máximo tres pares que aceptaron o entregaron; el par de desempate; la
 * respuesta del par; la entrega y el concepto; y el reenvío solo tras un envío rebotado o fallido.
 * La invitación se registra «en cola»: el servicio de correo la recoge (servicios/envioCorreos).
 */
import { enTransaccion, pool, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { fechaLocal } from '../lib/fechas.js'
import { ErrorHttp, idNumerico } from '../lib/http.js'
import { conceptoDb, mismaInstitucion } from '../lib/mapeo.js'
import { reglaPares } from '../lib/paresArticulo.js'
import type { DatosPar } from '../controladores/esquemas.js'
import { articuloDeRevista, autoresDe, evaluacionesDe, ultimaRonda } from './articulos.js'
import { encolar } from './correos.js'
import { registrarPar } from './pares.js'
import { aplicarRespuesta, type Respuesta } from './respuestas.js'
import { aplicarResultadoDePares } from './resultadoPares.js'

export type ConceptoPar = 'publicable' | 'publicable-con-modificaciones' | 'no-publicable' | 'pendiente-formato'

/** Un par disponible de la base (por id) o un candidato nuevo, ya validado. */
export type PartePorAsignar = { parId: string } | { nuevo: DatosPar }

/** La evaluación, comprobando que pertenece a un artículo de esta revista. */
async function evaluacionDeRevista(c: Cliente, revista: number, id: number) {
  const { rows } = await c.query<{
    id_evaluacion: number
    id_articulo: number
    id_par: number
    estado_par: string
    concepto: string | null
    fecha_asignacion: Date
    id_revista: number
  }>(
    `SELECT e.*, a.id_revista FROM evaluacion e JOIN articulo a ON a.id_articulo = e.id_articulo
      WHERE e.id_evaluacion = $1 AND a.id_revista = $2`,
    [id, revista],
  )
  if (!rows[0]) throw new ErrorHttp(404, 'Asignación no encontrada')
  return rows[0]
}

async function asignacionApi(c: Cliente, idArticulo: number, idEvaluacion: number) {
  const lista = await evaluacionesDe(c, idArticulo)
  const a = lista.find((x) => x.id === String(idEvaluacion))
  if (!a) throw new ErrorHttp(404, 'Asignación no encontrada')
  const { par: _par, constanciaEmitida: _c, ultimoCorreo: _u, ...asignacion } = a
  return asignacion
}

export async function asignarPar(revista: number, idArticulo: number, entrada: PartePorAsignar, actor: number) {
  return enTransaccion(async (c) => {
    const articulo = await articuloDeRevista(c, revista, idArticulo)
    if ((await ultimaRonda(c, idArticulo)) !== 'aprobado' || !['en-revision', 'en-evaluacion'].includes(articulo.estado)) {
      throw new ErrorHttp(409, 'El comité aún no aprueba el artículo: no se pueden asignar pares')
    }
    // Dos pares por artículo; un tercero solo cuando sus conceptos no coinciden.
    const activos = await c.query<{ estado_par: string; concepto: string | null; es_desempate: boolean }>(
      `SELECT estado_par, concepto, es_desempate FROM evaluacion
        WHERE id_articulo = $1 AND estado_par IN ('invitado','acepto','entrego') ORDER BY fecha_asignacion`,
      [idArticulo],
    )
    const regla = reglaPares(activos.rows)
    if (!regla.puede) throw new ErrorHttp(409, regla.motivo ?? 'El artículo ya tiene sus pares evaluadores')

    const par =
      'nuevo' in entrada
        ? await registrarPar(c, revista, actor, entrada.nuevo)
        : (
            await c.query('SELECT * FROM par_evaluador WHERE id_par = $1', [
              idNumerico(entrada.parId, 'Par evaluador'),
            ])
          ).rows[0]
    if (!par) throw new ErrorHttp(404, 'Par evaluador no encontrado')
    if (par.motivo_bloqueo) throw new ErrorHttp(409, 'El par está bloqueado y no recibe nuevas invitaciones')
    if (!par.correo) throw new ErrorHttp(422, 'El par no tiene correo: regístrelo antes de invitarlo')
    const autores = await autoresDe(c, idArticulo)
    const igual = mismaInstitucion(par.universidad, autores)
    if (igual) throw new ErrorHttp(409, igual)
    const ocupado = await c.query(
      `SELECT id_articulo FROM evaluacion WHERE id_par = $1 AND (id_articulo = $2 OR estado_par IN ('invitado','acepto'))`,
      [par.id_par, idArticulo],
    )
    if (ocupado.rows.some((r) => r.id_articulo === idArticulo)) {
      throw new ErrorHttp(409, 'El par ya está asignado a este artículo')
    }
    if (ocupado.rows.length > 0) throw new ErrorHttp(409, 'El par tiene otra evaluación en curso')

    const { rows } = await c.query<{ id_evaluacion: number }>(
      `INSERT INTO evaluacion (id_articulo, id_par, es_desempate) VALUES ($1, $2, $3) RETURNING id_evaluacion`,
      [idArticulo, par.id_par, regla.desempate],
    )
    const idEvaluacion = rows[0]?.id_evaluacion ?? 0
    // La invitación queda en cola de inmediato; el servicio de correo la envía.
    await encolar(c, idEvaluacion, 'invitacion', par.correo)
    await auditar(c, {
      usuario: actor,
      tabla: 'evaluacion',
      idRegistro: idEvaluacion,
      accion: 'asignacion',
      texto: `Asignó al par ${par.nombre}`,
      revista,
      articulo: idArticulo,
    })
    return {
      asignacion: await asignacionApi(c, idArticulo, idEvaluacion),
      par: { id: String(par.id_par), nombre: par.nombre, correo: par.correo },
      correo: { estado: 'en-cola', destinatario: par.correo },
    }
  })
}

/** La respuesta del par a la invitación, registrada por un usuario. */
export async function responderInvitacion(revista: number, id: number, respuesta: Respuesta, actor: number) {
  return enTransaccion(async (c) => {
    const e = await evaluacionDeRevista(c, revista, id)
    await aplicarRespuesta(c, e, respuesta, actor)
    return asignacionApi(c, e.id_articulo, id)
  })
}

/** Marca la entrega con su fecha y, si se da, su concepto. */
export async function marcarEntrega(
  revista: number,
  id: number,
  datos: { fecha: string; concepto?: ConceptoPar },
  actor: number,
) {
  return enTransaccion(async (c) => {
    const e = await evaluacionDeRevista(c, revista, id)
    if (e.estado_par !== 'acepto') {
      throw new ErrorHttp(409, 'Solo se marca la entrega de un par que aceptó la invitación')
    }
    const hoy = fechaLocal()
    if (datos.fecha > hoy) throw new ErrorHttp(422, 'La fecha de entrega no puede ser futura')
    if (datos.fecha < fechaLocal(e.fecha_asignacion)) {
      throw new ErrorHttp(422, 'La fecha de entrega no puede ser anterior a la invitación')
    }
    // La evaluación se registra con su concepto y su fecha; solo entonces se puede emitir la constancia.
    await c.query(
      "UPDATE evaluacion SET estado_par = 'entrego', fecha_evaluacion = $1, concepto = COALESCE($3, concepto) WHERE id_evaluacion = $2",
      [datos.fecha, id, datos.concepto ? conceptoDb(datos.concepto) : null],
    )
    await auditar(c, {
      usuario: actor,
      tabla: 'evaluacion',
      idRegistro: id,
      accion: 'entrega',
      texto: 'Marcó la entrega de la evaluación',
      revista,
      articulo: e.id_articulo,
    })
    // Los conceptos de los pares pueden decidir el artículo.
    if (datos.concepto) await aplicarResultadoDePares(c, revista, e.id_articulo, actor)
    // La página ofrece emitir la constancia de inmediato.
    return { ...(await asignacionApi(c, e.id_articulo, id)), constanciaId: String(id) }
  })
}

/** Registra o corrige el concepto de una evaluación entregada. */
export async function registrarConcepto(revista: number, id: number, concepto: ConceptoPar, actor: number) {
  const e = await evaluacionDeRevista(pool, revista, id)
  if (e.estado_par !== 'entrego') throw new ErrorHttp(409, 'Registre primero la entrega de la evaluación')
  await pool.query('UPDATE evaluacion SET concepto = $1 WHERE id_evaluacion = $2', [conceptoDb(concepto), id])
  await auditar(pool, {
    usuario: actor,
    tabla: 'evaluacion',
    idRegistro: id,
    accion: 'revision',
    texto: `Registró el concepto del par: ${concepto}`,
    revista,
    articulo: e.id_articulo,
  })
  // Los conceptos de los pares pueden decidir el artículo.
  await aplicarResultadoDePares(pool, revista, e.id_articulo, actor)
  return asignacionApi(pool, e.id_articulo, id)
}

/** Solo después de un envío rebotado o fallido; no cuenta como un intento nuevo. */
export async function reenviarInvitacion(revista: number, id: number) {
  const e = await evaluacionDeRevista(pool, revista, id)
  const ultimo = await pool.query<{ resultado: string }>(
    "SELECT resultado FROM correo WHERE id_evaluacion = $1 AND tipo = 'invitacion' ORDER BY fecha_envio DESC LIMIT 1",
    [id],
  )
  if (!['rebotado', 'fallido'].includes(ultimo.rows[0]?.resultado ?? '')) {
    throw new ErrorHttp(409, 'Solo se reenvía cuando el envío anterior rebotó o falló')
  }
  const par = await pool.query<{ id_par: number; nombre: string; correo: string }>(
    'SELECT id_par, nombre, correo FROM par_evaluador WHERE id_par = $1',
    [e.id_par],
  )
  const p = par.rows[0]
  if (!p) throw new ErrorHttp(404, 'Par evaluador no encontrado')
  // Es un correo nuevo (se muestra como «Reenvío por corrección»); el fallido queda en el registro, ya atendido.
  await encolar(pool, id, 'invitacion', p.correo)
  return {
    asignacion: await asignacionApi(pool, e.id_articulo, id),
    par: { id: String(p.id_par), nombre: p.nombre, correo: p.correo },
    correo: { estado: 'en-cola', destinatario: p.correo },
  }
}
