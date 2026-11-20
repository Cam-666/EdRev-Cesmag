/*
 * ConceptosDelPeriodo — cuántos conceptos de pares fueron publicable, publicable con cambios o no publicable en
 * el periodo, como cantidad y porcentaje en barras ordenadas de un solo color (texto más barra, nunca solo color).
 */
import { BarraIndicador } from './BarraIndicador'
import type { Informe } from '@/types/panel'

export interface ConceptosDelPeriodoProps {
  conceptos: Informe['conceptos']
}

export function ConceptosDelPeriodo({ conceptos }: ConceptosDelPeriodoProps) {
  const total =
    conceptos.publicable +
    conceptos.conModificaciones +
    conceptos.noPublicable +
    conceptos.pendienteFormato
  const filas = [
    { etiqueta: 'Publicable', valor: conceptos.publicable },
    { etiqueta: 'Con modificaciones', valor: conceptos.conModificaciones },
    { etiqueta: 'No publicable', valor: conceptos.noPublicable },
    { etiqueta: 'Pendiente formato de evaluación', valor: conceptos.pendienteFormato },
  ]
  return (
    <section
      aria-labelledby="titulo-conceptos"
      className="flex h-fit break-inside-avoid flex-col gap-5 rounded-lg border border-borde-base bg-superficie-tarjeta p-6 shadow-tarjeta print:gap-8 print:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="titulo-conceptos" className="text-titulo-16">
          Conceptos del periodo
        </h3>
        {total > 0 && (
          <p className="text-cuerpo-13 text-texto-secundario">
            {total} {total === 1 ? 'concepto registrado' : 'conceptos registrados'}
          </p>
        )}
      </div>
      {total === 0 ? (
        <p className="text-cuerpo-13 text-texto-secundario">
          No hay conceptos registrados en este periodo.
        </p>
      ) : (
        <ul className="flex flex-col gap-4 print:gap-7">
          {filas.map((f) => {
            const porcentaje = Math.round((f.valor / total) * 100)
            return (
              <li key={f.etiqueta} className="flex flex-col gap-1.5 break-inside-avoid">
                <span className="flex justify-between gap-3 text-cuerpo-13 print:text-[15px]">
                  <span>{f.etiqueta}</span>
                  <span className="tabular-nums text-texto-secundario">
                    {f.valor} · {porcentaje} %
                  </span>
                </span>
                <BarraIndicador
                  valor={f.valor}
                  maximo={total}
                  serie="unica"
                  etiqueta={`${f.etiqueta}: ${porcentaje} %`}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
