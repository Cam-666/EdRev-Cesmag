/*
 * Informe de gestión (RF-38, HU-27): for one journal or both and a semester — articles postulated,
 * approved and rejected, evaluations delivered, constancias issued, average days of evaluation and
 * the distribution of concepts. Both profiles. Also the migrated records to correct (RF-44): the
 * migration loads them into the database; until then the list is empty.
 */
import { Router } from 'express'
import { pool } from '../db.js'
import { ErrorHttp, idRevista } from '../lib/http.js'

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

rutasInformes.get('/informes', async (req, res) => {
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
    postulados: number
    aprobados: number
    rechazados: number
    entregadas: number
    constancias: number
    dias: number | null
    publicable: number
    modificaciones: number
    no_publicable: number
    pendiente: number
  }>(
    `SELECT r.id_revista,
       (SELECT count(*)::int FROM articulo a WHERE a.id_revista = r.id_revista AND a.fecha_postulacion BETWEEN $1 AND $2) AS postulados,
       (SELECT count(*)::int FROM articulo a WHERE a.id_revista = r.id_revista AND a.estado = 'aprobado' AND a.fecha_postulacion BETWEEN $1 AND $2) AS aprobados,
       (SELECT count(*)::int FROM articulo a WHERE a.id_revista = r.id_revista AND a.estado = 'rechazado' AND a.fecha_postulacion BETWEEN $1 AND $2) AS rechazados,
       count(e.*)::int AS entregadas,
       (SELECT count(*)::int FROM evaluacion e2 JOIN articulo a2 ON a2.id_articulo = e2.id_articulo
         WHERE a2.id_revista = r.id_revista AND e2.constancia_emitida
           AND (SELECT min(c.fecha_envio) FROM correo c WHERE c.id_evaluacion = e2.id_evaluacion AND c.tipo IN ('agradecimiento','constancia'))::date BETWEEN $1 AND $2) AS constancias,
       round(avg(e.fecha_evaluacion - e.fecha_asignacion::date))::int AS dias,
       count(*) FILTER (WHERE e.concepto = 'publicable')::int AS publicable,
       count(*) FILTER (WHERE e.concepto = 'con-modificaciones')::int AS modificaciones,
       count(*) FILTER (WHERE e.concepto = 'no-publicable')::int AS no_publicable,
       count(*) FILTER (WHERE e.concepto = 'pendiente-formato')::int AS pendiente
     FROM revista r
     LEFT JOIN articulo a ON a.id_revista = r.id_revista
     LEFT JOIN evaluacion e ON e.id_articulo = a.id_articulo AND e.estado_par = 'entrego'
                            AND e.fecha_evaluacion BETWEEN $1 AND $2
     GROUP BY r.id_revista ORDER BY r.id_revista`,
    [desde, hasta],
  )
  const de = (id: number) => rows.find((r) => r.id_revista === id)
  const incluye = (id: number) => filtro === 'ambas' || idRevista(filtro) === id
  const indicador = (campo: 'postulados' | 'aprobados' | 'rechazados' | 'entregadas' | 'constancias') => {
    const reep = incluye(1) ? (de(1)?.[campo] ?? 0) : 0
    const ire = incluye(2) ? (de(2)?.[campo] ?? 0) : 0
    return { reep, ire, total: reep + ire }
  }
  const diasReep = incluye(1) ? (de(1)?.dias ?? 0) : 0
  const diasIre = incluye(2) ? (de(2)?.dias ?? 0) : 0
  const sumar = (campo: 'publicable' | 'modificaciones' | 'no_publicable' | 'pendiente') =>
    (incluye(1) ? (de(1)?.[campo] ?? 0) : 0) + (incluye(2) ? (de(2)?.[campo] ?? 0) : 0)
  res.json({
    periodo,
    etiquetaPeriodo: p.etiqueta,
    revista: filtro,
    postulados: indicador('postulados'),
    aprobados: indicador('aprobados'),
    rechazados: indicador('rechazados'),
    evaluacionesEntregadas: indicador('entregadas'),
    constanciasEmitidas: indicador('constancias'),
    diasPromedioEvaluacion: {
      reep: diasReep,
      ire: diasIre,
      total: filtro === 'ambas' ? Math.round((diasReep + diasIre) / 2) : diasReep + diasIre,
    },
    conceptos: {
      publicable: sumar('publicable'),
      conModificaciones: sumar('modificaciones'),
      noPublicable: sumar('no_publicable'),
      pendienteFormato: sumar('pendiente'),
    },
  })
})

rutasInformes.get('/:revista/por-corregir', (req, res) => {
  idRevista(req.params.revista)
  res.json([])
})
