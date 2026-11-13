/*
 * Pares evaluadores — the own base of each journal (RF-12): list with filters (RF-14), areas
 * already written (RF-13), the record with its history (RF-18), registration (with the warning of
 * the same email in the other journal, RF-12), edition, block and unblock (RF-15, RF-16).
 */
import { Router } from 'express'
import { z } from 'zod'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { usuarioDe } from '../lib/auth.js'
import { CORREO_VALIDO, ErrorHttp, idNumerico, idRevista, siglaDe, sinTildes } from '../lib/http.js'
import { conceptoApi, conflicto, iso, motivoApi, motivoDb } from '../lib/mapeo.js'
import { autoresDe } from '../servicios/articulos.js'

export const rutasPares = Router()

interface FilaPar {
  id_par: number
  id_revista: number
  nombre: string
  correo: string | null
  universidad: string | null
  area: string | null
  profesion: string | null
  motivo_bloqueo: string | null
  fecha_bloqueo: string | null
}

function parApi(p: FilaPar) {
  return {
    id: String(p.id_par),
    revista: siglaDe(p.id_revista),
    nombre: p.nombre,
    profesion: p.profesion ?? '',
    correo: p.correo ?? '',
    universidad: p.universidad ?? '',
    area: p.area ?? '',
    bloqueo: p.motivo_bloqueo ? { motivo: motivoApi(p.motivo_bloqueo), fecha: p.fecha_bloqueo } : null,
  }
}

async function parDeRevista(revista: number, id: number): Promise<FilaPar> {
  const { rows } = await pool.query<FilaPar>(
    'SELECT * FROM par_evaluador WHERE id_par = $1 AND id_revista = $2',
    [id, revista],
  )
  if (!rows[0]) throw new ErrorHttp(404, 'Par evaluador no encontrado')
  return rows[0]
}

rutasPares.get('/:revista/pares', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const q = sinTildes(String(req.query.q ?? '').trim())
  const area = sinTildes(String(req.query.area ?? '').trim())
  const universidad = String(req.query.universidad ?? '')
  const estado = String(req.query.estado ?? 'disponibles')
  const articulo = req.query.articulo ? Number(req.query.articulo) : null
  const pagina = Math.max(1, Number(req.query.pagina ?? 1))
  const porPagina = Math.min(100, Math.max(1, Number(req.query.porPagina ?? 10)))

  const { rows } = await pool.query<FilaPar & { entregadas: number; en_curso: number; en_articulo: boolean }>(
    `SELECT p.*,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_par = p.id_par AND e.estado_par = 'entrego') AS entregadas,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_par = p.id_par
                AND e.estado_par IN ('invitado','acepto')) AS en_curso,
            EXISTS (SELECT 1 FROM evaluacion e WHERE e.id_par = p.id_par AND e.id_articulo = $2) AS en_articulo
       FROM par_evaluador p WHERE p.id_revista = $1 ORDER BY p.nombre`,
    [revista, articulo],
  )
  const autores = articulo ? await autoresDe(pool, articulo) : []
  const todos = rows.map((p) => ({
    fila: p,
    api: {
      ...parApi(p),
      evaluaciones: p.entregadas,
      estado: p.motivo_bloqueo ? 'bloqueado' : conflicto(p.universidad, autores) ? 'conflicto' : 'disponible',
    },
  }))
  const filtrados = todos
    .filter(({ api }) => !q || sinTildes(api.nombre).includes(q) || api.correo.includes(q))
    .filter(({ api }) => !area || sinTildes(api.area).includes(area))
    .filter(({ api }) => !universidad || api.universidad === universidad)
    .filter(({ api, fila }) =>
      estado === 'bloqueados'
        ? api.estado === 'bloqueado'
        : estado === 'disponibles'
          ? api.estado !== 'bloqueado'
          : estado === 'asignables'
            ? api.estado !== 'bloqueado' && fila.en_curso === 0 && !fila.en_articulo
            : true,
    )
  res.json({
    items: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina).map((x) => x.api),
    total: filtrados.length,
    totalBase: todos.length,
    totalBloqueados: todos.filter((x) => x.api.estado === 'bloqueado').length,
  })
})

rutasPares.get('/:revista/pares/areas', async (req, res) => {
  const { rows } = await pool.query<{ area: string }>(
    `SELECT DISTINCT area FROM par_evaluador WHERE id_revista = $1 AND area IS NOT NULL ORDER BY area`,
    [idRevista(req.params.revista)],
  )
  res.json(rows.map((r) => r.area))
})

rutasPares.get('/:revista/pares/universidades', async (req, res) => {
  const { rows } = await pool.query<{ universidad: string }>(
    `SELECT DISTINCT universidad FROM par_evaluador
      WHERE id_revista = $1 AND universidad IS NOT NULL ORDER BY universidad`,
    [idRevista(req.params.revista)],
  )
  res.json(rows.map((r) => r.universidad))
})

// RF-12: the same email in the other journal's base, to warn and copy its data.
rutasPares.get('/:revista/pares/en-otra-revista', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const correo = String(req.query.correo ?? '').trim().toLowerCase()
  const { rows } = await pool.query<FilaPar>(
    'SELECT * FROM par_evaluador WHERE id_revista <> $1 AND correo = $2 LIMIT 1',
    [revista, correo],
  )
  if (!correo || !rows[0]) throw new ErrorHttp(404, 'No está en la otra revista')
  const { id: _id, ...resto } = parApi(rows[0])
  res.json(resto)
})

