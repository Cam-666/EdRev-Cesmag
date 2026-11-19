/*
 * gestionConstancias (servicio) — the constancias of the evaluations: pending and issued (RF-34),
 * the preview with the journal's constancia template in use (RF-30), issuing one or all the
 * pending ones, which queues the thank-you mail that carries it (RF-31), reissuing one already
 * issued (RF-33) and the download (RF-32). The PDF itself is drawn by servicios/constanciaPdf.
 */
import { enTransaccion, pool, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'
import { textoPlano } from '../lib/formato.js'
import { iso } from '../lib/mapeo.js'
import { generarConstancia, valoresDe } from './constanciaPdf.js'
import { encolar } from './correos.js'

interface FilaEntrega {
  id_evaluacion: number
  id_articulo: number
  numero_ojs: string
  titulo: string
  id_par: number
  nombre: string
  correo: string | null
  fecha_evaluacion: string | null
  constancia_emitida: boolean
  emitida_el: Date | null
  migrado: boolean
}

const SELECCION = `
  SELECT e.id_evaluacion, e.id_articulo, a.numero_ojs, a.titulo, p.id_par, p.nombre, p.correo,
         e.fecha_evaluacion, e.constancia_emitida,
         (SELECT min(c.fecha_envio) FROM correo c
           WHERE c.id_evaluacion = e.id_evaluacion AND c.tipo IN ('agradecimiento','constancia')) AS emitida_el,
         EXISTS (SELECT 1 FROM auditoria au WHERE au.tabla_afectada = 'evaluacion'
                   AND au.id_registro = e.id_evaluacion::text AND au.accion = 'migracion') AS migrado
    FROM evaluacion e
    JOIN articulo a ON a.id_articulo = e.id_articulo
    JOIN par_evaluador p ON p.id_par = e.id_par
   WHERE e.estado_par = 'entrego' AND a.id_revista = $1`

function filaApi(f: FilaEntrega) {
  return {
    id: String(f.id_evaluacion),
    asignacionId: String(f.id_evaluacion),
    estado: f.constancia_emitida ? 'emitida' : 'pendiente',
    origen: f.migrado ? 'migrado' : 'sistema',
    par: { id: String(f.id_par), nombre: f.nombre, correo: f.correo ?? '' },
    articulo: { id: String(f.id_articulo), numeroOjs: f.numero_ojs, titulo: f.titulo },
    fechaEntrega: f.fecha_evaluacion ?? '',
    fechaEmision: f.constancia_emitida ? (iso(f.emitida_el) ?? null) : null,
  }
}

async function entrega(c: Cliente, revista: number, id: number): Promise<FilaEntrega> {
  const { rows } = await c.query<FilaEntrega>(`${SELECCION} AND e.id_evaluacion = $2`, [revista, id])
  if (!rows[0]) throw new ErrorHttp(404, 'Constancia no encontrada')
  return rows[0]
}

/** Issues (or reissues) a constancia: marks it and queues the mail that delivers it to the peer. */
async function emitir(
  c: Cliente,
  revista: number,
  usuario: number,
  f: FilaEntrega,
  reemision: boolean,
  conAgradecimiento: boolean,
) {
  if (!f.correo) throw new ErrorHttp(422, `${f.nombre} no tiene correo: regístrelo antes de enviar la constancia`)
  // The constancia is issued once the evaluation is complete: concept and date registered.
  if (!reemision) {
    const evaluada = await c.query<{ concepto: string | null; fecha_evaluacion: string | null }>(
      'SELECT concepto, fecha_evaluacion FROM evaluacion WHERE id_evaluacion = $1',
      [f.id_evaluacion],
    )
    if (!evaluada.rows[0]?.concepto || !evaluada.rows[0]?.fecha_evaluacion) {
      throw new ErrorHttp(409, `Registre primero el concepto y la fecha de evaluación de ${f.nombre}; después podrá emitir su constancia`)
    }
  }
  await c.query('UPDATE evaluacion SET constancia_emitida = TRUE WHERE id_evaluacion = $1', [f.id_evaluacion])
  const estado = await encolar(c, f.id_evaluacion, conAgradecimiento ? 'agradecimiento' : 'constancia', f.correo)
  await auditar(c, {
    usuario,
    tabla: 'evaluacion',
    idRegistro: f.id_evaluacion,
    accion: 'constancia',
    texto: `${reemision ? 'Reenvió' : 'Emitió'} la constancia de ${f.nombre}${conAgradecimiento ? ' con correo de agradecimiento' : ''}`,
    revista,
    articulo: f.id_articulo,
  })
  return {
    constancia: filaApi(await entrega(c, revista, f.id_evaluacion)),
    correo: { estado, destinatario: f.correo },
  }
}

export async function listarConstancias(revista: number) {
  const { rows } = await pool.query<FilaEntrega>(`${SELECCION} ORDER BY e.fecha_evaluacion`, [revista])
  return {
    pendientes: rows.filter((f) => !f.constancia_emitida).map(filaApi),
    emitidas: rows.filter((f) => f.constancia_emitida).map(filaApi).reverse(),
  }
}

/** The text of the constancia with the data of this evaluation, as the page previews it. */
export async function vistaPreviaConstancia(revista: number, id: number) {
  const f = await entrega(pool, revista, id)
  const { rows } = await pool.query<{ revista: string; cuerpo: string; plantilla: string; issn: string | null; indexaciones: string | null }>(
    `SELECT r.nombre AS revista, r.issn, r.indexaciones, p.cuerpo, p.nombre AS plantilla
       FROM revista r JOIN plantilla p ON p.id_revista = r.id_revista AND p.tipo = 'constancia'
      WHERE r.id_revista = $1`,
    [revista],
  )
  const firma = await pool.query<{ nombre: string }>(
    "SELECT nombre FROM usuario WHERE rol = 'administrador' AND activo ORDER BY id_usuario LIMIT 1",
  )
  const p = rows[0]
  if (!p) throw new ErrorHttp(409, 'La revista no tiene plantilla de constancia en uso')
  const valores = valoresDe({ par: f.nombre, articulo: f.titulo, revista: p.revista, issn: p.issn ?? '', indexaciones: p.indexaciones ?? '' })
  return {
    universidad: 'UNIVERSIDAD CESMAG',
    revista: p.revista,
    // The text without its formatting marks; the PDF carries the alignment, the bold and the images.
    cuerpo: textoPlano(p.cuerpo.replace(/\{\{(\w+)\}\}/g, (m, clave: string) => (clave === 'firma' ? '' : (valores[clave] ?? m)))),
    firma: `${firma.rows[0]?.nombre ?? 'Administradora'} · Dependencia de Editorial`,
    fondo: `Encabezado, pie y firma de «${p.plantilla}»`,
  }
}

/** RF-32: the PDF is generated again from the registered data; it is not stored. */
export async function descargarConstancia(revista: number, id: number) {
  const f = await entrega(pool, revista, id)
  const pdf = await generarConstancia(pool, { par: f.nombre, articulo: f.titulo, idRevista: revista })
  return { pdf, nombre: `constancia-${f.id_evaluacion}.pdf` }
}

/** Issues every pending constancia, one by one; those that cannot be issued are counted. */
export async function emitirPendientes(revista: number, actor: number, conAgradecimiento: boolean) {
  const { rows } = await pool.query<FilaEntrega>(`${SELECCION} AND NOT e.constancia_emitida`, [revista])
  const resultados = []
  let fallidos = 0
  for (const f of rows) {
    try {
      resultados.push(await enTransaccion((c) => emitir(c, revista, actor, f, false, conAgradecimiento)))
    } catch {
      fallidos += 1
    }
  }
  return { emitidas: resultados.length, fallidos, resultados }
}

export async function emitirConstancia(revista: number, id: number, actor: number, conAgradecimiento: boolean) {
  return enTransaccion(async (c) => {
    const f = await entrega(c, revista, id)
    if (f.constancia_emitida) throw new ErrorHttp(409, 'La constancia ya fue emitida')
    return emitir(c, revista, actor, f, false, conAgradecimiento)
  })
}

export async function reenviarConstancia(revista: number, id: number, actor: number, conAgradecimiento: boolean) {
  return enTransaccion(async (c) => {
    const f = await entrega(c, revista, id)
    if (!f.constancia_emitida) throw new ErrorHttp(409, 'Solo se reenvía una constancia ya emitida')
    return emitir(c, revista, actor, f, true, conAgradecimiento)
  })
}
