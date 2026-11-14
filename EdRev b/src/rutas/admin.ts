/*
 * Administración — the Administradora's only (RNF-05): user accounts (RF-40; a new account
 * receives a link to define its password), each journal's templates with the constancia's header,
 * footer and signature images (RF-45) and the audit log of both journals (RF-41).
 */
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { soloAdministradora, usuarioDe } from '../lib/auth.js'
import { crearEnlace, enlaceDemo } from '../lib/enlaces.js'
import { diasEspera, guardarDiasEspera } from '../servicios/configuracion.js'
import { enviarEnlaceContrasena } from '../servicios/correoCuentas.js'
import { ErrorHttp, idNumerico, idRevista, siglaDe } from '../lib/http.js'
import { vistaPrevia } from '../servicios/constanciaPdf.js'
import { iso, usuarioApi, type FilaUsuario } from '../lib/mapeo.js'

export const rutasAdmin = Router()
rutasAdmin.use(['/usuarios', '/plantillas', '/auditoria', '/configuracion'], soloAdministradora)

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
  const creada = await enTransaccion(async (c) => {
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
    return { cuerpo: { ...usuarioApi(nuevo), ...enlaceDemo(ruta) }, ruta, nuevo }
  })
  enviarEnlaceContrasena(creada.nuevo.correo, creada.nuevo.nombre, 'activacion', creada.ruta)
  res.status(201).json(creada.cuerpo)
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
  const ruta = await crearEnlace(pool, id, 'activacion')
  enviarEnlaceContrasena(rows[0].correo, rows[0].nombre, 'activacion', ruta)
  res.status(202).json(enlaceDemo(ruta))
})

// ---------------------------------------------------------------- Plantillas
// A template is a mail (subject and text; invitation or thank-you) or a file (the constancia: a
// text between a header and a footer image, with the signature image where {{firma}} is).
const VARIABLES: Record<string, string[]> = {
  invitacion: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo', 'botones'],
  agradecimiento: ['revista', 'par', 'articulo'],
  // REVISTA and PAR are the same texts in capitals.
  constancia: ['revista', 'REVISTA', 'par', 'PAR', 'articulo', 'issn', 'indexaciones', 'fecha', 'anio', 'firma'],
}

const PARTES = ['encabezado', 'pie', 'firma'] as const
type Parte = (typeof PARTES)[number]

interface FilaPlantilla {
  id_plantilla: number
  id_revista: number
  nombre: string
  tipo: string
  asunto: string | null
  cuerpo: string
  en_uso: boolean
  t_encabezado: number | null
  t_pie: number | null
  t_firma: number | null
}

const SELECCION_PLANTILLA = `SELECT id_plantilla, id_revista, nombre, tipo, asunto, cuerpo, en_uso,
                                    octet_length(encabezado) AS t_encabezado, octet_length(pie) AS t_pie,
                                    octet_length(firma) AS t_firma FROM plantilla`

function plantillaApi(p: FilaPlantilla) {
  const imagen = (nombre: string, tamano: number | null) => (tamano ? { nombre, tamano } : null)
  return {
    id: String(p.id_plantilla),
    revista: siglaDe(p.id_revista),
    uso: p.tipo,
    clase: p.tipo === 'constancia' ? 'archivo' : 'correo',
    nombre: p.nombre,
    asunto: p.asunto,
    cuerpo: p.cuerpo,
    variables: VARIABLES[p.tipo] ?? [],
    enUso: p.en_uso,
    imagenes:
      p.tipo === 'constancia'
        ? {
            encabezado: imagen('Encabezado', p.t_encabezado),
            pie: imagen('Pie de página', p.t_pie),
            firma: imagen('Firma', p.t_firma),
          }
        : null,
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
    const hay = cuerpo.includes(`{{${obligatorio}}}`) || (tipo === 'constancia' && cuerpo.includes(`{{${obligatorio.toUpperCase()}}}`))
    if (!hay) throw new ErrorHttp(422, `Falta el marcador obligatorio {{${obligatorio}}}`)
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
      nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla').max(80, 'Máximo 80 caracteres'),
      clase: z.enum(['correo', 'archivo']),
      uso: z.enum(['invitacion', 'agradecimiento']).optional(),
    })
    .parse(req.body)
  const tipo = d.clase === 'archivo' ? 'constancia' : d.uso
  if (!tipo) throw new ErrorHttp(422, 'Elija para qué correo es la plantilla')
  const revista = d.revista === 'reep' ? 1 : 2
  // Starts from the text (and images) of the journal's template in use for that use.
  const { rows } = await pool
    .query<{ id_plantilla: number }>(
      `INSERT INTO plantilla (id_revista, nombre, tipo, asunto, cuerpo, encabezado, pie, firma, en_uso)
       SELECT id_revista, $3, tipo, asunto, cuerpo, encabezado, pie, firma, FALSE FROM plantilla
        WHERE id_revista = $1 AND tipo = $2 AND en_uso RETURNING id_plantilla`,
      [revista, tipo, d.nombre],
    )
    .catch((e: { code?: string }) => {
      if (e.code === '23505') throw new ErrorHttp(409, 'Ya existe una plantilla con ese nombre en esta revista')
      throw e
    })
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

