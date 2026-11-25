/*
 * plantillas (servicio) — las plantillas de cada revista. Cada una sirve para algo fijo (su «fin»), que se elige al crearla:
 * - Invitación al par y agradecimiento al par: pueden ser varias por revista. Una es la predeterminada (la que sale
 *   marcada al asignar un par o emitir una constancia) y quien envía puede escoger otra en esa misma ventana.
 * - Constancia: una sola por revista, permanente; solo se edita. Es un archivo: un texto entre una imagen de
 *   encabezado y una de pie de página, con la imagen de la firma donde está {{firma}}.
 * - Mensaje: se envía a mano desde la ficha de un par o de un autor.
 * Los datos que una plantilla puede traer dependen de su fin.
 */
import { enTransaccion, pool } from '../../db.js'
import { auditar, type AccionAuditoria } from '../../lib/auditoria.js'
import { datosRevista, EJEMPLO, limiteEscrito, plazoEscrito } from '../../lib/datosCorreo.js'
import { ErrorHttp, siglaDe } from '../../lib/http.js'
import { aHtml } from '../../lib/formato.js'
import { escudoEmbebido, marcoInstitucional } from '../../lib/marcoCorreo.js'
import { botonesHtml, MARCA_BOTONES } from '../../lib/respuestas.js'
import { vistaPrevia } from '../constanciaPdf.js'
import { diasEspera } from '../configuracion.js'

export type Uso = 'invitacion' | 'agradecimiento' | 'constancia'
/** Para qué se creó una plantilla: los tres usos automáticos, o «mensaje» (un correo que se envía a mano). */
export type Fin = Uso | 'mensaje'
export type Parte = 'encabezado' | 'pie' | 'firma'
export const PARTES: readonly Parte[] = ['encabezado', 'pie', 'firma']
const NOMBRE_PARTE: Record<Parte, string> = { encabezado: 'encabezado', pie: 'pie de página', firma: 'firma' }

/** Los datos (marcas) que acepta cada fin; REVISTA y PAR son los mismos textos en mayúsculas. */
export const VARIABLES: Record<Fin, string[]> = {
  // Los de la estructura original (revista, par, artículo y fecha) más los del proceso que sirven al invitar.
  invitacion: [
    'par', 'PAR', 'profesion', 'universidad', 'area', 'articulo', 'numero', 'tipo', 'revista', 'REVISTA',
    'issn', 'contacto', 'plazo', 'limite', 'fecha', 'anio', 'botones',
  ],
  agradecimiento: [
    'par', 'PAR', 'profesion', 'universidad', 'area', 'articulo', 'numero', 'tipo', 'entrega', 'revista', 'REVISTA',
    'issn', 'indexaciones', 'contacto', 'fecha', 'anio',
  ],
  constancia: ['revista', 'REVISTA', 'par', 'PAR', 'articulo', 'numero', 'issn', 'indexaciones', 'fecha', 'anio', 'firma'],
  // Un mensaje se escribe a un par o a un autor, por cualquier motivo: lleva los datos de la persona, los de su
  // artículo más reciente en la revista desde la que se escribe y los de la revista.
  mensaje: [
    'nombre', 'NOMBRE', 'correo', 'profesion', 'universidad', 'area', 'pais', 'orcid', 'articulo', 'numero', 'tipo',
    'estado', 'revista', 'REVISTA', 'issn', 'indexaciones', 'contacto', 'fecha', 'anio',
  ],
}

interface FilaPlantilla {
  id_plantilla: number
  id_revista: number
  nombre: string
  clase: 'correo' | 'archivo'
  /** Para qué sirve la plantilla; no cambia. */
  fin: Fin
  /** Para qué se usa ahora (igual a `fin`), o null si no está en uso. */
  tipo: string | null
  asunto: string | null
  cuerpo: string
  t_encabezado: number | null
  t_pie: number | null
  t_firma: number | null
}

const SELECCION_PLANTILLA = `SELECT id_plantilla, id_revista, nombre, clase, fin, tipo, asunto, cuerpo,
                                    octet_length(encabezado) AS t_encabezado, octet_length(pie) AS t_pie,
                                    octet_length(firma) AS t_firma FROM plantilla`

