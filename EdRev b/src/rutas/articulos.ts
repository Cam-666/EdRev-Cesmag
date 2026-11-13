/*
 * Artículos — list with filters and pagination (RF-35), sheet (RF-36), registration with its
 * authors (RF-01, RF-09, RF-10), OJS number warning (RF-03), edition and publication (RF-04),
 * committee rounds with the anti-plagiarism report (RF-05, RF-06), change of journal during the
 * committee review (RF-07), closing (RF-08) and the history of mails and changes (RF-26, RF-41).
 */
import { Router } from 'express'
import { z } from 'zod'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { usuarioDe } from '../lib/auth.js'
import { ErrorHttp, idNumerico, idRevista, siglaDe, sinTildes } from '../lib/http.js'
import { iso } from '../lib/mapeo.js'
import { articuloDeRevista, detalleArticulo, ultimaRonda } from '../servicios/articulos.js'
import { correosApi, SELECCION_CORREOS, type FilaCorreo } from '../servicios/correos.js'

export const rutasArticulos = Router()

const TIPOS = ['investigacion', 'reflexion', 'revision'] as const
const ESTADOS = ['postulado', 'en-revision', 'en-evaluacion', 'aprobado', 'rechazado', 'archivado'] as const

rutasArticulos.get('/:revista/articulos', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const q = req.query
  const filtros: string[] = ['a.id_revista = $1']
  const valores: unknown[] = [revista]
  const agregar = (sql: string, valor: unknown) => {
    valores.push(valor)
    filtros.push(sql.replace('?', `$${valores.length}`))
  }
  if (typeof q.q === 'string' && q.q.trim()) {
    // Search by title without accents, or by OJS number (HU-26).
    valores.push(sinTildes(q.q.trim()))
    const p = `$${valores.length}`
    filtros.push(
      `(translate(lower(a.titulo), 'áéíóúüñ', 'aeiouun') LIKE '%' || ${p} || '%' OR a.numero_ojs LIKE '%' || ${p} || '%')`,
    )
  }
  if (typeof q.estado === 'string' && q.estado) agregar('a.estado = ?', q.estado)
  if (typeof q.publicacion === 'string' && q.publicacion.includes('-')) {
    const [v, n] = q.publicacion.split('-').map(Number)
    agregar('a.volumen = ?', v)
    agregar('a.numero = ?', n)
  }
  if (typeof q.desde === 'string' && q.desde) agregar('a.fecha_postulacion >= ?', q.desde)
  if (typeof q.hasta === 'string' && q.hasta) agregar('a.fecha_postulacion <= ?', q.hasta)
  if (q.sinResponder === '1') {
    filtros.push(
      "EXISTS (SELECT 1 FROM evaluacion e WHERE e.id_articulo = a.id_articulo AND e.estado_par = 'invitado')",
    )
  }
  const pagina = Math.max(1, Number(q.pagina ?? 1))
  const porPagina = Math.min(100, Math.max(1, Number(q.porPagina ?? 6)))
  const donde = filtros.join(' AND ')

  const total = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM articulo a WHERE ${donde}`,
    valores,
  )
  const { rows } = await pool.query(
    `SELECT a.*,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_articulo = a.id_articulo) AS asignados,
            (SELECT count(*)::int FROM evaluacion e WHERE e.id_articulo = a.id_articulo
                AND e.estado_par <> 'invitado') AS respondieron
       FROM articulo a WHERE ${donde}
      ORDER BY a.fecha_postulacion DESC NULLS LAST, a.id_articulo DESC
      LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}`,
    valores,
  )
  res.json({
    total: total.rows[0]?.n ?? 0,
    items: rows.map((a) => ({
      id: String(a.id_articulo),
      numeroOjs: a.numero_ojs,
      titulo: a.titulo,
      tipo: a.tipo,
      estado: a.estado,
      fechaPostulacion: a.fecha_postulacion ?? '',
      publicacion: a.volumen !== null ? { volumen: a.volumen, numero: a.numero } : null,
      paresRespondieron: a.respondieron,
      paresAsignados: a.asignados,
    })),
  })
})

// RF-03: a repeated OJS number is warned, never blocked.
rutasArticulos.get('/:revista/articulos/existe', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const numero = String(req.query.numeroOjs ?? '').trim()
  const { rows } = await pool.query<{ id_articulo: number }>(
    'SELECT id_articulo FROM articulo WHERE id_revista = $1 AND numero_ojs = $2 LIMIT 1',
    [revista, numero],
  )
  res.json({ existe: rows.length > 0, id: rows[0] ? String(rows[0].id_articulo) : null })
})

rutasArticulos.get('/:revista/publicaciones', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const { rows } = await pool.query<{ volumen: number; numero: number }>(
    `SELECT DISTINCT volumen, numero FROM articulo
      WHERE id_revista = $1 AND volumen IS NOT NULL ORDER BY volumen DESC, numero DESC`,
    [revista],
  )
  res.json(
    rows.map((p) => ({ valor: `${p.volumen}-${p.numero}`, etiqueta: `Vol. ${p.volumen} n.º ${p.numero}` })),
  )
})

rutasArticulos.get('/:revista/articulos/:id', async (req, res) => {
  res.json(
    await detalleArticulo(pool, idRevista(req.params.revista), idNumerico(req.params.id, 'Artículo')),
  )
})

const autorNuevo = z.object({
  nombre: z.string().trim().min(1),
  correo: z.string().trim(),
  orcid: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])?$/, 'Use el formato 0000-0000-0000-0000'),
  filiacion: z.string().trim(),
  pais: z.string().trim(),
})
const nuevoArticulo = z.object({
  numeroOjs: z.string().trim().min(1, 'Escriba el número de OJS'),
  titulo: z.string().trim().min(1, 'Escriba el título'),
  tipo: z.enum(TIPOS),
  fechaPostulacion: z.string().min(1),
  autores: z
    .array(z.union([z.object({ autorId: z.string() }), z.object({ nuevo: autorNuevo })]))
    .min(1, 'Agregue al menos un autor')
    .max(7, 'El artículo admite hasta siete autores'),
})

rutasArticulos.post('/:revista/articulos', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const usuario = usuarioDe(req)
  const datos = nuevoArticulo.parse(req.body)
  const id = await enTransaccion(async (c) => {
    const { rows } = await c.query<{ id_articulo: number }>(
      `INSERT INTO articulo (id_revista, numero_ojs, titulo, tipo, fecha_postulacion)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_articulo`,
      [revista, datos.numeroOjs, datos.titulo, datos.tipo, datos.fechaPostulacion],
    )
    const idArticulo = rows[0]?.id_articulo ?? 0
    for (const [i, a] of datos.autores.entries()) {
      let idAutor: number
      let filiacion: string | null = null
      let pais: string | null = null
      if ('autorId' in a) {
        idAutor = idNumerico(a.autorId, 'Autor')
        // The affiliation of the author's most recent article is proposed (HU-07).
        const previa = await c.query<{ filiacion: string | null; pais: string | null }>(
          `SELECT filiacion, pais FROM articulo_autor WHERE id_autor = $1
            ORDER BY id_articulo DESC LIMIT 1`,
          [idAutor],
        )
        filiacion = previa.rows[0]?.filiacion ?? null
        pais = previa.rows[0]?.pais ?? null
      } else {
        const n = a.nuevo
        const creado = await c.query<{ id_autor: number }>(
          `INSERT INTO autor (nombre, orcid, correo) VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
           RETURNING id_autor`,
          [n.nombre, n.orcid, n.correo],
        )
        idAutor = creado.rows[0]?.id_autor ?? 0
        filiacion = n.filiacion || null
        pais = n.pais || null
      }
      await c.query(
        `INSERT INTO articulo_autor (id_articulo, id_autor, orden, filiacion, pais)
         VALUES ($1, $2, $3, $4, $5)`,
        [idArticulo, idAutor, i + 1, filiacion, pais],
      )
    }
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'articulo',
      idRegistro: idArticulo,
      accion: 'registro',
      texto: `Registró el artículo ${datos.numeroOjs}`,
      revista,
      articulo: idArticulo,
    })
    return idArticulo
  })
  res.status(201).json(await detalleArticulo(pool, revista, id))
})

const edicion = z.object({
  titulo: z.string().trim().min(1).optional(),
  tipo: z.enum(TIPOS).optional(),
  publicacion: z
    .object({ volumen: z.number().int().positive(), numero: z.number().int().positive() })
    .nullable()
    .optional(),
})

rutasArticulos.patch('/:revista/articulos/:id', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Artículo')
  const usuario = usuarioDe(req)
  const cambios = edicion.parse(req.body)
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
      usuario: usuario.id,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'edicion',
      texto: 'Editó los datos del artículo',
      revista,
      articulo: id,
    })
  })
  res.json(await detalleArticulo(pool, revista, id))
})

const ronda = z.object({
  coincidencias: z.number().min(0).max(100).nullable(),
  atribuidoIa: z.number().min(0).max(100).nullable(),
  resultado: z.enum(['aprobado', 'rechazado', 'ajustes']),
  observacion: z.string(),
})
const ETIQUETA_RONDA = { aprobado: 'Aprobado', rechazado: 'Rechazado', ajustes: 'Requiere ajustes' }

rutasArticulos.post('/:revista/articulos/:id/rondas', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Artículo')
  const usuario = usuarioDe(req)
  const datos = ronda.parse(req.body)
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, id)
    const pares = await c.query('SELECT 1 FROM evaluacion WHERE id_articulo = $1 LIMIT 1', [id])
    if (!['postulado', 'en-revision'].includes(a.estado) || pares.rows.length > 0) {
      throw new ErrorHttp(409, 'La revisión del comité ya terminó para este artículo')
    }
    await c.query(
      `UPDATE articulo SET porcentaje_coincidencias = $1, porcentaje_ia = $2, estado = $3
        WHERE id_articulo = $4`,
      [datos.coincidencias, datos.atribuidoIa, datos.resultado === 'rechazado' ? 'rechazado' : 'en-revision', id],
    )
    await c.query(
      `INSERT INTO revision_inicial_comite (id_articulo, id_usuario, resultado, observacion)
       VALUES ($1, $2, $3, NULLIF($4, ''))`,
      [id, usuario.id, datos.resultado, datos.observacion.trim()],
    )
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'revision',
      texto: `Registró una ronda de la revisión del comité: ${ETIQUETA_RONDA[datos.resultado]}`,
      revista,
      articulo: id,
    })
  })
  res.status(201).json(await detalleArticulo(pool, revista, id))
})

// RF-07: only while in the committee review; the database trigger enforces it as well.
rutasArticulos.post('/:revista/articulos/:id/trasladar', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Artículo')
  const usuario = usuarioDe(req)
  const destino = revista === 1 ? 2 : 1
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, id)
    const aprobada = (await ultimaRonda(c, id)) === 'aprobado'
    const pares = await c.query('SELECT 1 FROM evaluacion WHERE id_articulo = $1 LIMIT 1', [id])
    if (!['postulado', 'en-revision'].includes(a.estado) || aprobada || pares.rows.length > 0) {
      throw new ErrorHttp(409, 'El artículo ya no está en revisión del comité: no puede cambiar de revista')
    }
    await c.query('UPDATE articulo SET id_revista = $1 WHERE id_articulo = $2', [destino, id])
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'traslado',
      texto: `Cambió el artículo de revista (${siglaDe(revista)} → ${siglaDe(destino)})`,
      revista: destino,
      articulo: id,
    })
  })
  res.json(await detalleArticulo(pool, destino, id))
})

const cierre = z.object({
  estado: z.enum(['aprobado', 'rechazado', 'archivado']),
  motivo: z.string().trim().min(1, 'Escriba el motivo del cierre'),
  publicacion: z
    .object({ volumen: z.number().int().positive(), numero: z.number().int().positive() })
    .nullable(),
})

rutasArticulos.post('/:revista/articulos/:id/cerrar', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Artículo')
  const usuario = usuarioDe(req)
  const datos = cierre.parse(req.body)
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
      usuario: usuario.id,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'cierre',
      texto: `Cerró el proceso como ${datos.estado}: ${datos.motivo}`,
      revista,
      articulo: id,
    })
  })
  res.json(await detalleArticulo(pool, revista, id))
})

rutasArticulos.post('/:revista/articulos/:id/reabrir', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Artículo')
  const usuario = usuarioDe(req)
  const { motivo, estado } = z
    .object({ motivo: z.string().trim().min(1, 'Escriba el motivo de la reapertura'), estado: z.enum(ESTADOS) })
    .parse(req.body)
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, id)
    if (a.estado !== 'archivado') throw new ErrorHttp(409, 'El artículo no está archivado')
    await c.query('UPDATE articulo SET estado = $1 WHERE id_articulo = $2', [estado, id])
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'articulo',
      idRegistro: id,
      accion: 'reapertura',
      texto: `Retomó el proceso: ${motivo}`,
      revista,
      articulo: id,
    })
  })
  res.json(await detalleArticulo(pool, revista, id))
})

rutasArticulos.get('/:revista/articulos/:id/historial', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Artículo')
  await articuloDeRevista(pool, revista, id)
  const correos = await pool.query<FilaCorreo>(`${SELECCION_CORREOS} WHERE e.id_articulo = $1`, [id])
  const auditoria = await pool.query(
    `SELECT a.*, u.nombre AS usuario FROM auditoria a LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
      WHERE (a.detalle->>'articulo')::int = $1 ORDER BY a.fecha DESC`,
    [id],
  )
  res.json({
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
  })
})
