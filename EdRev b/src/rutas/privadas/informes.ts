/*
 * Informe de gestión (RF-38, HU-27): for one journal or both and a semester — articles postulated,
 * approved and rejected, evaluations delivered, constancias issued, average days of evaluation and
 * the distribution of concepts. Both profiles. The same figures are offered as data (the page) and
 * as a PDF document with a section and charts per journal.
 */
import { Router } from 'express'
import { pool } from '../../db.js'
import { ErrorHttp, idRevista } from '../../lib/http.js'
import { generarInformePdf, type DatosRevista } from '../../servicios/informePdf.js'

export const rutasInformes = Router()

function periodos() {
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

rutasInformes.get('/informes/periodos', (_req, res) => {
  res.json(periodos())
})

/** Validates the query and loads the figures of each journal for the semester. */
async function cargar(req: { query: Record<string, unknown> }) {
  const filtro = String(req.query.revista ?? 'ambas')
  if (!['ambas', 'reep', 'ire'].includes(filtro)) throw new ErrorHttp(422, 'Revista no válida')
  const periodo = String(req.query.periodo ?? periodos()[0]?.valor)
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
  const incluidas = revistas.filter((r) => filtro === 'ambas' || idRevista(filtro) === (r.sigla === 'reep' ? 1 : 2))
  return { filtro, periodo, etiquetaPeriodo: p.etiqueta, revistas, incluidas }
}

rutasInformes.get('/informes', async (req, res) => {
  const { filtro, periodo, etiquetaPeriodo, incluidas } = await cargar(req)
  const de = (sigla: 'reep' | 'ire') => incluidas.find((r) => r.sigla === sigla)
  const indicador = (campo: 'postulados' | 'aprobados' | 'rechazados' | 'entregadas' | 'constancias') => {
    const reep = de('reep')?.[campo] ?? 0
    const ire = de('ire')?.[campo] ?? 0
    return { reep, ire, total: reep + ire }
  }
  // The total weighs each journal by its evaluations; it is not the mean of the two means.
  const sumaDias = incluidas.reduce((s, r) => s + r.sumaDias, 0)
  const nEntregadas = incluidas.reduce((s, r) => s + r.entregadas, 0)
  const sumar = (campo: keyof DatosRevista['conceptos']) => incluidas.reduce((s, r) => s + r.conceptos[campo], 0)
  res.json({
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
  })
})

// The report as a document: a section with charts per journal, not a capture of the page.
rutasInformes.get('/informes/pdf', async (req, res) => {
  const { filtro, periodo, etiquetaPeriodo, incluidas } = await cargar(req)
  const pdf = await generarInformePdf({ etiquetaPeriodo, revistas: incluidas })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="informe-de-gestion-${periodo}-${filtro}.pdf"`,
  )
  res.send(Buffer.from(pdf))
})