/** Los datos que acepta una plantilla: los del fin para el que se creó. */
function variablesDe(p: FilaPlantilla): string[] {
  return VARIABLES[p.fin] ?? []
}

function plantillaApi(p: FilaPlantilla) {
  const imagen = (nombre: string, tamano: number | null) => (tamano ? { nombre, tamano } : null)
  return {
    id: String(p.id_plantilla),
    revista: siglaDe(p.id_revista),
    uso: p.tipo,
    fin: p.fin,
    clase: p.clase,
    nombre: p.nombre,
    asunto: p.asunto,
    cuerpo: p.cuerpo,
    variables: variablesDe(p),
    enUso: p.tipo !== null,  // «predeterminada» para las invitaciones, los agradecimientos y la constancia
    imagenes:
      p.clase === 'archivo'
        ? {
            encabezado: imagen('Encabezado', p.t_encabezado),
            pie: imagen('Pie de página', p.t_pie),
            firma: imagen('Firma', p.t_firma),
          }
        : null,
  }
}

async function cargar(id: number): Promise<FilaPlantilla> {
  const { rows } = await pool.query<FilaPlantilla>(`${SELECCION_PLANTILLA} WHERE id_plantilla = $1`, [id])
  if (!rows[0]) throw new ErrorHttp(404, 'Plantilla no encontrada')
  return rows[0]
}

