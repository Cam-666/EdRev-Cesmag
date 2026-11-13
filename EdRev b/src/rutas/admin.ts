/*
 * Administración — the Administradora's only (RNF-05): user accounts (RF-40; a new account
 * receives a link to define its password), each journal's templates with the constancia's PDF
 * background (RF-45) and the audit log of both journals (RF-41).
 */
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { soloAdministradora, usuarioDe } from '../lib/auth.js'
import { crearEnlace, enlaceDemo } from '../lib/enlaces.js'
import { ErrorHttp, idNumerico, siglaDe } from '../lib/http.js'
import { iso, usuarioApi, type FilaUsuario } from '../lib/mapeo.js'

export const rutasAdmin = Router()
rutasAdmin.use(['/usuarios', '/plantillas', '/auditoria'], soloAdministradora)

const institucional = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@unicesmag\.edu\.co$/, 'Use un correo institucional @unicesmag.edu.co')

// ---------------------------------------------------------------- Usuarios
rutasAdmin.get('/usuarios', async (_req, res) => {
  const { rows } = await pool.query<FilaUsuario>('SELECT * FROM usuario ORDER BY nombre')
  res.json(rows.map(usuarioApi))
})

rutasAdmin.post('/usuarios', async (req, res) => {
  const datos = z
    .object({
      nombre: z.string().trim().min(1, 'Escriba el nombre'),
      correo: institucional,
      perfil: z.enum(['administrador', 'auxiliar']),
    })
    .parse(req.body)
  const usuario = usuarioDe(req)
  const cuerpo = await enTransaccion(async (c) => {
    const existe = await c.query('SELECT 1 FROM usuario WHERE correo = $1', [datos.correo])
    if (existe.rows.length > 0) throw new ErrorHttp(409, 'Ya existe una cuenta con ese correo')
    const { rows } = await c.query<FilaUsuario>(
      `INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES ($1, $2, '-', $3) RETURNING *`,
      [datos.nombre, datos.correo, datos.perfil],
    )
    const nuevo = rows[0] as FilaUsuario
    const ruta = await crearEnlace(c, nuevo.id_usuario, 'activacion')
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'usuario',
      idRegistro: nuevo.id_usuario,
      accion: 'registro',
      texto: `Creó la cuenta de ${nuevo.nombre}`,
    })
    return { ...usuarioApi(nuevo), ...enlaceDemo(ruta) }
  })
  res.status(201).json(cuerpo)
})

rutasAdmin.patch('/usuarios/:id', async (req, res) => {
  const id = idNumerico(req.params.id, 'Usuario')
  const cambios = z
    .object({
      nombre: z.string().trim().min(1).optional(),
      correo: institucional.optional(),
      perfil: z.enum(['administrador', 'auxiliar']).optional(),
      estado: z.enum(['activo', 'inhabilitado']).optional(),
    })
    .parse(req.body)
  const usuario = usuarioDe(req)
  const fila = await enTransaccion(async (c) => {
    const { rows } = await c.query<FilaUsuario>('SELECT * FROM usuario WHERE id_usuario = $1', [id])
    const actual = rows[0]
    if (!actual) throw new ErrorHttp(404, 'Usuario no encontrado')
    const quedaAdmin = (cambios.perfil ?? actual.rol) === 'administrador' && (cambios.estado ?? (actual.activo ? 'activo' : 'inhabilitado')) === 'activo'
    if (actual.rol === 'administrador' && actual.activo && !quedaAdmin) {
      const otras = await c.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM usuario WHERE rol = 'administrador' AND activo AND id_usuario <> $1",
        [id],
      )
      if ((otras.rows[0]?.n ?? 0) === 0) throw new ErrorHttp(409, 'Debe quedar al menos una administradora activa')
    }
    const { rows: nuevos } = await c.query<FilaUsuario>(
      `UPDATE usuario SET nombre = COALESCE($1, nombre), correo = COALESCE($2, correo),
              rol = COALESCE($3, rol), activo = COALESCE($4, activo)
        WHERE id_usuario = $5 RETURNING *`,
      [cambios.nombre ?? null, cambios.correo ?? null, cambios.perfil ?? null, cambios.estado ? cambios.estado === 'activo' : null, id],
    )
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'usuario',
      idRegistro: id,
      accion: 'edicion',
      texto: `Editó la cuenta de ${actual.nombre}`,
    })
    return nuevos[0] as FilaUsuario
  })
  res.json(usuarioApi(fila))
})

