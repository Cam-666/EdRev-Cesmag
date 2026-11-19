/*
 * Pares evaluadores — one base common to both journals (RF-12): list with filters (RF-14), areas
 * already written (RF-13), the record with its history in both journals (RF-18), registration
 * (an email already in the base is refused and the existing peer is pointed out), edition, block
 * and unblock (RF-15, RF-16). A block applies to both journals.
 */
import { Router } from 'express'
import { z } from 'zod'
import { enTransaccion, pool, type Cliente } from '../../db.js'
import { auditar } from '../../lib/auditoria.js'
import { usuarioDe } from '../../middlewares/autenticacion.js'
import { CORREO_VALIDO, ErrorHttp, idNumerico, idRevista, siglaDe, sinTildes } from '../../lib/http.js'
import { conceptoApi, iso, mismaInstitucion, motivoApi, motivoDb } from '../../lib/mapeo.js'
import { autoresDe } from '../../servicios/articulos.js'

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
      estado: p.motivo_bloqueo
        ? 'bloqueado'
        : mismaInstitucion(p.universidad, autores)
          ? 'misma-institucion'
          : 'disponible',
    },
  }))
  const filtrados = todos
    .filter(({ api }) => !q || sinTildes(api.nombre).includes(q) || api.correo.includes(q))
    .filter(({ api }) => !area || sinTildes(api.area).includes(area))
    .filter(({ api }) => !universidad || claveTexto(api.universidad) === claveTexto(universidad))
    .filter(({ api, fila }) =>
      estado === 'bloqueados'
        ? api.estado === 'bloqueado'
        : estado === 'disponibles'
          ? api.estado !== 'bloqueado'
          : estado === 'asignables'
            ? api.estado !== 'bloqueado' && api.estado !== 'misma-institucion' && fila.en_curso === 0 && !fila.en_articulo
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
  res.json(await formasUnicas(pool, 'area'))
})

rutasPares.get('/:revista/pares/universidades', async (req, res) => {
  idRevista(req.params.revista)
  res.json(await formasUnicas(pool, 'universidad'))
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

/** Comparison key of a free text: without accents, case or repeated spaces ("CESMAG" = "Cesmag"). */
export function claveTexto(texto: string): string {
  return sinTildes(texto).replace(/\s+/g, ' ').trim()
}

interface FormaEscrita {
  valor: string
  n: number
}

/** Among the spellings of the same text, the most used one; on a tie, the one that has capitals. */
export function mejorForma(formas: FormaEscrita[]): string {
  const conMayuscula = (t: string) => (/[A-ZÁÉÍÓÚÑ]/.test(t) ? 1 : 0)
  return [...formas].sort(
    (a, b) => b.n - a.n || conMayuscula(b.valor) - conMayuscula(a.valor) || a.valor.localeCompare(b.valor, 'es'),
  )[0]?.valor ?? ''
}

async function formasDe(c: Cliente, columna: 'universidad' | 'area'): Promise<FormaEscrita[]> {
  const { rows } = await c.query<FormaEscrita>(
    `SELECT ${columna} AS valor, count(*)::int AS n FROM par_evaluador WHERE ${columna} IS NOT NULL GROUP BY ${columna}`,
  )
  return rows
}

/** The text as the base already spells it: "cesmag" is stored as the existing "Cesmag". */
async function formaCanonica(c: Cliente, columna: 'universidad' | 'area', texto: string): Promise<string> {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  const iguales = (await formasDe(c, columna)).filter((f) => claveTexto(f.valor) === claveTexto(limpio))
  return iguales.length > 0 ? mejorForma(iguales) : limpio
}

/** The values of a column without duplicates that differ only in case or accents. */
async function formasUnicas(c: Cliente, columna: 'universidad' | 'area'): Promise<string[]> {
  const grupos = new Map<string, FormaEscrita[]>()
  for (const f of await formasDe(c, columna)) {
    const clave = claveTexto(f.valor)
    grupos.set(clave, [...(grupos.get(clave) ?? []), f])
  }
  return [...grupos.values()].map(mejorForma).sort((a, b) => a.localeCompare(b, 'es'))
}

interface ExistentePar {
  id_par: number
  nombre: string
  correo: string | null
  motivo_bloqueo: string | null
  fecha_bloqueo: Date | string | null
}

const MOTIVO_BLOQUEO: Record<string, string> = {
  'sin-respuesta': 'no respondió a las invitaciones',
  'no-participa': 'manifestó que no desea participar',
}

/** The sentence shown when the person being registered is already in the common base. */
function avisoDeParExistente(p: ExistentePar): string {
  if (p.motivo_bloqueo) {
    const desde = p.fecha_bloqueo ? ` desde el ${iso(p.fecha_bloqueo)?.slice(0, 10)}` : ''
    return (
      `«${p.nombre}» ya se encuentra en el sistema y está bloqueado${desde} ` +
      `(${MOTIVO_BLOQUEO[p.motivo_bloqueo] ?? p.motivo_bloqueo}). No se registra de nuevo; ` +
      'si desea invitarlo otra vez, desbloquéelo desde su ficha.'
    )
  }
  return (
    `«${p.nombre}» ya se encuentra registrado en el sistema${p.correo ? ` (${p.correo})` : ''}. ` +
    'Búsquelo en la lista de pares y asígnelo desde allí.'
  )
}

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
  // The same person must not be registered twice: the e-mail is unique, and the name counts too
  // (the other data may vary). A blocked peer is reported as such.
  const nombres = await cliente.query<ExistentePar>(
    'SELECT id_par, nombre, correo, motivo_bloqueo, fecha_bloqueo FROM par_evaluador',
  )
  const normal = (t: string) => sinTildes(t).replace(/\s+/g, ' ').trim()
  const repetido =
    nombres.rows.find((p) => p.correo === d.correo) ?? nombres.rows.find((p) => normal(p.nombre) === normal(d.nombre))
  if (repetido) {
    throw new ErrorHttp(409, avisoDeParExistente(repetido), {
      parId: String(repetido.id_par),
      bloqueado: repetido.motivo_bloqueo !== null,
    })
  }
  const { rows } = await cliente.query<FilaPar>(
    `INSERT INTO par_evaluador (id_revista, nombre, profesion, correo, universidad, area)
     VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6) RETURNING *`,
    [revista, d.nombre, d.profesion ?? '', d.correo, await formaCanonica(cliente, 'universidad', d.universidad), await formaCanonica(cliente, 'area', d.area)],
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
    [
      d.nombre ?? null,
      d.profesion ?? null,
      d.correo ?? null,
      d.universidad ? await formaCanonica(pool, 'universidad', d.universidad) : null,
      d.area ? await formaCanonica(pool, 'area', d.area) : null,
      id,
    ],
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
