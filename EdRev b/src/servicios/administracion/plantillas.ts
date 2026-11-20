/*
 * plantillas (servicio) — las plantillas de cada revista: un correo (asunto y texto) o un archivo (la constancia:
 * un texto entre una imagen de encabezado y una de pie de página, con la imagen de la firma donde está {{firma}}).
 * Una plantilla nueva siempre nace en blanco (la persona la escribe). En cada revista solo hay una plantilla en
 * uso por tipo, y los datos que una plantilla puede traer dependen de su fin.
 * Cada plantilla conserva el fin (`fin`) para el que se creó, esté en uso o no: una de agradecimiento se
 * previsualiza, se edita y se elige como de agradecimiento. `tipo` solo dice para qué está en uso hoy.
 */
import { enTransaccion, pool } from '../../db.js'
import { ErrorHttp, siglaDe } from '../../lib/http.js'
import { aHtml } from '../../lib/formato.js'
import { escudoEmbebido, marcoInstitucional } from '../../lib/marcoCorreo.js'
import { botonesHtml, MARCA_BOTONES } from '../../lib/respuestas.js'
import { vistaPrevia } from '../constanciaPdf.js'

export type Uso = 'invitacion' | 'agradecimiento' | 'constancia'
export type Parte = 'encabezado' | 'pie' | 'firma'
export const PARTES: readonly Parte[] = ['encabezado', 'pie', 'firma']

/** Los datos (marcas) que acepta cada fin; REVISTA y PAR son los mismos textos en mayúsculas. */
const VARIABLES: Record<Uso, string[]> = {
  invitacion: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo', 'botones'],
  agradecimiento: ['revista', 'par', 'articulo'],
  constancia: ['revista', 'REVISTA', 'par', 'PAR', 'articulo', 'issn', 'indexaciones', 'fecha', 'anio', 'firma'],
}
const ETIQUETA_FIN: Record<Uso, string> = {
  invitacion: 'la invitación a evaluar',
  agradecimiento: 'el agradecimiento',
  constancia: 'la constancia',
}

