/*
 * migracion — loads the rows of the journals' Excel files into the database (RF-42, RF-43, RF-44).
 * One row per article and peer (an article with three peers takes three rows with the same OJS
 * number; an article with no peers takes one). What the closed lists of the system do not
 * recognise is loaded with the datum empty and listed in «Por corregir»; the CONSTANCIA mark is
 * kept so the delivered evaluations without constancia show as pending (RF-43). Every migrated
 * article and evaluation leaves a «migracion» trace (that is how the page tells «migrado» apart).
 * An article whose OJS number already exists in the journal is skipped, so the load can be rerun.
 * A file with both journals mixed has a «Revista» column; `repartirPorRevista` splits its rows.
 */
import type { Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { CORREO_VALIDO, sinTildes } from '../lib/http.js'

/** Normalised column names the loader understands, with the headings the Excel may use. */
const ALIAS: Record<string, string[]> = {
  numero_ojs: ['numero_ojs', 'n_ojs', 'no_ojs', 'ojs', 'solicitud', 'numero'],
  titulo: ['titulo', 'titulo_del_articulo', 'articulo'],
  tipo: ['tipo', 'tipo_de_articulo', 'tipo_articulo'],
  fecha_postulacion: ['fecha_postulacion', 'fecha_de_postulacion', 'fecha_recepcion', 'fecha'],
  estado: ['estado', 'estado_del_articulo', 'estado_articulo'],
  autores: ['autores', 'autor'],
  par: ['par', 'par_evaluador', 'evaluador', 'nombre_par'],
  correo_par: ['correo_par', 'correo_del_par', 'correo_evaluador', 'email_par'],
  universidad_par: ['universidad_par', 'universidad', 'institucion_par'],
  concepto: ['concepto', 'concepto_del_par'],
  fecha_entrega: ['fecha_entrega', 'fecha_de_entrega', 'fecha_evaluacion'],
  constancia: ['constancia'],
}

export type FilaCruda = Record<string, unknown>

const normalizar = (t: string) =>
  sinTildes(t)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

export interface FilaNormal {
  numero_ojs: string
  titulo: string
  tipo: string
  fecha_postulacion: string
  estado: string
  autores: string
  par: string
  correo_par: string
  universidad_par: string
  concepto: string
  fecha_entrega: string
  constancia: string
}

/** The row with its headings mapped to the loader's names; unknown headings are ignored. */
export function normalizarFila(fila: FilaCruda): FilaNormal {
  const porNombre = new Map(Object.entries(fila).map(([k, v]) => [normalizar(k), v]))
  const dato = (campo: keyof FilaNormal): string => {
    const hallado = (ALIAS[campo] ?? []).map((a) => porNombre.get(a)).find((v) => v !== undefined && v !== null)
    return texto(hallado)
  }
  return {
    numero_ojs: dato('numero_ojs'),
    titulo: dato('titulo'),
    tipo: dato('tipo'),
    fecha_postulacion: dato('fecha_postulacion'),
    estado: dato('estado'),
    autores: dato('autores'),
    par: dato('par'),
    correo_par: dato('correo_par'),
    universidad_par: dato('universidad_par'),
    concepto: dato('concepto'),
    fecha_entrega: dato('fecha_entrega'),
    constancia: dato('constancia'),
  }
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

const limpio = (t: string) => normalizar(t).replace(/_/g, ' ')

const TIPOS: Record<string, string> = {
  investigacion: 'investigacion',
  'articulo de investigacion': 'investigacion',
  reflexion: 'reflexion',
  'articulo de reflexion': 'reflexion',
  revision: 'revision',
  'articulo de revision': 'revision',
}
const ESTADOS: Record<string, string> = {
  postulado: 'postulado',
  'en revision': 'en-revision',
  'en evaluacion': 'en-evaluacion',
  aprobado: 'aprobado',
  rechazado: 'rechazado',
  archivado: 'archivado',
}
const CONCEPTOS: Record<string, string> = {
  publicable: 'publicable',
  'publicable con modificaciones': 'con-modificaciones',
  'con modificaciones': 'con-modificaciones',
  'no publicable': 'no-publicable',
  'pendiente de formato': 'pendiente-formato',
  'pendiente formato': 'pendiente-formato',
}
const SI = ['si', 'x', '1', 'true', 'emitida', 'entregada', 'enviada']

/** DD/MM/YYYY or YYYY-MM-DD; anything else is no date. */
export function fechaDe(t: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  const lat = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  const [a, m, d] = iso ? [iso[1], iso[2], iso[3]] : lat ? [lat[3], lat[2], lat[1]] : []
  if (!a || !m || !d) return null
  const valida = new Date(`${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`)
  return Number.isNaN(+valida) ? null : valida.toISOString().slice(0, 10)
}

export interface ResumenMigracion {
  articulos: number
  omitidos: number
  pares: number
  evaluaciones: number
  porCorregir: number
  advertencias: string[]
}

async function existeOCrea(c: Cliente, sql: string, valores: unknown[], crear: string, datos: unknown[]) {
  const { rows } = await c.query<{ id: number }>(sql, valores)
  if (rows[0]) return { id: rows[0].id, nuevo: false }
  const creado = await c.query<{ id: number }>(crear, datos)
  return { id: creado.rows[0]?.id ?? 0, nuevo: true }
}

/** Loads the rows of one journal. `usuario` is who runs the load (null: the system). */
export async function migrarFilas(
  c: Cliente,
  revista: number,
  filas: FilaCruda[],
  usuario: number | null = null,
): Promise<ResumenMigracion> {
  const resumen: ResumenMigracion = { articulos: 0, omitidos: 0, pares: 0, evaluaciones: 0, porCorregir: 0, advertencias: [] }
  const porCorregir = (campo: string, valor: string, ids: { articulo?: number; evaluacion?: number; par?: number }) => {
    resumen.porCorregir += 1
    return c.query(
      'INSERT INTO por_corregir (id_revista, campo, valor_excel, id_articulo, id_evaluacion, id_par) VALUES ($1,$2,$3,$4,$5,$6)',
      [revista, campo, valor, ids.articulo ?? null, ids.evaluacion ?? null, ids.par ?? null],
    )
  }

  const grupos = new Map<string, FilaNormal[]>()
  filas.map(normalizarFila).forEach((f, i) => {
    if (!f.numero_ojs || !f.titulo) {
      resumen.advertencias.push(`Fila ${i + 2}: sin número de OJS o título, no se cargó`)
      return
    }
    grupos.set(f.numero_ojs, [...(grupos.get(f.numero_ojs) ?? []), f])
  })

  const parPorClave = new Map<string, number>()
  for (const [numero, lista] of grupos) {
    const base = lista[0]
    if (!base) continue
    const repetido = await c.query('SELECT 1 FROM articulo WHERE id_revista = $1 AND numero_ojs = $2', [revista, numero])
    if (repetido.rows.length > 0) {
      resumen.omitidos += 1
      continue
    }

    const tipo = TIPOS[limpio(base.tipo)] ?? null
    const estado = ESTADOS[limpio(base.estado)] ?? null
    const { rows } = await c.query<{ id: number }>(
      `INSERT INTO articulo (id_revista, numero_ojs, titulo, tipo, fecha_postulacion, estado)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_articulo AS id`,
      [revista, numero, base.titulo.slice(0, 500), tipo, fechaDe(base.fecha_postulacion), estado ?? 'archivado'],
    )
    const articulo = rows[0]?.id ?? 0
    resumen.articulos += 1
    if (!tipo) await porCorregir('tipo-articulo', base.tipo, { articulo })
    if (!estado) await porCorregir('estado-articulo', base.estado, { articulo })

    const autores = base.autores.split(/[;\n]/).map((a) => a.trim()).filter(Boolean)
    if (autores.length > 7) resumen.advertencias.push(`${numero}: más de siete autores, se cargaron los primeros siete`)
    let orden = 0
    for (const nombre of autores.slice(0, 7)) {
      const autor = await existeOCrea(
        c,
        'SELECT id_autor AS id FROM autor WHERE lower(nombre) = lower($1) LIMIT 1',
        [nombre],
        'INSERT INTO autor (nombre) VALUES ($1) RETURNING id_autor AS id',
        [nombre.slice(0, 200)],
      )
      orden += 1
      await c.query('INSERT INTO articulo_autor (id_articulo, id_autor, orden) VALUES ($1,$2,$3)', [articulo, autor.id, orden])
    }
    await auditar(c, { usuario, tabla: 'articulo', idRegistro: articulo, accion: 'migracion', texto: `Migró el artículo ${numero} del Excel`, revista, articulo })

    for (const f of lista) {
      if (!f.par) continue
      const correoCrudo = f.correo_par.toLowerCase()
      const correo = CORREO_VALIDO.test(correoCrudo) ? correoCrudo : null
      const clave = correo ?? `nombre:${f.par.toLowerCase()}`
      let par = parPorClave.get(clave)
      if (!par) {
        const previo = correo
          ? await c.query<{ id: number }>('SELECT id_par AS id FROM par_evaluador WHERE id_revista = $1 AND correo = $2', [revista, correo])
          : await c.query<{ id: number }>('SELECT id_par AS id FROM par_evaluador WHERE id_revista = $1 AND correo IS NULL AND lower(nombre) = lower($2)', [revista, f.par])
        if (previo.rows[0]) par = previo.rows[0].id
        else {
          const nuevo = await c.query<{ id: number }>(
            'INSERT INTO par_evaluador (id_revista, nombre, correo, universidad) VALUES ($1,$2,$3,$4) RETURNING id_par AS id',
            [revista, f.par.slice(0, 200), correo, f.universidad_par.slice(0, 200) || null],
          )
          par = nuevo.rows[0]?.id ?? 0
          resumen.pares += 1
          if (!correo) await porCorregir('correo-par', correoCrudo, { par })
        }
        parPorClave.set(clave, par)
      }

      const entrega = fechaDe(f.fecha_entrega)
      const entrego = f.concepto !== '' || f.fecha_entrega !== ''
      const concepto = CONCEPTOS[limpio(f.concepto)] ?? null
      const constancia = entrego && SI.includes(limpio(f.constancia))
      const ev = await c.query<{ id: number }>(
        `INSERT INTO evaluacion (id_articulo, id_par, estado_par, concepto, fecha_evaluacion, constancia_emitida)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id_articulo, id_par) DO NOTHING RETURNING id_evaluacion AS id`,
        [articulo, par, entrego ? 'entrego' : 'invitado', entrego ? concepto : null, entrego ? entrega : null, constancia],
      )
      const evaluacion = ev.rows[0]?.id
      if (!evaluacion) {
        resumen.advertencias.push(`${numero}: ${f.par} aparece dos veces, se cargó una`)
        continue
      }
      resumen.evaluaciones += 1
      if (entrego && !concepto) await porCorregir('concepto', f.concepto, { evaluacion })
      await auditar(c, { usuario, tabla: 'evaluacion', idRegistro: evaluacion, accion: 'migracion', texto: `Migró la evaluación de ${f.par} del Excel`, revista, articulo })
    }
  }
  return resumen
}

const ALIAS_REVISTA = ['revista', 'journal', 'revista_del_articulo']

/** The journal a row says it belongs to (1 REEP, 2 IRE), by its sigla or its name; null if unclear. */
export function revistaDeFila(fila: FilaCruda): number | null {
  const porNombre = new Map(Object.entries(fila).map(([k, v]) => [normalizar(k), v]))
  const valor = limpio(texto(ALIAS_REVISTA.map((a) => porNombre.get(a)).find((v) => v !== undefined && v !== null)))
  if (!valor) return null
  if (valor === 'ire' || valor.includes('investigium')) return 2
  if (valor === 'reep' || valor.includes('educacion') || valor.includes('pedagogia')) return 1
  return null
}

/** Splits the rows of a file with both journals mixed; the rows with no clear journal are counted apart. */
export function repartirPorRevista(filas: FilaCruda[]): { porRevista: Map<number, FilaCruda[]>; sinRevista: number } {
  const porRevista = new Map<number, FilaCruda[]>()
  let sinRevista = 0
  for (const f of filas) {
    const r = revistaDeFila(f)
    if (r === null) sinRevista += 1
    else porRevista.set(r, [...(porRevista.get(r) ?? []), f])
  }
  return { porRevista, sinRevista }
}