rutasAdmin.post('/usuarios/:id/enlace', async (req, res) => {
  const id = idNumerico(req.params.id, 'Usuario')
  const { rows } = await pool.query<FilaUsuario>('SELECT * FROM usuario WHERE id_usuario = $1', [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Usuario no encontrado')
  if (!rows[0].activo) throw new ErrorHttp(409, 'La cuenta está inhabilitada')
  res.status(202).json(enlaceDemo(await crearEnlace(pool, id, 'activacion')))
})

// ---------------------------------------------------------------- Plantillas
const VARIABLES: Record<string, string[]> = {
  invitacion: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo'],
  agradecimiento: ['revista', 'par', 'articulo'],
  constancia: ['revista', 'par', 'articulo'],
}

interface FilaPlantilla {
  id_plantilla: number
  id_revista: number
  nombre: string
  tipo: string
  asunto: string | null
  cuerpo: string
  en_uso: boolean
  tamano: number | null
}

const SELECCION_PLANTILLA = `SELECT id_plantilla, id_revista, nombre, tipo, asunto, cuerpo, en_uso,
                                    octet_length(fondo_pdf) AS tamano FROM plantilla`

function plantillaApi(p: FilaPlantilla) {
  return {
    id: String(p.id_plantilla),
    revista: siglaDe(p.id_revista),
    uso: p.tipo,
    nombre: p.nombre,
    asunto: p.asunto,
    cuerpo: p.cuerpo,
    variables: VARIABLES[p.tipo] ?? [],
    enUso: p.en_uso,
    fondoPdf: p.tamano ? { nombre: `Fondo de «${p.nombre}».pdf`, tamano: p.tamano } : null,
  }
}

async function plantilla(id: number): Promise<FilaPlantilla> {
  const { rows } = await pool.query<FilaPlantilla>(`${SELECCION_PLANTILLA} WHERE id_plantilla = $1`, [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Plantilla no encontrada')
  return rows[0]
}

/** RF-45: only the template's own markers, and the peer and the article must stay. */
function validar(tipo: string, asunto: string | null, cuerpo: string): void {
  if (!cuerpo.trim()) throw new ErrorHttp(422, 'El texto no puede estar vacío')
  const usados = [...`${asunto ?? ''} ${cuerpo}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? '')
  const desconocido = usados.find((m) => !(VARIABLES[tipo] ?? []).includes(m))
  if (desconocido) throw new ErrorHttp(422, `El marcador {{${desconocido}}} no existe en esta plantilla`)
  for (const obligatorio of ['par', 'articulo']) {
    if (!cuerpo.includes(`{{${obligatorio}}}`)) throw new ErrorHttp(422, `Falta el marcador obligatorio {{${obligatorio}}}`)
  }
}

rutasAdmin.get('/plantillas', async (_req, res) => {
  const { rows } = await pool.query<FilaPlantilla>(`${SELECCION_PLANTILLA} ORDER BY id_revista, id_plantilla`)
  res.json({ plantillas: rows.map(plantillaApi) })
})

rutasAdmin.post('/plantillas', async (req, res) => {
  const d = z
    .object({
      revista: z.enum(['reep', 'ire']),
      nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla'),
      uso: z.enum(['invitacion', 'agradecimiento', 'constancia']),
    })
    .parse(req.body)
  const revista = d.revista === 'reep' ? 1 : 2
  // Starts from the text (and PDF background) of the journal's template in use.
  const { rows } = await pool.query<{ id_plantilla: number }>(
    `INSERT INTO plantilla (id_revista, nombre, tipo, asunto, cuerpo, fondo_pdf, en_uso)
     SELECT id_revista, $3, tipo, asunto, cuerpo, fondo_pdf, FALSE FROM plantilla
      WHERE id_revista = $1 AND tipo = $2 AND en_uso RETURNING id_plantilla`,
    [revista, d.uso, d.nombre],
  )
  if (!rows[0]) throw new ErrorHttp(409, 'No hay una plantilla en uso para copiar')
  res.status(201).json(plantillaApi(await plantilla(rows[0].id_plantilla)))
})

rutasAdmin.post('/plantillas/:id/usar', async (req, res) => {
  const p = await plantilla(idNumerico(req.params.id, 'Plantilla'))
  await enTransaccion(async (c) => {
    await c.query('UPDATE plantilla SET en_uso = FALSE WHERE id_revista = $1 AND tipo = $2', [p.id_revista, p.tipo])
    await c.query('UPDATE plantilla SET en_uso = TRUE WHERE id_plantilla = $1', [p.id_plantilla])
  })
  res.json(plantillaApi(await plantilla(p.id_plantilla)))
})

rutasAdmin.put('/plantillas/:id', async (req, res) => {
  const p = await plantilla(idNumerico(req.params.id, 'Plantilla'))
  const d = z.object({ asunto: z.string().nullable(), cuerpo: z.string() }).parse(req.body)
  const asunto = p.tipo === 'constancia' ? null : (d.asunto ?? p.asunto)
  validar(p.tipo, asunto, d.cuerpo)
  await pool.query('UPDATE plantilla SET asunto = $1, cuerpo = $2 WHERE id_plantilla = $3', [asunto, d.cuerpo, p.id_plantilla])
  res.json(plantillaApi(await plantilla(p.id_plantilla)))
})

const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

rutasAdmin.post('/plantillas/:id/fondo', subida.single('archivo'), async (req, res) => {
  const p = await plantilla(idNumerico(req.params.id, 'Plantilla'))
  if (p.tipo !== 'constancia') throw new ErrorHttp(409, 'Solo la constancia lleva PDF de fondo')
  const archivo = req.file
  if (!archivo) throw new ErrorHttp(422, 'Adjunte el PDF de fondo')
  const esPdf = archivo.mimetype === 'application/pdf' || archivo.originalname.toLowerCase().endsWith('.pdf')
  if (!esPdf || !archivo.buffer.subarray(0, 5).toString().startsWith('%PDF')) {
    throw new ErrorHttp(422, 'El fondo debe ser un archivo PDF')
  }
  await pool.query('UPDATE plantilla SET fondo_pdf = $1 WHERE id_plantilla = $2', [archivo.buffer, p.id_plantilla])
  res.json(plantillaApi(await plantilla(p.id_plantilla)))
})

// ---------------------------------------------------------------- Auditoría
rutasAdmin.get('/auditoria', async (req, res) => {
  const revista = req.query.revista === 'reep' ? 1 : req.query.revista === 'ire' ? 2 : null
  const usuario = String(req.query.usuario ?? '').trim()
  const tipo = req.query.tipo ? String(req.query.tipo) : null
  const pagina = Math.max(1, Number(req.query.pagina ?? 1))
  const porPagina = Math.min(1000, Math.max(1, Number(req.query.porPagina ?? 10)))
  const donde = `WHERE ($1::int IS NULL OR (a.detalle->>'revista')::int = $1)
                   AND ($2 = '' OR coalesce(u.nombre, 'Sistema') ILIKE '%' || $2 || '%')
                   AND ($3::text IS NULL OR a.accion = $3)`
  const desde = `FROM auditoria a LEFT JOIN usuario u ON u.id_usuario = a.id_usuario ${donde}`
  const total = await pool.query<{ n: number }>(`SELECT count(*)::int AS n ${desde}`, [revista, usuario, tipo])
  const { rows } = await pool.query(
    `SELECT a.*, u.nombre AS usuario ${desde} ORDER BY a.fecha DESC
      LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}`,
    [revista, usuario, tipo],
  )
  res.json({
    total: total.rows[0]?.n ?? 0,
    items: rows.map((a) => ({
      id: String(a.id_auditoria),
      revista: a.detalle?.revista ? siglaDe(Number(a.detalle.revista)) : 'reep',
      articuloId: a.detalle?.articulo ? String(a.detalle.articulo) : null,
      tipo: a.accion,
      accion: a.detalle?.texto ?? a.accion,
      fecha: iso(a.fecha),
      usuario: a.usuario ?? 'Sistema',
    })),
  })
})