interface FilaPlantilla {
  id_plantilla: number
  id_revista: number
  nombre: string
  clase: 'correo' | 'archivo'
  /** Para qué sirve la plantilla; no cambia. */
  fin: Uso
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
    enUso: p.tipo !== null,
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

const numeroDeRevista = (sigla: 'reep' | 'ire') => (sigla === 'reep' ? 1 : 2)

export async function listarPlantillas() {
  const { rows } = await pool.query<FilaPlantilla>(`${SELECCION_PLANTILLA} ORDER BY id_revista, id_plantilla`)
  return { plantillas: rows.map(plantillaApi) }
}

export interface DatosNuevaPlantilla {
  revista: 'reep' | 'ire'
  nombre: string
  /** Para qué sirve: de ahí sale la clase. Sin él, la clase viene dada. La plantilla siempre nace en blanco. */
  uso?: Uso
  clase?: 'correo' | 'archivo'
}

export async function crearPlantilla(d: DatosNuevaPlantilla) {
  const revista = numeroDeRevista(d.revista)
  const clase = d.uso ? (d.uso === 'constancia' ? 'archivo' : 'correo') : (d.clase ?? 'correo')
  const fin: Uso = d.uso ?? (clase === 'archivo' ? 'constancia' : 'invitacion')
  if (d.uso && d.clase && d.clase !== clase) throw new ErrorHttp(409, 'La clase no corresponde al uso elegido')
  const nombreRepetido = (e: { code?: string }): never => {
    if (e.code === '23505') throw new ErrorHttp(409, 'Ya existe una plantilla con ese nombre en esta revista')
    throw e
  }
  const id = await enTransaccion(async (c) => {
    const { rows } = await c
      .query<{ id_plantilla: number }>(
        `INSERT INTO plantilla (id_revista, nombre, clase, fin, asunto, cuerpo)
         VALUES ($1, $2, $3, $4, $5, '') RETURNING id_plantilla`,
        [revista, d.nombre, clase, fin, clase === 'correo' ? '' : null],
      )
      .catch(nombreRepetido)
    const nueva = rows[0]?.id_plantilla ?? 0
    return nueva
  })
  return plantillaApi(await cargar(id))
}

/** Elige para qué se usa una plantilla en su revista; la que tenía ese uso queda libre. */
export async function asignarUso(id: number, uso: Uso) {
  const p = await cargar(id)
  // Una plantilla solo se elige para el fin con el que se creó.
  if (uso !== p.fin) {
    throw new ErrorHttp(409, `Esta plantilla es para ${ETIQUETA_FIN[p.fin]} y no puede usarse para ${ETIQUETA_FIN[uso]}`)
  }
  if (!p.cuerpo.trim()) {
    throw new ErrorHttp(422, 'La plantilla aún no tiene texto: redáctela en Plantillas antes de elegirla')
  }
  validar(VARIABLES[uso], p.asunto, p.cuerpo)
  await enTransaccion(async (c) => {
    await c.query('UPDATE plantilla SET tipo = NULL WHERE id_revista = $1 AND tipo = $2', [p.id_revista, uso])
    await c.query('UPDATE plantilla SET tipo = $2 WHERE id_plantilla = $1', [p.id_plantilla, uso])
  })
  return plantillaApi(await cargar(p.id_plantilla))
}

export async function eliminarPlantilla(id: number): Promise<void> {
  const p = await cargar(id)
  if (p.tipo) throw new ErrorHttp(409, 'La plantilla está en uso; elija otra en Configuración antes de eliminarla')
  await pool.query('DELETE FROM plantilla WHERE id_plantilla = $1', [p.id_plantilla])
}

export async function guardarPlantilla(
  id: number,
  d: { asunto: string | null; cuerpo: string },
) {
  const p = await cargar(id)
  const asunto = p.clase === 'archivo' ? null : (d.asunto ?? p.asunto)
  validar(variablesDe(p), asunto, d.cuerpo)
  await pool.query('UPDATE plantilla SET asunto = $1, cuerpo = $2 WHERE id_plantilla = $3', [
    asunto,
    d.cuerpo,
    p.id_plantilla,
  ])
  return plantillaApi(await cargar(p.id_plantilla))
}

export function parteDe(valor: unknown): Parte {
  const parte = PARTES.find((x) => x === valor)
  if (!parte) throw new ErrorHttp(404, 'Parte de la plantilla no válida')
  return parte
}

/** El encabezado, el pie o la firma de una constancia: una imagen PNG o JPG. */
export async function subirImagen(id: number, parte: Parte, imagen: Buffer | undefined) {
  const p = await cargar(id)
  if (p.clase !== 'archivo') throw new ErrorHttp(409, 'Solo la plantilla de archivo (la constancia) lleva imágenes')
  if (!imagen) throw new ErrorHttp(422, 'Adjunte la imagen')
  const png = imagen.length > 8 && imagen[0] === 0x89 && imagen[1] === 0x50 && imagen[2] === 0x4e && imagen[3] === 0x47
  const jpg = imagen.length > 3 && imagen[0] === 0xff && imagen[1] === 0xd8
  if (!png && !jpg) throw new ErrorHttp(422, 'La imagen debe ser PNG o JPG')
  await pool.query(`UPDATE plantilla SET ${parte} = $1 WHERE id_plantilla = $2`, [imagen, p.id_plantilla])
  return plantillaApi(await cargar(p.id_plantilla))
}

export async function quitarImagen(id: number, parte: Parte) {
  const p = await cargar(id)
  await pool.query(`UPDATE plantilla SET ${parte} = NULL WHERE id_plantilla = $1`, [p.id_plantilla])
  return plantillaApi(await cargar(p.id_plantilla))
}

/** El correo completo (con el marco institucional) con datos de ejemplo, para el texto que se está editando. */
export async function vistaCorreo(d: {
  revista: 'reep' | 'ire'
  uso: 'invitacion' | 'agradecimiento'
  cuerpo: string
}) {
  const { rows } = await pool.query<{ nombre: string; correo_remitente: string }>(
    'SELECT nombre, correo_remitente FROM revista WHERE id_revista = $1',
    [numeroDeRevista(d.revista)],
  )
  const revista = rows[0]
  if (!revista) throw new ErrorHttp(404, 'Revista no encontrada')
  const ejemplo: Record<string, string> = {
    revista: revista.nombre,
    numero: '2026-034',
    par: 'Luz Marina Burbano',
    profesion: 'Magíster en Educación',
    universidad: 'Universidad de Nariño',
    articulo: 'Alfabetización mediática en la formación de maestros',
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