rutasPares.get('/:revista/pares/:id', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const par = await parDeRevista(revista, idNumerico(req.params.id, 'Par evaluador'))
  const { rows } = await pool.query(
    `SELECT e.*, a.numero_ojs, a.titulo FROM evaluacion e JOIN articulo a ON a.id_articulo = e.id_articulo
      WHERE e.id_par = $1 ORDER BY e.fecha_asignacion DESC`,
    [par.id_par],
  )
  const entregas = rows.filter((e) => e.fecha_evaluacion).map((e) => e.fecha_evaluacion as string).sort()
  res.json({
    ...parApi(par),
    evaluacionesEntregadas: rows.filter((e) => e.estado_par === 'entrego').length,
    invitacionesSinResponder: rows.filter((e) => e.estado_par === 'invitado').length,
    ultimaParticipacion: entregas.at(-1) ?? iso(rows[0]?.fecha_asignacion ?? null),
    participaciones: rows.map((e) => ({
      asignacionId: String(e.id_evaluacion),
      articuloId: String(e.id_articulo),
      numeroOjs: e.numero_ojs,
      titulo: e.titulo,
      estado: e.estado_par,
      concepto: conceptoApi(e.concepto),
      constancia: e.estado_par === 'entrego' ? (e.constancia_emitida ? 'emitida' : 'pendiente') : null,
      fechaInvitacion: iso(e.fecha_asignacion),
      fechaEntrega: e.fecha_evaluacion,
    })),
  })
})

const datosPar = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre'),
  profesion: z.string().trim().optional(),
  correo: z.string().trim().toLowerCase().regex(CORREO_VALIDO, 'Escriba un correo válido'),
  universidad: z.string().trim().min(1, 'Escriba la universidad'),
  area: z.string().trim().min(1, 'Escriba el área temática'),
})

/** Registers a peer in the journal's base; used by the base and by «candidato nuevo». */
export async function registrarPar(
  cliente: Parameters<typeof auditar>[0],
  revista: number,
  usuario: number,
  cuerpo: unknown,
): Promise<FilaPar> {
  const d = datosPar.parse(cuerpo)
  const repetido = await cliente.query(
    'SELECT 1 FROM par_evaluador WHERE id_revista = $1 AND correo = $2',
    [revista, d.correo],
  )
  if (repetido.rows.length > 0) throw new ErrorHttp(409, 'Ya existe un par con ese correo en esta revista')
  const { rows } = await cliente.query<FilaPar>(
    `INSERT INTO par_evaluador (id_revista, nombre, profesion, correo, universidad, area)
     VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6) RETURNING *`,
    [revista, d.nombre, d.profesion ?? '', d.correo, d.universidad, d.area],
  )
  const par = rows[0] as FilaPar
  await auditar(cliente, {
    usuario,
    tabla: 'par_evaluador',
    idRegistro: par.id_par,
    accion: 'registro',
    texto: `Registró al par ${par.nombre}`,
    revista,
  })
  return par
}

rutasPares.post('/:revista/pares', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const par = await enTransaccion((c) => registrarPar(c, revista, usuarioDe(req).id, req.body))
  res.status(201).json({ ...parApi(par), evaluacionesEntregadas: 0, invitacionesSinResponder: 0, ultimaParticipacion: null, participaciones: [] })
})

rutasPares.patch('/:revista/pares/:id', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Par evaluador')
  await parDeRevista(revista, id)
  const d = datosPar.partial().parse(req.body)
  await pool.query(
    `UPDATE par_evaluador SET nombre = COALESCE($1, nombre), profesion = COALESCE($2, profesion),
            correo = COALESCE($3, correo), universidad = COALESCE($4, universidad), area = COALESCE($5, area)
      WHERE id_par = $6`,
    [d.nombre ?? null, d.profesion ?? null, d.correo ?? null, d.universidad ?? null, d.area ?? null, id],
  )
  await auditar(pool, {
    usuario: usuarioDe(req).id,
    tabla: 'par_evaluador',
    idRegistro: id,
    accion: 'edicion',
    texto: 'Editó la ficha del par',
    revista,
  })
  res.json(parApi(await parDeRevista(revista, id)))
})

rutasPares.post('/:revista/pares/:id/bloquear', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Par evaluador')
  const { motivo } = z.object({ motivo: z.enum(['no-desea', 'sin-respuesta']) }).parse(req.body)
  await parDeRevista(revista, id)
  await pool.query(
    'UPDATE par_evaluador SET motivo_bloqueo = $1, fecha_bloqueo = CURRENT_DATE WHERE id_par = $2',
    [motivoDb(motivo), id],
  )
  await auditar(pool, {
    usuario: usuarioDe(req).id,
    tabla: 'par_evaluador',
    idRegistro: id,
    accion: 'bloqueo',
    texto: 'Bloqueó al par',
    revista,
  })
  res.json(parApi(await parDeRevista(revista, id)))
})

rutasPares.post('/:revista/pares/:id/desbloquear', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Par evaluador')
  const { motivo } = z.object({ motivo: z.string().trim().min(1, 'Escriba el motivo') }).parse(req.body)
  await parDeRevista(revista, id)
  await pool.query('UPDATE par_evaluador SET motivo_bloqueo = NULL, fecha_bloqueo = NULL WHERE id_par = $1', [id])
  await auditar(pool, {
    usuario: usuarioDe(req).id,
    tabla: 'par_evaluador',
    idRegistro: id,
    accion: 'desbloqueo',
    texto: `Desbloqueó al par: ${motivo}`,
    revista,
  })
  res.json(parApi(await parDeRevista(revista, id)))
})
