/*
 * ConceptosDelPeriodo — how many peers' concepts were publicable, publicable with changes or not
 * publicable in the period, as count and percentage (text plus a progress element, never color
 * alone). Covers: RF-38, HU-14 (count how many articles were publicable).
 */
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
      className="flex h-fit flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h2 id="titulo-conceptos" className="text-titulo-16">
        Conceptos del periodo
      </h2>
      {total === 0 ? (
        <p className="text-cuerpo-13 text-texto-secundario">
          No hay conceptos registrados en este periodo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filas.map((f) => {
            const porcentaje = Math.round((f.valor / total) * 100)
            return (
              <li key={f.etiqueta} className="flex flex-col gap-1">
                <span className="flex justify-between text-cuerpo-15">
                  <span>{f.etiqueta}</span>
                  <span>
                    {f.valor} · {porcentaje} %
                  </span>
                </span>
                <progress
                  value={f.valor}
                  max={total}
                  aria-label={`${f.etiqueta}: ${porcentaje} %`}
                  className="h-2 w-full"
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
