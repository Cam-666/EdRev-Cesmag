/*
 * GraficaActividad — grouped horizontal bars of the editorial process (postulations, approvals,
 * rejections, evaluations, constancias) with one bar per journal on a shared scale. Each journal
 * keeps its own color; every bar has its figure beside it, and the table of the next section holds
 * the same data. Covers: RF-38, HU-27.
 */
import { BarraIndicador } from './BarraIndicador'
import type { SerieInforme } from './BarraIndicador'
import type { IndicadorRevista, Informe } from '@/types/panel'
import { REVISTAS } from '@/types/revista'

interface Fila {
  nombre: string
  valores: IndicadorRevista
}

export interface GraficaActividadProps {
  informe: Informe
}

export function GraficaActividad({ informe }: GraficaActividadProps) {
  const filas: Fila[] = [
    { nombre: 'Postulaciones', valores: informe.postulados },
    { nombre: 'Aprobaciones', valores: informe.aprobados },
    { nombre: 'Rechazos', valores: informe.rechazados },
    { nombre: 'Evaluaciones', valores: informe.evaluacionesEntregadas },
    { nombre: 'Constancias', valores: informe.constanciasEmitidas },
  ]
  const series: Array<{ clave: 'reep' | 'ire'; serie: SerieInforme }> = (
    [
      { clave: 'reep', serie: 'reep' },
      { clave: 'ire', serie: 'ire' },
    ] as const
  ).filter((s) => informe.revista === 'ambas' || informe.revista === s.clave)
  const maximo = Math.max(...filas.flatMap((f) => series.map((s) => f.valores[s.clave])), 1)

  return (
    <figure className="flex break-inside-avoid flex-col gap-5 rounded-lg border border-borde-base bg-superficie-tarjeta p-6 shadow-tarjeta print:gap-8 print:p-8">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-titulo-16">Cantidad por etapa del proceso</span>
        {series.length > 1 && (
          <ul className="flex flex-wrap gap-4 text-cuerpo-13 text-texto-secundario">
            {series.map((s) => (
              <li key={s.clave} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-block h-3 w-3 shrink-0 rounded-full border border-borde-fuerte [print-color-adjust:exact] ${s.serie === 'reep' ? 'bg-serie-reep' : 'bg-serie-ire'}`}
                />
                {REVISTAS[s.clave].nombreCorto}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
      <ul className="flex flex-col gap-5 print:gap-9">
        {filas.map((f) => (
          <li
            key={f.nombre}
            className="grid grid-cols-1 gap-1 break-inside-avoid sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4"
          >
            <span className="text-cuerpo-13 text-texto-principal print:text-[15px]">{f.nombre}</span>
            <div className="flex flex-col gap-1.5 print:gap-2.5">
              {series.map((s) => (
                <div key={s.clave} className="flex items-center gap-3">
                  <BarraIndicador
                    valor={f.valores[s.clave]}
                    maximo={maximo}
                    serie={s.serie}
                    etiqueta={`${f.nombre} de ${REVISTAS[s.clave].nombreCorto}: ${f.valores[s.clave]}`}
                  />
                  <span className="w-8 shrink-0 text-right text-etiqueta-13 tabular-nums text-texto-principal">
                    {f.valores[s.clave]}
                  </span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </figure>
  )
}
