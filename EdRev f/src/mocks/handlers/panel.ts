/*
 * Manejadores MSW de los tableros: el tablero de la revista (las dos alertas que la dependencia marcó como
 * prioridad), el resumen de Inicio de las dos revistas y el informe de gestión de un periodo.
 * El resumen de Inicio y el informe son las pantallas de las dos revistas.
 */
import { http, HttpResponse } from 'msw'
import { autorPorId, baseDe } from '../db'
import type { SeedRevista } from '../seed/fabrica'
import { esperaPares } from '@/lib/dominio/comite'
import { filasDe } from './constancias'
import { ahoraIso, contexto, contextoGlobal, error } from './util'
import type {
  CasoConstanciaPendiente,
  CasoSinResponder,
  FiltroRevistaInforme,
  Informe,
  IndicadorRevista,
  PeriodoInforme,
  ResumenGeneral,
  Tablero,
} from '@/types/panel'
import type { Revista } from '@/types/revista'

const REVISTAS: Revista[] = ['reep', 'ire']

function sinResponder(base: SeedRevista): CasoSinResponder[] {
  return base.asignaciones
    .filter((a) => a.estado === 'invitado' || a.estado === 'segundo-intento')
    .sort((a, b) => a.fechaInvitacion.localeCompare(b.fechaInvitacion))
    .flatMap((a) => {
      const par = base.pares.find((p) => p.id === a.parId)
      const articulo = base.articulos.find((x) => x.id === a.articuloId)
      if (!par || !articulo) return []
      return [
        {
          asignacionId: a.id,
          articuloId: articulo.id,
          numeroOjs: articulo.numeroOjs,
          titulo: articulo.titulo,
          par: par.nombre,
          estado: a.estado as CasoSinResponder['estado'],
        },
      ]
    })
}

function pendientes(base: SeedRevista): CasoConstanciaPendiente[] {
  return filasDe(base)
    .filter((f) => f.estado === 'pendiente')
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))
    .map((f) => ({
      constanciaId: f.id,
      par: f.par.nombre,
      articuloId: f.articulo.id,
      numeroOjs: f.articulo.numeroOjs,
      titulo: f.articulo.titulo,
      fechaEntrega: f.fechaEntrega,
    }))
}

/** Semestres desde el primer año con datos hasta el actual, del más nuevo al más antiguo. */
function periodos(): PeriodoInforme[] {
  const anio = new Date().getFullYear()
  const semestre = new Date().getMonth() < 6 ? 1 : 2
  const lista: PeriodoInforme[] = []
  for (let a = anio; a >= 2024; a--) {
    for (const s of [2, 1] as const) {
      if (a === anio && s > semestre) continue
      lista.push({
        valor: `${a}-${s}`,
        etiqueta: `${s === 1 ? 'Primer' : 'Segundo'} semestre de ${a}`,
      })
    }
  }
  return lista
}

function rango(periodo: string): { desde: string; hasta: string } {
  const [anio = '', semestre = '1'] = periodo.split('-')
  return semestre === '1'
    ? { desde: `${anio}-01-01`, hasta: `${anio}-06-30` }
    : { desde: `${anio}-07-01`, hasta: `${anio}-12-31` }
}

function enRango(fecha: string | null, desde: string, hasta: string): boolean {
  if (!fecha) return false
  const dia = fecha.slice(0, 10)
  return dia >= desde && dia <= hasta
}

function dias(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta.slice(0, 10)) - Date.parse(desde.slice(0, 10))) / 86_400_000)
}

function indicador(
  valores: Record<Revista, number>,
  filtro: FiltroRevistaInforme,
): IndicadorRevista {
  const reep = filtro === 'ire' ? 0 : valores.reep
  const ire = filtro === 'reep' ? 0 : valores.ire
  return { reep, ire, total: reep + ire }
}

const NOMBRE_INFORME: Record<Revista, string> = {
  reep: 'Revista Electrónica en Educación y Pedagogía',
  ire: 'Revista Investigium IRE: Ciencias Sociales y Humanas',
}

