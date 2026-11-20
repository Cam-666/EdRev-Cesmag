/*
 * informeGestion (servicio) — las cifras del informe de gestión de un semestre, de una revista o de las dos:
 * artículos postulados, aprobados y rechazados, evaluaciones entregadas, constancias emitidas, días promedio
 * de evaluación y distribución de conceptos. Las mismas cifras se ofrecen como datos (la página) y como
 * documento PDF (servicios/informePdf).
 */
import { pool } from '../db.js'
import { ErrorHttp } from '../lib/http.js'
import { generarInformePdf, type DatosRevista } from './informePdf.js'

export type FiltroRevista = 'ambas' | 'reep' | 'ire'

export function periodos() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const semestre = hoy.getMonth() < 6 ? 1 : 2
  const lista: Array<{ valor: string; etiqueta: string }> = []
  for (let a = anio; a >= 2020; a--) {
    for (const s of [2, 1]) {
      if (a === anio && s > semestre) continue
      lista.push({ valor: `${a}-${s}`, etiqueta: `${s === 1 ? 'Primer' : 'Segundo'} semestre de ${a}` })
    }
  }
  return lista
}

/** Valida la revista y el periodo y carga las cifras de cada revista para el semestre. */
async function cargar(filtro: string, periodoPedido: string | undefined) {
  if (!['ambas', 'reep', 'ire'].includes(filtro)) throw new ErrorHttp(422, 'Revista no válida')
  const periodo = periodoPedido ?? periodos()[0]?.valor ?? ''
  const p = periodos().find((x) => x.valor === periodo)
  if (!p) throw new ErrorHttp(422, 'Periodo no válido')
  const [anio, semestre] = periodo.split('-')
  const desde = semestre === '1' ? `${anio}-01-01` : `${anio}-07-01`
  const hasta = semestre === '1' ? `${anio}-06-30` : `${anio}-12-31`

  const { rows } = await pool.query<{
    id_revista: number
    nombre: string
    postulados: number
    aprobados: number
    rechazados: number
    entregadas: number
    constancias: number
    dias: number | null
    suma_dias: number | null
    publicable: number
    modificaciones: number
    no_publicable: number
    pendiente: number
  }>(
    `SELECT r.id_revista, r.nombre,
       (SELECT count(*)::int FROM articulo a WHERE a.id_revista = r.id_revista AND a.fecha_postulacion BETWEEN $1 AND $2) AS postulados,
       (SELECT count(*)::int FROM articulo a WHERE a.id_revista = r.id_revista AND a.estado = 'aprobado' AND a.fecha_postulacion BETWEEN $1 AND $2) AS aprobados,
       (SELECT count(*)::int FROM articulo a WHERE a.id_revista = r.id_revista AND a.estado = 'rechazado' AND a.fecha_postulacion BETWEEN $1 AND $2) AS rechazados,
       count(e.*)::int AS entregadas,
       (SELECT count(*)::int FROM evaluacion e2 JOIN articulo a2 ON a2.id_articulo = e2.id_articulo
         WHERE a2.id_revista = r.id_revista AND e2.constancia_emitida
           AND (SELECT min(c.fecha_envio) FROM correo c WHERE c.id_evaluacion = e2.id_evaluacion AND c.tipo IN ('agradecimiento','constancia'))::date BETWEEN $1 AND $2) AS constancias,
       round(avg(e.fecha_evaluacion - e.fecha_asignacion::date))::int AS dias,
       sum(e.fecha_evaluacion - e.fecha_asignacion::date)::int AS suma_dias,
       count(*) FILTER (WHERE e.concepto = 'publicable')::int AS publicable,
       count(*) FILTER (WHERE e.concepto = 'con-modificaciones')::int AS modificaciones,
       count(*) FILTER (WHERE e.concepto = 'no-publicable')::int AS no_publicable,
       count(*) FILTER (WHERE e.concepto = 'pendiente-formato')::int AS pendiente
     FROM revista r
     LEFT JOIN articulo a ON a.id_revista = r.id_revista
     LEFT JOIN evaluacion e ON e.id_articulo = a.id_articulo AND e.estado_par = 'entrego'
                            AND e.fecha_evaluacion BETWEEN $1 AND $2
     GROUP BY r.id_revista, r.nombre ORDER BY r.id_revista`,
    [desde, hasta],
  )
  const revistas: DatosRevista[] = rows.map((r) => ({
    sigla: r.id_revista === 1 ? 'reep' : 'ire',
    nombre: r.nombre,
    postulados: r.postulados,
    aprobados: r.aprobados,
    rechazados: r.rechazados,
    entregadas: r.entregadas,
    constancias: r.constancias,
    dias: r.dias ?? 0,
    sumaDias: r.suma_dias ?? 0,
    conceptos: {
      publicable: r.publicable,
      conModificaciones: r.modificaciones,
      noPublicable: r.no_publicable,
      pendienteFormato: r.pendiente,
    },
  }))
  const incluidas = revistas.filter((r) => filtro === 'ambas' || filtro === r.sigla)
  return { filtro, periodo, etiquetaPeriodo: p.etiqueta, incluidas }
}

/** Las cifras del informe tal como las muestra la página. */
export async function informeDeGestion(filtro: string, periodoPedido: string | undefined) {
  const { periodo, etiquetaPeriodo, incluidas } = await cargar(filtro, periodoPedido)
  const de = (sigla: 'reep' | 'ire') => incluidas.find((r) => r.sigla === sigla)
  const indicador = (campo: 'postulados' | 'aprobados' | 'rechazados' | 'entregadas' | 'constancias') => {
    const reep = de('reep')?.[campo] ?? 0
    const ire = de('ire')?.[campo] ?? 0
    return { reep, ire, total: reep + ire }
  }
  // El total pondera cada revista por sus evaluaciones; no es el promedio de los dos promedios.
  const sumaDias = incluidas.reduce((s, r) => s + r.sumaDias, 0)
  const nEntregadas = incluidas.reduce((s, r) => s + r.entregadas, 0)
  const sumar = (campo: keyof DatosRevista['conceptos']) => incluidas.reduce((s, r) => s + r.conceptos[campo], 0)
  return {
    periodo,
    etiquetaPeriodo,
    revista: filtro,
    postulados: indicador('postulados'),
    aprobados: indicador('aprobados'),
    rechazados: indicador('rechazados'),
    evaluacionesEntregadas: indicador('entregadas'),
    constanciasEmitidas: indicador('constancias'),
    diasPromedioEvaluacion: {
      reep: de('reep')?.dias ?? 0,
      ire: de('ire')?.dias ?? 0,
      total: nEntregadas === 0 ? 0 : Math.round(sumaDias / nEntregadas),
    },
    conceptos: {
      publicable: sumar('publicable'),
      conModificaciones: sumar('conModificaciones'),
      noPublicable: sumar('noPublicable'),
      pendienteFormato: sumar('pendienteFormato'),
    },
  }
}

/** El informe como documento PDF: una sección con gráficas por revista, no una captura de la página. */
export async function informeEnPdf(filtro: string, periodoPedido: string | undefined) {
  const { periodo, etiquetaPeriodo, incluidas } = await cargar(filtro, periodoPedido)
  const pdf = await generarInformePdf({ etiquetaPeriodo, revistas: incluidas })
  return { pdf, nombre: `informe-de-gestion-${periodo}-${filtro}.pdf` }
}
