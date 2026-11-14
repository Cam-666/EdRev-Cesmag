/*
 * Pares evaluadores — one base common to both journals (RF-12): list with filters (RF-14), areas
 * already written (RF-13), the record with its history in both journals (RF-18), registration
 * (an email already in the base is refused and the existing peer is pointed out), edition, block
 * and unblock (RF-15, RF-16). A block applies to both journals.
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

async function parPorId(id: number): Promise<FilaPar> {
  const { rows } = await pool.query<FilaPar>('SELECT * FROM par_evaluador WHERE id_par = $1', [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Par evaluador no encontrado')
  return rows[0]
}

rutasPares.get('/:revista/pares', async (req, res) => {
  idRevista(req.params.revista)
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
            EXISTS (SELECT 1 FROM evaluacion e WHERE e.id_par = p.id_par AND e.id_articulo = $1) AS en_articulo
       FROM par_evaluador p ORDER BY p.nombre`,
    [articulo],
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
            ? api.estado === 'disponible' && fila.en_curso === 0 && !fila.en_articulo
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
  idRevista(req.params.revista)
  const { rows } = await pool.query<{ area: string }>(
    `SELECT DISTINCT area FROM par_evaluador WHERE area IS NOT NULL ORDER BY area`,
  )
  res.json(rows.map((r) => r.area))
})

rutasPares.get('/:revista/pares/universidades', async (req, res) => {
  idRevista(req.params.revista)
  const { rows } = await pool.query<{ universidad: string }>(
    `SELECT DISTINCT universidad FROM par_evaluador WHERE universidad IS NOT NULL ORDER BY universidad`,
  )
  res.json(rows.map((r) => r.universidad))
})

rutasPares.get('/:revista/pares/:id', async (req, res) => {
  idRevista(req.params.revista)
  const par = await parPorId(idNumerico(req.params.id, 'Par evaluador'))
  const { rows } = await pool.query(
    `SELECT e.*, a.numero_ojs, a.titulo, a.id_revista FROM evaluacion e JOIN articulo a ON a.id_articulo = e.id_articulo
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
      revista: siglaDe(e.id_revista),
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

/** Registers a peer in the common base (`revista` is where it was registered); used by the base and by «candidato nuevo». */
export async function registrarPar(
  cliente: Parameters<typeof auditar>[0],
  revista: number,
  usuario: number,
  cuerpo: unknown,
): Promise<FilaPar> {
  const d = datosPar.parse(cuerpo)
  const repetido = await cliente.query<{ id_par: number; nombre: string }>(
    'SELECT id_par, nombre FROM par_evaluador WHERE correo = $1',
    [d.correo],
  )
  if (repetido.rows[0]) {
    throw new ErrorHttp(409, `Ya existe un par con ese correo en la base de pares (${repetido.rows[0].nombre})`, {
      parId: String(repetido.rows[0].id_par),
    })
  }
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
  await parPorId(id)
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
  res.json(parApi(await parPorId(id)))
})

rutasPares.post('/:revista/pares/:id/bloquear', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Par evaluador')
  const { motivo } = z.object({ motivo: z.enum(['no-desea', 'sin-respuesta']) }).parse(req.body)
  await parPorId(id)
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
  res.json(parApi(await parPorId(id)))
})

rutasPares.post('/:revista/pares/:id/desbloquear', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Par evaluador')
  const { motivo } = z.object({ motivo: z.string().trim().min(1, 'Escriba el motivo') }).parse(req.body)
  await parPorId(id)
  await pool.query('UPDATE par_evaluador SET motivo_bloqueo = NULL, fecha_bloqueo = NULL WHERE id_par = $1', [id])
  await auditar(pool, {
    usuario: usuarioDe(req).id,
    tabla: 'par_evaluador',
    idRegistro: id,
    accion: 'desbloqueo',
    texto: `Desbloqueó al par: ${motivo}`,
    revista,
  })
  res.json(parApi(await parPorId(id)))
})