function informe(periodo: string, filtro: FiltroRevistaInforme): Informe {
  const { desde, hasta } = rango(periodo)
  const etiqueta = periodos().find((p) => p.valor === periodo)?.etiqueta ?? periodo
  const por = <T>(f: (base: SeedRevista) => T): Record<Revista, T> => ({
    reep: f(baseDe('reep')),
    ire: f(baseDe('ire')),
  })

  const entregas = por((b) => b.asignaciones.filter((a) => enRango(a.fechaEntrega, desde, hasta)))
  const conceptos = REVISTAS.filter((r) => filtro === 'ambas' || filtro === r).flatMap(
    (r) => entregas[r],
  )
  const promedioDe = (lista: typeof conceptos) => {
    if (lista.length === 0) return 0
    return Math.round(
      lista.reduce((s, a) => s + dias(a.fechaInvitacion, a.fechaEntrega ?? a.fechaInvitacion), 0) /
        lista.length,
    )
  }
  const promedio = (r: Revista) => promedioDe(entregas[r])
  const incluidas = REVISTAS.filter((r) => filtro === 'ambas' || filtro === r)
  const delPeriodo = (r: Revista) =>
    baseDe(r).articulos.filter((a) => enRango(a.fechaPostulacion, desde, hasta))
  const articulos = incluidas.flatMap((r) =>
    delPeriodo(r).map((a) => ({
      revista: r,
      numeroOjs: a.numeroOjs,
      titulo: a.titulo,
      autores: a.autoresIds
        .map((id) => autorPorId(id)?.nombre)
        .filter(Boolean)
        .join('; '),
      publicacion: a.estado === 'aprobado' ? a.publicacion : null,
    })),
  )
  const resultados = incluidas.map((r) => {
    const lista = delPeriodo(r)
    const publicados = lista.filter((a) => a.estado === 'aprobado').length
    const rechazados = lista.filter((a) => a.estado === 'rechazado').length
    return {
      revista: r,
      nombre: NOMBRE_INFORME[r],
      publicados,
      noPublicados: lista.length - publicados - rechazados,
      rechazados,
    }
  })

  return {
    periodo,
    etiquetaPeriodo: etiqueta,
    revista: filtro,
    postulados: indicador(
      por((b) => b.articulos.filter((a) => enRango(a.fechaPostulacion, desde, hasta)).length),
      filtro,
    ),
    aprobados: indicador(
      por(
        (b) =>
          b.articulos.filter(
            (a) => a.estado === 'aprobado' && enRango(a.fechaPostulacion, desde, hasta),
          ).length,
      ),
      filtro,
    ),
    rechazados: indicador(
      por(
        (b) =>
          b.articulos.filter(
            (a) => a.estado === 'rechazado' && enRango(a.fechaPostulacion, desde, hasta),
          ).length,
      ),
      filtro,
    ),
    evaluacionesEntregadas: indicador(
      { reep: entregas.reep.length, ire: entregas.ire.length },
      filtro,
    ),
    constanciasEmitidas: indicador(
      por(
        (b) =>
          b.constancias.filter(
            (c) => c.estado === 'emitida' && enRango(c.fechaEmision, desde, hasta),
          ).length,
      ),
      filtro,
    ),
    diasPromedioEvaluacion: {
      reep: filtro === 'ire' ? 0 : promedio('reep'),
      ire: filtro === 'reep' ? 0 : promedio('ire'),
      // El total pondera cada revista por sus evaluaciones; no es el promedio de dos promedios.
      total: promedioDe(
        REVISTAS.filter((r) => filtro === 'ambas' || filtro === r).flatMap((r) => entregas[r]),
      ),
    },
    conceptos: {
      publicable: conceptos.filter((a) => a.concepto === 'publicable').length,
      conModificaciones: conceptos.filter((a) => a.concepto === 'publicable-con-modificaciones')
        .length,
      noPublicable: conceptos.filter((a) => a.concepto === 'no-publicable').length,
      pendienteFormato: conceptos.filter((a) => a.concepto === 'pendiente-formato').length,
    },
    articulos,
    resultados,
  }
}

export const handlersPanel = [
  http.get('*/api/:revista/tablero', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const tablero: Tablero = {
      fecha: ahoraIso().slice(0, 10),
      sinPares: c.base.articulos.filter((a) =>
        esperaPares(
          a,
          c.base.asignaciones.filter((x) => x.articuloId === a.id).map((x) => x.estado),
        ),
      ).length,
      enEvaluacion: c.base.articulos.filter((a) => a.estado === 'en-evaluacion').length,
      aprobados: c.base.articulos.filter((a) => a.estado === 'aprobado').length,
      sinResponder: sinResponder(c.base),
      constanciasPendientes: pendientes(c.base),
      porCorregir: c.base.porCorregir.length,
    }
    return HttpResponse.json(tablero)
  }),

  http.get('*/api/resumen', ({ request }) => {
    const c = contextoGlobal(request)
    if (!c.ok) return c.respuesta
    const resumen: ResumenGeneral = {
      fecha: ahoraIso().slice(0, 10),
      revistas: REVISTAS.map((revista) => {
        const base = baseDe(revista)
        return {
          revista,
          articulos: base.articulos.length,
          pares: base.pares.length,
          sinResponder: sinResponder(base).length,
          constanciasPendientes: pendientes(base).length,
          porCorregir: base.porCorregir.length,
        }
      }),
    }
    return HttpResponse.json(resumen)
  }),

  http.get('*/api/informes/periodos', ({ request }) => {
    const c = contextoGlobal(request)
    if (!c.ok) return c.respuesta
    return HttpResponse.json(periodos())
  }),

  http.get('*/api/informes/pdf', ({ request }) => {
    const c = contextoGlobal(request)
    if (!c.ok) return c.respuesta
    return new HttpResponse('%PDF-1.4 informe de ejemplo', {
      headers: { 'Content-Type': 'application/pdf' },
    })
  }),

  http.get('*/api/informes', ({ request }) => {
    const c = contextoGlobal(request)
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const revista = url.searchParams.get('revista') ?? 'ambas'
    const periodo = url.searchParams.get('periodo') ?? periodos()[0]?.valor ?? ''
    if (revista !== 'ambas' && revista !== 'reep' && revista !== 'ire')
      return error(422, 'Revista no válida')
    if (!periodos().some((p) => p.valor === periodo)) return error(422, 'Periodo no válido')
    return HttpResponse.json(informe(periodo, revista))
  }),
]
