/*
 * autores (servicio) — the common directory of both journals (RF-10): search by name or ORCID,
 * filter by the journals where the author has articles, the author record with all its articles
 * (RF-11), registration and edition. The affiliation and country shown are the last known ones:
 * those typed in the author form or in the most recent article (each article keeps its own, RF-09).
 */
import { pool } from '../db.js'
import { ErrorHttp, siglaDe, sinTildes } from '../lib/http.js'

const SELECCION = `
  SELECT au.id_autor, au.nombre, au.orcid, au.correo,
         COALESCE(NULLIF(au.filiacion, ''), ult.filiacion) AS filiacion,
         COALESCE(NULLIF(au.pais, ''), ult.pais) AS pais,
         (SELECT count(*)::int FROM articulo_autor x WHERE x.id_autor = au.id_autor) AS total,
         ARRAY(SELECT DISTINCT ar.id_revista FROM articulo_autor x
                 JOIN articulo ar ON ar.id_articulo = x.id_articulo
                WHERE x.id_autor = au.id_autor ORDER BY 1) AS revistas
    FROM autor au
    LEFT JOIN LATERAL (SELECT filiacion, pais FROM articulo_autor x
                        WHERE x.id_autor = au.id_autor ORDER BY x.id_articulo DESC LIMIT 1) ult ON TRUE`

interface FilaAutor {
  id_autor: number
  nombre: string
  orcid: string | null
  correo: string | null
  filiacion: string | null
  pais: string | null
  total: number
  revistas: number[]
}

function autorApi(a: FilaAutor, revista: number) {
  return {
    id: String(a.id_autor),
    revista: siglaDe(a.revistas[0] ?? revista),
    nombre: a.nombre,
    correo: a.correo ?? '',
    orcid: a.orcid ?? '',
    filiacion: a.filiacion ?? '',
    pais: a.pais ?? '',
    totalArticulos: a.total,
    revistas: a.revistas.map(siglaDe),
  }
}

export interface DatosAutor {
  nombre: string
  correo: string
  orcid: string
  filiacion?: string
  pais?: string
}

/** The countries and institutions that exist in the directory, for the filters of the list. */
export async function filtrosDelDirectorio() {
  const { rows } = await pool.query<{ filiacion: string | null; pais: string | null }>(
    `SELECT filiacion, pais FROM (${SELECCION}) t`,
  )
  const unicos = (valores: Array<string | null>) =>
    [...new Set(valores.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  return { paises: unicos(rows.map((r) => r.pais)), filiaciones: unicos(rows.map((r) => r.filiacion)) }
}

export interface FiltrosAutores {
  q: string
  limite: number
  /** Journal where the author has articles. */
  en: 1 | 2 | null
  pais: string
  filiacion: string
  orcid: '' | 'con' | 'sin'
  articulos: '' | 'uno' | 'varios'
}

export async function buscarAutores(revista: number, f: FiltrosAutores) {
  const { rows } = await pool.query<FilaAutor>(
    `SELECT * FROM (${SELECCION}) t
      WHERE ($1 = '' OR translate(lower(t.nombre), 'áéíóúüñ', 'aeiouun') LIKE '%' || $1 || '%'
                     OR t.orcid LIKE '%' || $1 || '%')
        AND ($2::smallint IS NULL OR $2 = ANY (t.revistas))
        AND ($3 = '' OR t.pais = $3)
        AND ($4 = '' OR t.filiacion = $4)
        AND ($5 = '' OR ($5 = 'con') = (t.orcid IS NOT NULL))
        AND ($6 = '' OR ($6 = 'uno' AND t.total = 1) OR ($6 = 'varios' AND t.total > 1))
      ORDER BY t.nombre`,
    [sinTildes(f.q.trim()), f.en, f.pais, f.filiacion, f.orcid, f.articulos],
  )
  return { items: rows.slice(0, f.limite).map((a) => autorApi(a, revista)), total: rows.length }
}

async function cargar(id: number): Promise<FilaAutor> {
  const { rows } = await pool.query<FilaAutor>(`${SELECCION} WHERE au.id_autor = $1`, [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Autor no encontrado')
  return rows[0]
}

export async function fichaDeAutor(revista: number, id: number) {
  return autorApi(await cargar(id), revista)
}

export async function articulosDelAutor(id: number) {
  const { rows } = await pool.query(
    `SELECT ar.id_articulo, ar.id_revista, ar.numero_ojs, ar.titulo, ar.estado, ar.fecha_postulacion
       FROM articulo_autor x JOIN articulo ar ON ar.id_articulo = x.id_articulo
      WHERE x.id_autor = $1 ORDER BY ar.fecha_postulacion DESC NULLS LAST`,
    [id],
  )
  return rows.map((a) => ({
    id: String(a.id_articulo),
    revista: siglaDe(a.id_revista),
    numeroOjs: a.numero_ojs,
    titulo: a.titulo,
    estado: a.estado,
    fechaPostulacion: a.fecha_postulacion ?? '',
  }))
}

export async function registrarAutor(revista: number, d: DatosAutor) {
  const repetido = d.orcid ? await pool.query('SELECT 1 FROM autor WHERE orcid = $1', [d.orcid]) : { rows: [] }
  if (repetido.rows.length > 0) throw new ErrorHttp(409, 'Ya existe un autor con ese ORCID en el directorio')
  const { rows } = await pool.query<{ id_autor: number }>(
    `INSERT INTO autor (nombre, orcid, correo, filiacion, pais)
     VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))
     RETURNING id_autor`,
    [d.nombre, d.orcid, d.correo, d.filiacion ?? '', d.pais ?? ''],
  )
  return {
    id: String(rows[0]?.id_autor),
    revista: siglaDe(revista),
    nombre: d.nombre,
    correo: d.correo,
    orcid: d.orcid,
    filiacion: d.filiacion ?? '',
    pais: d.pais ?? '',
  }
}

export async function editarAutor(revista: number, id: number, d: Partial<DatosAutor>) {
  await pool.query(
    `UPDATE autor SET nombre = COALESCE($1, nombre), orcid = COALESCE(NULLIF($2, ''), orcid),
            correo = COALESCE(NULLIF($3, ''), correo),
            filiacion = COALESCE(NULLIF($5, ''), filiacion), pais = COALESCE(NULLIF($6, ''), pais)
      WHERE id_autor = $4`,
    [d.nombre ?? null, d.orcid ?? null, d.correo ?? null, id, d.filiacion ?? null, d.pais ?? null],
  )
  return autorApi(await cargar(id), revista)
}
