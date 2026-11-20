/*
 * pares (servicio) — la base de pares, común a las dos revistas: el listado con filtros, las áreas y
 * universidades ya escritas, la ficha con su historial en las dos revistas, el registro (un par que ya está en
 * la base se rechaza y se señala; si está bloqueado, se informa), la edición, el bloqueo y el desbloqueo.
 * Un bloqueo vale para las dos revistas.
 */
import { pool, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp, siglaDe, sinTildes } from '../lib/http.js'
import { conceptoApi, iso, mismaInstitucion, motivoApi, motivoDb } from '../lib/mapeo.js'
import type { DatosPar } from '../controladores/esquemas.js'
import { autoresDe } from './articulos.js'

export interface FilaPar {
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

export function parApi(p: FilaPar) {
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

export async function parPorId(id: number): Promise<FilaPar> {
  const { rows } = await pool.query<FilaPar>('SELECT * FROM par_evaluador WHERE id_par = $1', [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Par evaluador no encontrado')
  return rows[0]
}

// ----------------------------------------------------------------------------- escrituras

/** Clave para comparar un texto libre: sin tildes, mayúsculas ni espacios repetidos ("CESMAG" = "Cesmag"). */
export function claveTexto(texto: string): string {
  return sinTildes(texto).replace(/\s+/g, ' ').trim()
}

interface FormaEscrita {
  valor: string
  n: number
}

/** Entre las escrituras del mismo texto, la más usada; si empatan, la que tiene mayúsculas. */
export function mejorForma(formas: FormaEscrita[]): string {
  const conMayuscula = (t: string) => (/[A-ZÁÉÍÓÚÑ]/.test(t) ? 1 : 0)
  return [...formas].sort(
    (a, b) => b.n - a.n || conMayuscula(b.valor) - conMayuscula(a.valor) || a.valor.localeCompare(b.valor, 'es'),
  )[0]?.valor ?? ''
}

type Columna = 'universidad' | 'area'

async function formasDe(c: Cliente, columna: Columna): Promise<FormaEscrita[]> {
  const { rows } = await c.query<FormaEscrita>(
    `SELECT ${columna} AS valor, count(*)::int AS n FROM par_evaluador WHERE ${columna} IS NOT NULL GROUP BY ${columna}`,
  )
  return rows
}

/** El texto tal como la base ya lo escribe: "cesmag" se guarda como el "Cesmag" que ya existe. */
async function formaCanonica(c: Cliente, columna: Columna, texto: string): Promise<string> {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  const iguales = (await formasDe(c, columna)).filter((f) => claveTexto(f.valor) === claveTexto(limpio))
  return iguales.length > 0 ? mejorForma(iguales) : limpio
}

/** Los valores de una columna sin duplicados que solo se diferencian en mayúsculas o tildes. */
async function formasUnicas(c: Cliente, columna: Columna): Promise<string[]> {
  const grupos = new Map<string, FormaEscrita[]>()
  for (const f of await formasDe(c, columna)) {
    const clave = claveTexto(f.valor)
    grupos.set(clave, [...(grupos.get(clave) ?? []), f])
  }
  return [...grupos.values()].map(mejorForma).sort((a, b) => a.localeCompare(b, 'es'))
}

export const areasRegistradas = () => formasUnicas(pool, 'area')
export const universidadesRegistradas = () => formasUnicas(pool, 'universidad')

// ----------------------------------------------------------------------------- listado y ficha

export interface FiltrosPares {
  q: string
  area: string
  universidad: string
  estado: string
  articulo: number | null
  pagina: number
  porPagina: number
}

export async function listarPares(f: FiltrosPares) {
  const q = sinTildes(f.q.trim())
  const area = sinTildes(f.area.trim())
  const { rows } = await pool.query<FilaPar & { entregadas: number; en_curso: number; en_articulo: boolean }>(
    `SELECT p.*,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_par = p.id_par AND e.estado_par = 'entrego') AS entregadas,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_par = p.id_par
                AND e.estado_par IN ('invitado','acepto')) AS en_curso,
            EXISTS (SELECT 1 FROM evaluacion e WHERE e.id_par = p.id_par AND e.id_articulo = $1) AS en_articulo
       FROM par_evaluador p ORDER BY p.nombre`,
    [f.articulo],
  )
  const autores = f.articulo ? await autoresDe(pool, f.articulo) : []
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
    .filter(({ api }) => !f.universidad || claveTexto(api.universidad) === claveTexto(f.universidad))
    .filter(({ api, fila }) =>
      f.estado === 'bloqueados'
        ? api.estado === 'bloqueado'
        : f.estado === 'disponibles'
          ? api.estado !== 'bloqueado'
          : f.estado === 'asignables'
            ? api.estado !== 'bloqueado' && api.estado !== 'misma-institucion' && fila.en_curso === 0 && !fila.en_articulo
            : true,
    )
  return {
    items: filtrados.slice((f.pagina - 1) * f.porPagina, f.pagina * f.porPagina).map((x) => x.api),
    total: filtrados.length,
    totalBase: todos.length,
    totalBloqueados: todos.filter((x) => x.api.estado === 'bloqueado').length,
  }
}

/** La ficha de un par con sus participaciones en las dos revistas. */
export async function fichaDePar(id: number) {
  const par = await parPorId(id)
  const { rows } = await pool.query(
    `SELECT e.*, a.numero_ojs, a.titulo, a.id_revista FROM evaluacion e JOIN articulo a ON a.id_articulo = e.id_articulo
      WHERE e.id_par = $1 ORDER BY e.fecha_asignacion DESC`,
    [par.id_par],
  )
  const entregas = rows.filter((e) => e.fecha_evaluacion).map((e) => e.fecha_evaluacion as string).sort()
  return {
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
  }
}

// ----------------------------------------------------------------------------- registro

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

/** La frase que se muestra cuando la persona que se registra ya está en la base común. */
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

/** Registra un par en la base común (`revista` es donde se registró); lo usan la base de pares y el «candidato nuevo». */
export async function registrarPar(cliente: Cliente, revista: number, usuario: number, d: DatosPar): Promise<FilaPar> {
  // La misma persona no debe registrarse dos veces: el correo es único y el nombre también cuenta (los demás
  // datos pueden variar). Un par bloqueado se informa como tal.
  const existentes = await cliente.query<ExistentePar>(
    'SELECT id_par, nombre, correo, motivo_bloqueo, fecha_bloqueo FROM par_evaluador',
  )
  const repetido =
    existentes.rows.find((p) => p.correo === d.correo) ??
    existentes.rows.find((p) => claveTexto(p.nombre) === claveTexto(d.nombre))
  if (repetido) {
    throw new ErrorHttp(409, avisoDeParExistente(repetido), {
      parId: String(repetido.id_par),
      bloqueado: repetido.motivo_bloqueo !== null,
    })
  }
  const { rows } = await cliente.query<FilaPar>(
    `INSERT INTO par_evaluador (id_revista, nombre, profesion, correo, universidad, area)
     VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6) RETURNING *`,
    [
      revista,
      d.nombre,
      d.profesion ?? '',
      d.correo,
      await formaCanonica(cliente, 'universidad', d.universidad),
      await formaCanonica(cliente, 'area', d.area),
    ],
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

export async function editarPar(id: number, revista: number, d: Partial<DatosPar>, actor: number) {
  await parPorId(id)
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
  await auditar(pool, { usuario: actor, tabla: 'par_evaluador', idRegistro: id, accion: 'edicion', texto: 'Editó la ficha del par', revista })
  return parApi(await parPorId(id))
}

export async function bloquearPar(id: number, revista: number, motivo: 'no-desea' | 'sin-respuesta', actor: number) {
  await parPorId(id)
  await pool.query('UPDATE par_evaluador SET motivo_bloqueo = $1, fecha_bloqueo = CURRENT_DATE WHERE id_par = $2', [
    motivoDb(motivo),
    id,
  ])
  await auditar(pool, { usuario: actor, tabla: 'par_evaluador', idRegistro: id, accion: 'bloqueo', texto: 'Bloqueó al par', revista })
  return parApi(await parPorId(id))
}

export async function desbloquearPar(id: number, revista: number, motivo: string, actor: number) {
  await parPorId(id)
  await pool.query('UPDATE par_evaluador SET motivo_bloqueo = NULL, fecha_bloqueo = NULL WHERE id_par = $1', [id])
  await auditar(pool, {
    usuario: actor,
    tabla: 'par_evaluador',
    idRegistro: id,
    accion: 'desbloqueo',
    texto: `Desbloqueó al par: ${motivo}`,
    revista,
  })
  return parApi(await parPorId(id))
}
