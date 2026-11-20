/*
 * autoresArticulo (servicio) — los autores de un artículo: vincular un autor al artículo en una posición,
 * reutilizando el que el directorio ya tiene, y agregar autores a un artículo ya registrado (hasta siete).
 */
import { enTransaccion, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp, idNumerico } from '../lib/http.js'
import { articuloDeRevista } from './articulos.js'

export interface AutorNuevo {
  nombre: string
  correo: string
  orcid: string
  filiacion: string
  pais: string
}

/** Un autor del directorio (por id) o uno nuevo; uno nuevo con un ORCID ya conocido es la misma persona. */
export type AutorEntrada = { autorId: string } | { nuevo: AutorNuevo }

export const MAX_AUTORES = 7

/**
 * Vincula un autor a un artículo en la posición dada. Un autor que ya existe (elegido del directorio, o escrito
 * con un ORCID que el directorio ya tiene) se reutiliza: el mismo ORCID es la misma persona. Se propone la
 * filiación de su artículo más reciente.
 */
export async function vincularAutor(c: Cliente, idArticulo: number, a: AutorEntrada, orden: number): Promise<number> {
  let idAutor: number | null = null
  let filiacion: string | null = null
  let pais: string | null = null
  if ('nuevo' in a) {
    const n = a.nuevo
    const previo = n.orcid
      ? await c.query<{ id_autor: number }>('SELECT id_autor FROM autor WHERE orcid = $1', [n.orcid])
      : { rows: [] as Array<{ id_autor: number }> }
    if (previo.rows[0]) {
      idAutor = previo.rows[0].id_autor
    } else {
      const creado = await c.query<{ id_autor: number }>(
        `INSERT INTO autor (nombre, orcid, correo, filiacion, pais)
         VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))
         RETURNING id_autor`,
        [n.nombre, n.orcid, n.correo, n.filiacion, n.pais],
      )
      idAutor = creado.rows[0]?.id_autor ?? 0
    }
    filiacion = n.filiacion || null
    pais = n.pais || null
  } else {
    idAutor = idNumerico(a.autorId, 'Autor')
    const existe = await c.query('SELECT 1 FROM autor WHERE id_autor = $1', [idAutor])
    if (existe.rows.length === 0) throw new ErrorHttp(404, 'Autor no encontrado')
  }
  const previa = await c.query<{ filiacion: string | null; pais: string | null }>(
    'SELECT filiacion, pais FROM articulo_autor WHERE id_autor = $1 ORDER BY id_articulo DESC LIMIT 1',
    [idAutor],
  )
  // Un autor registrado en el directorio sin artículo todavía conserva sus propios datos.
  const propia = await c.query<{ filiacion: string | null; pais: string | null }>(
    'SELECT filiacion, pais FROM autor WHERE id_autor = $1',
    [idAutor],
  )
  filiacion = filiacion ?? previa.rows[0]?.filiacion ?? propia.rows[0]?.filiacion ?? null
  pais = pais ?? previa.rows[0]?.pais ?? propia.rows[0]?.pais ?? null
  const repetido = await c.query('SELECT 1 FROM articulo_autor WHERE id_articulo = $1 AND id_autor = $2', [idArticulo, idAutor])
  if (repetido.rows.length > 0) throw new ErrorHttp(409, 'Este autor ya figura en el artículo')
  await c.query(
    `INSERT INTO articulo_autor (id_articulo, id_autor, orden, filiacion, pais)
     VALUES ($1, $2, $3, $4, $5)`,
    [idArticulo, idAutor, orden, filiacion, pais],
  )
  return idAutor
}

/** Agrega un autor a un artículo ya registrado, en la posición siguiente. */
export async function agregarAutor(revista: number, idArticulo: number, autor: AutorEntrada, actor: number): Promise<void> {
  await enTransaccion(async (c) => {
    await articuloDeRevista(c, revista, idArticulo)
    const { rows } = await c.query<{ n: number }>('SELECT count(*)::int AS n FROM articulo_autor WHERE id_articulo = $1', [idArticulo])
    const cantidad = rows[0]?.n ?? 0
    if (cantidad >= MAX_AUTORES) throw new ErrorHttp(409, 'El artículo admite hasta siete autores')
    const idAutor = await vincularAutor(c, idArticulo, autor, cantidad + 1)
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: idArticulo,
      accion: 'edicion',
      texto: `Agregó un autor al artículo (autor ${idAutor})`,
      revista,
      articulo: idArticulo,
    })
  })
}