/** Solo se pueden usar las marcas de la plantilla, y ninguna es obligatoria. */
function validar(permitidos: string[], asunto: string | null, cuerpo: string): void {
  if (!cuerpo.trim()) throw new ErrorHttp(422, 'El texto no puede estar vacío')
  const usados = [...`${asunto ?? ''} ${cuerpo}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? '')
  const desconocido = usados.find((m) => !permitidos.includes(m))
  if (desconocido) throw new ErrorHttp(422, `El marcador {{${desconocido}}} no existe en esta plantilla`)
}

/** Deja en la auditoría quién cambió una plantilla (los textos de los correos y de la constancia llegan a todos los pares). */
async function registrarCambio(p: FilaPlantilla, actor: number, accion: AccionAuditoria, texto: string): Promise<void> {
  await auditar(pool, { usuario: actor, tabla: 'plantilla', idRegistro: p.id_plantilla, accion, texto, revista: p.id_revista })
}

const numeroDeRevista = (sigla: 'reep' | 'ire') => (sigla === 'reep' ? 1 : 2)

export async function listarPlantillas() {
  const { rows } = await pool.query<FilaPlantilla>(`${SELECCION_PLANTILLA} ORDER BY id_revista, id_plantilla`)
  return { plantillas: rows.map(plantillaApi) }
}

export interface DatosNuevaPlantilla {
  revista: 'reep' | 'ire'
  nombre: string
  /** Para qué es: invitar a un par, agradecerle o un mensaje libre. La constancia ya existe y no se crea. */
  fin: 'invitacion' | 'agradecimiento' | 'mensaje'
}

/** Una plantilla nueva nace en blanco, para el fin que se elige; nunca es la predeterminada hasta que se marque. */
export async function crearPlantilla(d: DatosNuevaPlantilla, actor: number) {
  const revista = numeroDeRevista(d.revista)
  const id = await enTransaccion(async (c) => {
    const { rows } = await c
      .query<{ id_plantilla: number }>(
        `INSERT INTO plantilla (id_revista, nombre, clase, fin, asunto, cuerpo)
         VALUES ($1, $2, 'correo', $3, '', '') RETURNING id_plantilla`,
        [revista, d.nombre, d.fin],
      )
      .catch((e: { code?: string }): never => {
        if (e.code === '23505') throw new ErrorHttp(409, 'Ya existe una plantilla con ese nombre en esta revista')
        throw e
      })
    return rows[0]?.id_plantilla ?? 0
  })
  const creada = await cargar(id)
  await registrarCambio(creada, actor, 'registro', `Creó la plantilla «${d.nombre}»`)
  return plantillaApi(creada)
}

/** Marca la plantilla como la predeterminada de su fin en su revista; la anterior queda como una más. */
export async function marcarPredeterminada(id: number, actor: number) {
  const p = await cargar(id)
  if (p.fin !== 'invitacion' && p.fin !== 'agradecimiento') {
    throw new ErrorHttp(409, 'Solo las invitaciones y los agradecimientos tienen una plantilla predeterminada')
  }
  if (!p.cuerpo.trim()) {
    throw new ErrorHttp(422, 'La plantilla aún no tiene texto: escríbalo antes de dejarla como la predeterminada')
  }
  validar(VARIABLES[p.fin], p.asunto, p.cuerpo)
  await enTransaccion(async (c) => {
    await c.query('UPDATE plantilla SET tipo = NULL WHERE id_revista = $1 AND tipo = $2', [p.id_revista, p.fin])
    await c.query('UPDATE plantilla SET tipo = $2 WHERE id_plantilla = $1', [p.id_plantilla, p.fin])
  })
  await registrarCambio(p, actor, 'edicion', `Dejó «${p.nombre}» como la plantilla en uso`)
  return plantillaApi(await cargar(p.id_plantilla))
}

export async function eliminarPlantilla(id: number, actor: number): Promise<void> {
  const p = await cargar(id)
  if (p.fin === 'constancia') throw new ErrorHttp(409, 'La constancia de la revista no se elimina: solo se edita')
  await pool.query('DELETE FROM plantilla WHERE id_plantilla = $1', [p.id_plantilla])
  await registrarCambio(p, actor, 'eliminacion', `Eliminó la plantilla «${p.nombre}»`)
}

/** Guarda el asunto y el texto de una plantilla; solo se aceptan los datos de su fin. */
export async function guardarPlantilla(id: number, d: { asunto: string | null; cuerpo: string }, actor: number) {
  const p = await cargar(id)
  const asunto = p.clase === 'archivo' ? null : (d.asunto ?? p.asunto)
  validar(variablesDe(p), asunto, d.cuerpo)
  await pool.query('UPDATE plantilla SET asunto = $1, cuerpo = $2 WHERE id_plantilla = $3', [asunto, d.cuerpo, p.id_plantilla])
  await registrarCambio(p, actor, 'edicion', `Editó el texto de la plantilla «${p.nombre}»`)
  return plantillaApi(await cargar(p.id_plantilla))
}

export function parteDe(valor: unknown): Parte {
  const parte = PARTES.find((x) => x === valor)
  if (!parte) throw new ErrorHttp(404, 'Parte de la plantilla no válida')
  return parte
}

/** El encabezado, el pie o la firma de una constancia: una imagen PNG o JPG. */
export async function subirImagen(id: number, parte: Parte, imagen: Buffer | undefined, actor: number) {
  const p = await cargar(id)
  if (p.clase !== 'archivo') throw new ErrorHttp(409, 'Solo la plantilla de archivo (la constancia) lleva imágenes')
  if (!imagen) throw new ErrorHttp(422, 'Adjunte la imagen')
  const png = imagen.length > 8 && imagen[0] === 0x89 && imagen[1] === 0x50 && imagen[2] === 0x4e && imagen[3] === 0x47
  const jpg = imagen.length > 3 && imagen[0] === 0xff && imagen[1] === 0xd8
  if (!png && !jpg) throw new ErrorHttp(422, 'La imagen debe ser PNG o JPG')
  await pool.query(`UPDATE plantilla SET ${parte} = $1 WHERE id_plantilla = $2`, [imagen, p.id_plantilla])
  await registrarCambio(p, actor, 'edicion', `Cambió la imagen de ${NOMBRE_PARTE[parte]} de «${p.nombre}»`)
  return plantillaApi(await cargar(p.id_plantilla))
}

export async function quitarImagen(id: number, parte: Parte, actor: number) {
  const p = await cargar(id)
  await pool.query(`UPDATE plantilla SET ${parte} = NULL WHERE id_plantilla = $1`, [p.id_plantilla])
  await registrarCambio(p, actor, 'edicion', `Quitó la imagen de ${NOMBRE_PARTE[parte]} de «${p.nombre}»`)
  return plantillaApi(await cargar(p.id_plantilla))
}

/** El correo completo (con el marco institucional) con datos de ejemplo, para el texto que se está editando. */
export async function vistaCorreo(d: {
  revista: 'reep' | 'ire'
  uso: 'invitacion' | 'agradecimiento' | 'mensaje'
  cuerpo: string
}) {
  const { rows } = await pool.query<{ nombre: string; correo_remitente: string; issn: string | null; indexaciones: string | null }>(
    'SELECT nombre, correo_remitente, issn, indexaciones FROM revista WHERE id_revista = $1',
    [numeroDeRevista(d.revista)],
  )
  const revista = rows[0]
  if (!revista) throw new ErrorHttp(404, 'Revista no encontrada')
  const dias = await diasEspera(pool)
  const ejemplo: Record<string, string> = {
    ...EJEMPLO,
    ...datosRevista(revista),
    plazo: plazoEscrito(dias),
    limite: limiteEscrito(dias),
    botones: MARCA_BOTONES,
  }
  const texto = d.cuerpo.replace(/\{\{(\w+)\}\}/g, (m, k: string) => ejemplo[k] ?? m)
  const botones = d.uso === 'invitacion' ? botonesHtml(0, true) : ''
  return {
    html: marcoInstitucional({
      tipo: d.uso,
      revista: revista.nombre,
      contacto: revista.correo_remitente,
      contenido: aHtml(texto, { marca: MARCA_BOTONES, html: botones }),
      escudo: escudoEmbebido(),
    }),
  }
}

/** La constancia como el PDF que realmente es; con `cuerpo` muestra el texto que se está editando, no el guardado. */
export async function vistaPdf(id: number, cuerpo?: string): Promise<Uint8Array> {
  const p = await cargar(id)
  if (p.clase !== 'archivo') throw new ErrorHttp(409, 'Solo la plantilla de archivo tiene vista previa en PDF')
  return (await vistaPrevia(pool, p.id_plantilla, cuerpo)) ?? new Uint8Array()
}

/** Las plantillas de invitación o de agradecimiento de una revista que ya tienen texto, la predeterminada primero. */
export async function plantillasParaEnviar(revista: number, fin: 'invitacion' | 'agradecimiento') {
  const { rows } = await pool.query<FilaPlantilla>(
    `${SELECCION_PLANTILLA} WHERE id_revista = $1 AND fin = $2 AND btrim(cuerpo) <> ''
      ORDER BY (tipo IS NULL), nombre`,
    [revista, fin],
  )
  return rows.map((p) => ({
    id: String(p.id_plantilla),
    nombre: p.nombre,
    predeterminada: p.tipo !== null,
    asunto: p.asunto ?? '',
    cuerpo: p.cuerpo,
  }))
}

/** Lo que el usuario eligió al enviar: una plantilla de la revista. */
export interface EleccionEnvio {
  plantillaId?: number
}

/** Comprueba la elección (la plantilla es de la revista, del fin y tiene texto). */
export async function validarEleccion(
  revista: number,
  fin: 'invitacion' | 'agradecimiento',
  e: EleccionEnvio | undefined,
): Promise<EleccionEnvio | undefined> {
  if (!e) return undefined
  if (e.plantillaId !== undefined) {
    // Los números de plantilla caben en un SMALLINT: uno más grande no existe (y la base daría un error).
    if (e.plantillaId > 32767) throw new ErrorHttp(404, 'La plantilla no existe en esa revista o no tiene texto')
    const { rows } = await pool.query<{ id_plantilla: number }>(
      `SELECT id_plantilla FROM plantilla WHERE id_plantilla = $1 AND id_revista = $2 AND fin = $3 AND btrim(cuerpo) <> ''`,
      [e.plantillaId, revista, fin],
    )
    if (!rows[0]) throw new ErrorHttp(404, 'La plantilla no existe en esa revista o no tiene texto')
  }
  return e
}
