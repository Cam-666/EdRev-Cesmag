/*
 * Autores — the common directory of both journals (RF-10): search by name or ORCID, filter by the
 * journals where the author has articles, the author record with all its articles (RF-11),
 * registration and edition. The affiliation and country shown are the last known ones: those
 * typed in the author form or in the most recent article (each article keeps its own, RF-09).
 */
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { ErrorHttp, idNumerico, idRevista, siglaDe, sinTildes } from '../lib/http.js'

export const rutasAutores = Router()

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

rutasAutores.get('/:revista/autores', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const q = sinTildes(String(req.query.q ?? '').trim())
  const limite = Math.min(200, Math.max(1, Number(req.query.limite ?? 50)))
  const en = req.query.en === 'reep' ? 1 : req.query.en === 'ire' ? 2 : null
  const { rows } = await pool.query<FilaAutor>(
    `SELECT * FROM (${SELECCION}) t
      WHERE ($1 = '' OR translate(lower(t.nombre), 'áéíóúüñ', 'aeiouun') LIKE '%' || $1 || '%'
                     OR t.orcid LIKE '%' || $1 || '%')
        AND ($2::smallint IS NULL OR $2 = ANY (t.revistas))
      ORDER BY t.nombre`,
    [q, en],
  )
  res.json({ items: rows.slice(0, limite).map((a) => autorApi(a, revista)), total: rows.length })
})

rutasAutores.get('/:revista/autores/:id', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const { rows } = await pool.query<FilaAutor>(`${SELECCION} WHERE au.id_autor = $1`, [
    idNumerico(req.params.id, 'Autor'),
  ])
  const autor = rows[0]
  if (!autor) throw new ErrorHttp(404, 'Autor no encontrado')
  res.json(autorApi(autor, revista))
})

rutasAutores.get('/:revista/autores/:id/articulos', async (req, res) => {
  idRevista(req.params.revista)
  const { rows } = await pool.query(
    `SELECT ar.id_articulo, ar.id_revista, ar.numero_ojs, ar.titulo, ar.estado, ar.fecha_postulacion
       FROM articulo_autor x JOIN articulo ar ON ar.id_articulo = x.id_articulo
      WHERE x.id_autor = $1 ORDER BY ar.fecha_postulacion DESC NULLS LAST`,
    [idNumerico(req.params.id, 'Autor')],
  )
  res.json(
    rows.map((a) => ({
      id: String(a.id_articulo),
      revista: siglaDe(a.id_revista),
      numeroOjs: a.numero_ojs,
      titulo: a.titulo,
      estado: a.estado,
      fechaPostulacion: a.fecha_postulacion ?? '',
    })),
  )
})

const datosAutor = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre'),
  correo: z.string().trim(),
  orcid: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])?$/, 'Use el formato 0000-0000-0000-0000'),
  filiacion: z.string().trim().optional(),
  pais: z.string().trim().optional(),
})

rutasAutores.post('/:revista/autores', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const d = datosAutor.parse(req.body)
  const repetido = d.orcid
    ? await pool.query('SELECT 1 FROM autor WHERE orcid = $1', [d.orcid])
    : { rows: [] }
  if (repetido.rows.length > 0) throw new ErrorHttp(409, 'Ya existe un autor con ese ORCID en el directorio')
  const { rows } = await pool.query<{ id_autor: number }>(
    `INSERT INTO autor (nombre, orcid, correo, filiacion, pais)
     VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))
     RETURNING id_autor`,
    [d.nombre, d.orcid, d.correo, d.filiacion ?? '', d.pais ?? ''],
  )
  res.status(201).json({
    id: String(rows[0]?.id_autor),
    revista: siglaDe(revista),
    nombre: d.nombre,
    correo: d.correo,
    orcid: d.orcid,
    filiacion: d.filiacion ?? '',
    pais: d.pais ?? '',
  })
})

rutasAutores.patch('/:revista/autores/:id', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Autor')
  const d = datosAutor.partial().parse(req.body)
  await pool.query(
    `UPDATE autor SET nombre = COALESCE($1, nombre), orcid = COALESCE(NULLIF($2, ''), orcid),
            correo = COALESCE(NULLIF($3, ''), correo),
            filiacion = COALESCE(NULLIF($5, ''), filiacion), pais = COALESCE(NULLIF($6, ''), pais)
      WHERE id_autor = $4`,
    [d.nombre ?? null, d.orcid ?? null, d.correo ?? null, id, d.filiacion ?? null, d.pais ?? null],
  )
  const { rows } = await pool.query<FilaAutor>(`${SELECCION} WHERE au.id_autor = $1`, [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Autor no encontrado')
  res.json(autorApi(rows[0], revista))
})