const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

function parteDe(valor: unknown): Parte {
  const parte = PARTES.find((x) => x === valor)
  if (!parte) throw new ErrorHttp(404, 'Parte de la plantilla no válida')
  return parte
}

/** The header, the footer or the signature of a constancia: a PNG or JPG image. */
rutasAdmin.post('/plantillas/:id/imagen/:parte', subida.single('archivo'), async (req, res) => {
  const p = await plantilla(idNumerico(req.params.id, 'Plantilla'))
  const parte = parteDe(req.params.parte)
  if (p.tipo !== 'constancia') throw new ErrorHttp(409, 'Solo la plantilla de archivo lleva encabezado, pie y firma')
  const archivo = req.file
  if (!archivo) throw new ErrorHttp(422, 'Adjunte la imagen')
  const b = archivo.buffer
  const png = b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  const jpg = b.length > 3 && b[0] === 0xff && b[1] === 0xd8
  if (!png && !jpg) throw new ErrorHttp(422, 'La imagen debe ser PNG o JPG')
  await pool.query(`UPDATE plantilla SET ${parte} = $1 WHERE id_plantilla = $2`, [b, p.id_plantilla])
  res.json(plantillaApi(await plantilla(p.id_plantilla)))
})

rutasAdmin.delete('/plantillas/:id/imagen/:parte', async (req, res) => {
  const p = await plantilla(idNumerico(req.params.id, 'Plantilla'))
  const parte = parteDe(req.params.parte)
  await pool.query(`UPDATE plantilla SET ${parte} = NULL WHERE id_plantilla = $1`, [p.id_plantilla])
  res.json(plantillaApi(await plantilla(p.id_plantilla)))
})

/** The constancia as it is saved, with sample data. */
rutasAdmin.get('/plantillas/:id/vista-previa', async (req, res) => {
  const p = await plantilla(idNumerico(req.params.id, 'Plantilla'))
  if (p.tipo !== 'constancia') throw new ErrorHttp(409, 'Solo la plantilla de archivo tiene vista previa en PDF')
  const pdf = await vistaPrevia(pool, p.id_plantilla)
  res.type('application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="vista-previa.pdf"')
  res.send(Buffer.from(pdf ?? []))
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

// ------------------------------------------------------------- Configuración
/** The ISSN and the indexations of each journal go in its constancia ({{issn}}, {{indexaciones}}). */
async function datosRevistas() {
  const { rows } = await pool.query<{ id_revista: number; issn: string | null; indexaciones: string | null }>(
    'SELECT id_revista, issn, indexaciones FROM revista ORDER BY id_revista',
  )
  return Object.fromEntries(
    rows.map((r) => [siglaDe(r.id_revista), { issn: r.issn ?? '', indexaciones: r.indexaciones ?? '' }]),
  )
}

/** Days a peer has to answer before the 2nd attempt and, later, the block (RF-29). */
rutasAdmin.get('/configuracion', async (_req, res) => {
  res.json({ diasEspera: await diasEspera(pool), revistas: await datosRevistas() })
})

rutasAdmin.put('/configuracion', async (req, res) => {
  const { diasEspera: dias } = z
    .object({ diasEspera: z.number().min(0.0001, 'Escriba los días de espera').max(60, 'Máximo 60 días') })
    .parse(req.body)
  const usuario = usuarioDe(req)
  await enTransaccion(async (c) => {
    const antes = await diasEspera(c)
    await guardarDiasEspera(c, dias)
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'configuracion',
      idRegistro: 'dias_espera_respuesta',
      accion: 'edicion',
      texto: `Cambió los días de espera de la respuesta del par de ${antes} a ${dias}`,
    })
  })
  res.json({ diasEspera: dias, revistas: await datosRevistas() })
})

rutasAdmin.put('/configuracion/revistas/:sigla', async (req, res) => {
  const id = idRevista(req.params.sigla)
  const d = z
    .object({
      issn: z
        .string()
        .trim()
        .regex(/^(\d{4}-\d{3}[\dXx])?$/, 'El ISSN tiene la forma 1234-567X'),
      indexaciones: z.string().trim().max(1500, 'Máximo 1500 caracteres'),
    })
    .parse(req.body)
  const usuario = usuarioDe(req)
  await enTransaccion(async (c) => {
    await c.query('UPDATE revista SET issn = $2, indexaciones = $3 WHERE id_revista = $1', [
      id,
      d.issn ? d.issn.toUpperCase() : null,
      d.indexaciones || null,
    ])
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'configuracion',
      idRegistro: `revista_${id}`,
      accion: 'edicion',
      texto: `Cambió el ISSN y las indexaciones de ${siglaDe(id).toUpperCase()}`,
    })
  })
  res.json((await datosRevistas())[siglaDe(id)])
})
