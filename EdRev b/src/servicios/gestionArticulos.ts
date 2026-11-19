/*
 * gestionArticulos (servicio) — the life of an article: the list with filters (RF-35), the OJS
 * number warning (RF-03), registration with its authors (RF-01, RF-09, RF-10), edition and
 * publication (RF-04), change of journal (RF-07), closing and reopening (RF-08) and the history of
 * mails and changes (RF-26, RF-41). The sheet itself is built by servicios/articulos.
 */
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp, siglaDe, sinTildes } from '../lib/http.js'
import { iso } from '../lib/mapeo.js'
import { articuloDeRevista } from './articulos.js'
import { vincularAutor, type AutorEntrada } from './autoresArticulo.js'
import { correosApi, SELECCION_CORREOS, type FilaCorreo } from './correos.js'

export type TipoArticulo = 'investigacion' | 'reflexion' | 'revision'
export type EstadoArticulo = 'postulado' | 'en-revision' | 'en-evaluacion' | 'aprobado' | 'rechazado' | 'archivado'
export interface Publicacion {
  volumen: number
  numero: number
}

/**
 * Year of management: the year of the postulation, except for an article whose process is still
 * open (Postulado, En revisión, En evaluación) from a previous year, which passes by itself to the
 * current year's list; its postulation date does not change.
 */
const ANIO_GESTION = `(CASE WHEN a.estado IN ('postulado','en-revision','en-evaluacion')
                              AND EXTRACT(YEAR FROM a.fecha_postulacion) < EXTRACT(YEAR FROM CURRENT_DATE)
                         THEN EXTRACT(YEAR FROM CURRENT_DATE)
                         ELSE EXTRACT(YEAR FROM a.fecha_postulacion) END)::int`

export async function aniosDeGestion(revista: number): Promise<number[]> {
  const { rows } = await pool.query<{ anio: number }>(
    `SELECT DISTINCT ${ANIO_GESTION} AS anio FROM articulo a WHERE a.id_revista = $1 AND a.fecha_postulacion IS NOT NULL`,
    [revista],
  )
  const anios = new Set(rows.map((r) => r.anio))
  anios.add(new Date().getFullYear())
  return [...anios].sort((x, y) => y - x)
}

export interface FiltrosListado {
  q?: string
  estado?: string
  anio?: string
  publicacion?: string
  desde?: string
  hasta?: string
  sinResponder?: boolean
  pagina: number
  porPagina: number
}

