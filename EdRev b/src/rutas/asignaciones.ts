/*
 * Asignación y evaluación — assign a peer once the committee approved the article, choosing an
 * available one or registering a new candidate (RF-19); at most three peers who accepted or
 * delivered; tiebreaker (RF-21); the peer's answer (RF-22); delivery (RF-23) and concept (RF-20);
 * resend only after a bounced or failed send (RF-28).
 * The invitation is recorded «en cola»: the mail service (Brevo) picks it up when it is connected.
 */
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { enTransaccion, pool, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { usuarioDe } from '../lib/auth.js'
import { ErrorHttp, idNumerico, idRevista } from '../lib/http.js'
import { conceptoDb, conflicto, iso, mismaInstitucion } from '../lib/mapeo.js'
import { reglaPares } from '../lib/paresArticulo.js'
import { articuloDeRevista, autoresDe, evaluacionesDe, ultimaRonda } from '../servicios/articulos.js'
import { encolar } from '../servicios/correos.js'
import { registrarPar } from './pares.js'

export const rutasAsignaciones = Router()

interface FilaEvaluacion {
  id_evaluacion: number
  id_articulo: number
  id_par: number
  estado_par: string
  concepto: string | null
  fecha_asignacion: Date
}

/** The evaluation, checking it belongs to an article of this journal. */
async function evaluacionDeRevista(c: Cliente, revista: number, id: number) {
  const { rows } = await c.query<FilaEvaluacion & { id_revista: number }>(
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

const asignar = z.union([z.object({ parId: z.string() }), z.object({ nuevo: z.record(z.string(), z.unknown()) })])

rutasAsignaciones.post('/:revista/articulos/:id/asignaciones', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const idArticulo = idNumerico(req.params.id, 'Artículo')
  const usuario = usuarioDe(req)
  const datos = asignar.parse(req.body)

  const resultado = await enTransaccion(async (c) => {
    const articulo = await articuloDeRevista(c, revista, idArticulo)
    if ((await ultimaRonda(c, idArticulo)) !== 'aprobado' || !['en-revision', 'en-evaluacion'].includes(articulo.estado)) {
      throw new ErrorHttp(409, 'El comité aún no aprueba el artículo: no se pueden asignar pares')
    }
    // Two peers per article; a third only when their concepts do not coincide (RF-19, RF-21).
    const activos = await c.query<{ estado_par: string; concepto: string | null; es_desempate: boolean }>(
      `SELECT estado_par, concepto, es_desempate FROM evaluacion
        WHERE id_articulo = $1 AND estado_par IN ('invitado','acepto','entrego') ORDER BY fecha_asignacion`,
      [idArticulo],
    )
    const regla = reglaPares(activos.rows)
    if (!regla.puede) throw new ErrorHttp(409, regla.motivo ?? 'El artículo ya tiene sus pares evaluadores')

    const par =
      'nuevo' in datos
        ? await registrarPar(c, revista, usuario.id, datos.nuevo)
        : (
            await c.query('SELECT * FROM par_evaluador WHERE id_par = $1', [
              idNumerico(datos.parId, 'Par evaluador'),
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
    // RF-24: the invitation is queued at once; the mail service sends it.
    await encolar(c, idEvaluacion, 'invitacion', par.correo)
    await auditar(c, {
      usuario: usuario.id,
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
      conflicto: conflicto(par.universidad, autores),
      correo: { estado: 'en-cola', destinatario: par.correo },
    }
  })
  res.status(201).json(resultado)
})

const respuesta = z.object({ respuesta: z.enum(['acepto', 'no-acepto', 'no-desea', 'sin-respuesta']) })

rutasAsignaciones.post('/:revista/asignaciones/:id/respuesta', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Asignación')
  const usuario = usuarioDe(req)
  const { respuesta: r } = respuesta.parse(req.body)
  const cuerpo = await enTransaccion(async (c) => {
    const e = await evaluacionDeRevista(c, revista, id)
    if (e.estado_par !== 'invitado') throw new ErrorHttp(409, 'El par ya respondió esta invitación')
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
      usuario: r === 'sin-respuesta' ? null : usuario.id,
      tabla: 'evaluacion',
      idRegistro: id,
      accion: r === 'acepto' || r === 'no-acepto' ? 'respuesta' : 'bloqueo',
      texto: `Registró la respuesta del par: ${r}`,
      revista,
      articulo: e.id_articulo,
    })
    return asignacionApi(c, e.id_articulo, id)
  })
  res.json(cuerpo)
})

rutasAsignaciones.post('/:revista/asignaciones/:id/entrega', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Asignación')
  const usuario = usuarioDe(req)
  const { fecha } = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body)
  const cuerpo = await enTransaccion(async (c) => {
    const e = await evaluacionDeRevista(c, revista, id)
    if (e.estado_par !== 'acepto') {
      throw new ErrorHttp(409, 'Solo se marca la entrega de un par que aceptó la invitación')
    }
    const hoy = new Date().toISOString().slice(0, 10)
    if (fecha > hoy) throw new ErrorHttp(422, 'La fecha de entrega no puede ser futura')
    if (fecha < (iso(e.fecha_asignacion) ?? '').slice(0, 10)) {
      throw new ErrorHttp(422, 'La fecha de entrega no puede ser anterior a la invitación')
    }
    await c.query(
      "UPDATE evaluacion SET estado_par = 'entrego', fecha_evaluacion = $1 WHERE id_evaluacion = $2",
      [fecha, id],
    )
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'evaluacion',
      idRegistro: id,
      accion: 'entrega',
      texto: 'Marcó la entrega de la evaluación',
      revista,
      articulo: e.id_articulo,
    })
    // RF-23: the page offers to issue the constancia right away.
    return { ...(await asignacionApi(c, e.id_articulo, id)), constanciaId: String(id) }
  })
  res.json(cuerpo)
})

const CONCEPTOS = ['publicable', 'publicable-con-modificaciones', 'no-publicable', 'pendiente-formato'] as const

rutasAsignaciones.post('/:revista/asignaciones/:id/concepto', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Asignación')
  const { concepto } = z.object({ concepto: z.enum(CONCEPTOS) }).parse(req.body)
  const e = await evaluacionDeRevista(pool, revista, id)
  if (e.estado_par !== 'entrego') throw new ErrorHttp(409, 'Registre primero la entrega de la evaluación')
  await pool.query('UPDATE evaluacion SET concepto = $1 WHERE id_evaluacion = $2', [conceptoDb(concepto), id])
  await auditar(pool, {
    usuario: usuarioDe(req).id,
    tabla: 'evaluacion',
    idRegistro: id,
    accion: 'revision',
    texto: `Registró el concepto del par: ${concepto}`,
    revista,
    articulo: e.id_articulo,
  })
  res.json(await asignacionApi(pool, e.id_articulo, id))
})

// RF-28: only after a bounced or failed send; it is not a new attempt.
rutasAsignaciones.post('/:revista/asignaciones/:id/reenviar', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Asignación')
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
  // A new mail (shown as «Reenvío por corrección»); the failed one stays in the log, handled.
  await encolar(pool, id, 'invitacion', p.correo)
  res.json({
    asignacion: await asignacionApi(pool, e.id_articulo, id),
    par: { id: String(p.id_par), nombre: p.nombre, correo: p.correo },
    conflicto: null,
    correo: { estado: 'en-cola', destinatario: p.correo },
  })
})