export async function listarArticulos(revista: number, f: FiltrosListado) {
  const filtros: string[] = ['a.id_revista = $1']
  const valores: unknown[] = [revista]
  const agregar = (sql: string, valor: unknown) => {
    valores.push(valor)
    filtros.push(sql.replace('?', `$${valores.length}`))
  }
  if (f.q?.trim()) {
    // Search by title without accents, or by OJS number (HU-26).
    valores.push(sinTildes(f.q.trim()))
    const p = `$${valores.length}`
    filtros.push(
      `(translate(lower(a.titulo), 'áéíóúüñ', 'aeiouun') LIKE '%' || ${p} || '%' OR a.numero_ojs LIKE '%' || ${p} || '%')`,
    )
  }
  if (f.estado) agregar('a.estado = ?', f.estado)
  if (f.anio && /^\d{4}$/.test(f.anio)) agregar(`${ANIO_GESTION} = ?`, Number(f.anio))
  if (f.publicacion?.includes('-')) {
    const [v, n] = f.publicacion.split('-').map(Number)
    agregar('a.volumen = ?', v)
    agregar('a.numero = ?', n)
  }
  if (f.desde) agregar('a.fecha_postulacion >= ?', f.desde)
  if (f.hasta) agregar('a.fecha_postulacion <= ?', f.hasta)
  if (f.sinResponder) {
    filtros.push(
      "EXISTS (SELECT 1 FROM evaluacion e WHERE e.id_articulo = a.id_articulo AND e.estado_par = 'invitado')",
    )
  }
  const donde = filtros.join(' AND ')

  const total = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM articulo a WHERE ${donde}`, valores)
  const { rows } = await pool.query(
    `SELECT a.*, ${ANIO_GESTION} AS anio_gestion,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_articulo = a.id_articulo
                AND e.estado_par IN ('acepto','entrego')) AS asignados,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_articulo = a.id_articulo
                AND e.estado_par = 'entrego') AS entregaron
       FROM articulo a WHERE ${donde}
      ORDER BY a.fecha_postulacion DESC NULLS LAST, a.id_articulo DESC
      LIMIT ${f.porPagina} OFFSET ${(f.pagina - 1) * f.porPagina}`,
    valores,
  )
  return {
    total: total.rows[0]?.n ?? 0,
    items: rows.map((a) => ({
      id: String(a.id_articulo),
      numeroOjs: a.numero_ojs,
      titulo: a.titulo,
      tipo: a.tipo,
      estado: a.estado,
      fechaPostulacion: a.fecha_postulacion ?? '',
      anioGestion: a.anio_gestion,
      publicacion: a.volumen !== null ? { volumen: a.volumen, numero: a.numero } : null,
      paresEntregaron: a.entregaron,
      paresAsignados: a.asignados,
    })),
  }
}

/** RF-03: a repeated OJS number is warned, never blocked. */
export async function existeNumeroOjs(revista: number, numero: string) {
  const { rows } = await pool.query<{ id_articulo: number }>(
    'SELECT id_articulo FROM articulo WHERE id_revista = $1 AND numero_ojs = $2 LIMIT 1',
    [revista, numero],
  )
  return { existe: rows.length > 0, id: rows[0] ? String(rows[0].id_articulo) : null }
}

export async function publicaciones(revista: number) {
  const { rows } = await pool.query<{ volumen: number; numero: number }>(
    `SELECT DISTINCT volumen, numero FROM articulo
      WHERE id_revista = $1 AND volumen IS NOT NULL ORDER BY volumen DESC, numero DESC`,
    [revista],
  )
  return rows.map((p) => ({ valor: `${p.volumen}-${p.numero}`, etiqueta: `Vol. ${p.volumen} n.º ${p.numero}` }))
}

export interface DatosNuevoArticulo {
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  fechaPostulacion: string
  autores: AutorEntrada[]
}

/** Registers the article with its authors, in order; returns its id. */
export async function registrarArticulo(revista: number, datos: DatosNuevoArticulo, actor: number): Promise<number> {
  return enTransaccion(async (c) => {
    const { rows } = await c.query<{ id_articulo: number }>(
      `INSERT INTO articulo (id_revista, numero_ojs, titulo, tipo, fecha_postulacion)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_articulo`,
      [revista, datos.numeroOjs, datos.titulo, datos.tipo, datos.fechaPostulacion],
    )
    const idArticulo = rows[0]?.id_articulo ?? 0
    for (const [i, a] of datos.autores.entries()) {
      await vincularAutor(c, idArticulo, a, i + 1)
    }
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: idArticulo,
      accion: 'registro',
      texto: `Registró el artículo ${datos.numeroOjs}`,
      revista,
      articulo: idArticulo,
    })
    return idArticulo
  })
}

export interface CambiosArticulo {
  titulo?: string
  tipo?: TipoArticulo
  publicacion?: Publicacion | null
}

export async function editarArticulo(revista: number, id: number, cambios: CambiosArticulo, actor: number): Promise<void> {
  await enTransaccion(async (c) => {
    await articuloDeRevista(c, revista, id)
    if (cambios.titulo !== undefined)
      await c.query('UPDATE articulo SET titulo = $1 WHERE id_articulo = $2', [cambios.titulo, id])
    if (cambios.tipo !== undefined)
      await c.query('UPDATE articulo SET tipo = $1 WHERE id_articulo = $2', [cambios.tipo, id])
    if (cambios.publicacion !== undefined)
      await c.query('UPDATE articulo SET volumen = $1, numero = $2 WHERE id_articulo = $3', [
        cambios.publicacion?.volumen ?? null,
        cambios.publicacion?.numero ?? null,
        id,
      ])
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'edicion',
      texto: 'Editó los datos del artículo',
      revista,
      articulo: id,
    })
  })
}

/** RF-07: at any stage; returns the journal it now belongs to. */
export async function trasladarArticulo(revista: number, id: number, actor: number): Promise<number> {
  const destino = revista === 1 ? 2 : 1
  await enTransaccion(async (c) => {
    // The peers are a common base, so the evaluations go along. The volume and number belong to the
    // journal, so they are cleared (the history says which one it was).
    const a = await articuloDeRevista(c, revista, id)
    await c.query('UPDATE articulo SET id_revista = $1, volumen = NULL, numero = NULL WHERE id_articulo = $2', [destino, id])
    const publicacion =
      a.volumen !== null ? `; se quitó su publicación Vol. ${a.volumen} n.º ${a.numero}, que era de la otra revista` : ''
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'traslado',
      texto: `Cambió el artículo de revista (${siglaDe(revista)} → ${siglaDe(destino)})${publicacion}`,
      revista: destino,
      articulo: id,
    })
  })
  return destino
}

export interface DatosCierre {
  estado: 'aprobado' | 'rechazado' | 'archivado'
  motivo: string
  publicacion: Publicacion | null
}

export async function cerrarArticulo(revista: number, id: number, datos: DatosCierre, actor: number): Promise<void> {
  if (datos.estado === 'aprobado' && !datos.publicacion) {
    throw new ErrorHttp(422, 'Al aprobarlo, registre el volumen y el número de la publicación')
  }
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, id)
    if (['aprobado', 'rechazado', 'archivado'].includes(a.estado)) {
      throw new ErrorHttp(409, 'El proceso del artículo ya está cerrado')
    }
    await c.query(
      `UPDATE articulo SET estado = $1,
              volumen = COALESCE($2, volumen), numero = COALESCE($3, numero)
        WHERE id_articulo = $4`,
      [datos.estado, datos.publicacion?.volumen ?? null, datos.publicacion?.numero ?? null, id],
    )
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'cierre',
      texto: `Cerró el proceso como ${datos.estado}: ${datos.motivo}`,
      revista,
      articulo: id,
    })
  })
}

export async function reabrirArticulo(
  revista: number,
  id: number,
  datos: { motivo: string; estado: EstadoArticulo },
  actor: number,
): Promise<void> {
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, id)
    if (a.estado !== 'archivado') throw new ErrorHttp(409, 'El artículo no está archivado')
    await c.query('UPDATE articulo SET estado = $1 WHERE id_articulo = $2', [datos.estado, id])
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'reapertura',
      texto: `Retomó el proceso: ${datos.motivo}`,
      revista,
      articulo: id,
    })
  })
}

/** The mails and the changes of the article (RF-26, RF-41). */
export async function historialArticulo(revista: number, id: number) {
  await articuloDeRevista(pool, revista, id)
  const correos = await pool.query<FilaCorreo>(`${SELECCION_CORREOS} WHERE e.id_articulo = $1`, [id])
  const auditoria = await pool.query(
    `SELECT a.*, u.nombre AS usuario FROM auditoria a LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
      WHERE (a.detalle->>'articulo')::int = $1 ORDER BY a.fecha DESC`,
    [id],
  )
  return {
    correos: correosApi(correos.rows),
    auditoria: auditoria.rows.map((a) => ({
      id: String(a.id_auditoria),
      revista: siglaDe(revista),
      articuloId: String(id),
      tipo: a.accion,
      accion: a.detalle?.texto ?? a.accion,
      fecha: iso(a.fecha),
      usuario: a.usuario ?? 'Sistema',
    })),
  }
}
