/*
 * PasosAlta — "Pasos" side panel of the two-step article registration.
 * Covers: RF-01, RF-09, HU-01, HU-06.
 */
import { cn } from '@/lib/cn'

export interface PasosAltaProps {
  actual: 1 | 2
}

const PASOS = ['Datos del artículo', 'Autores con su ORCID']

export function PasosAlta({ actual }: PasosAltaProps) {
  return (
    <nav
      aria-label="Pasos del registro"
      className="h-fit rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h2 className="mb-3 text-titulo-16">Pasos</h2>
      <ol className="flex flex-col gap-3">
        {PASOS.map((texto, i) => {
          const numero = i + 1
          const activo = numero === actual
          return (
            <li
              key={texto}
              aria-current={activo ? 'step' : undefined}
              className="flex items-center gap-3"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-etiqueta-13',
                  activo
                    ? 'bg-cesmag-azul text-texto-inverso'
                    : 'bg-superficie-sutil text-neutro-800',
                )}
              >
                {numero}
              </span>
              <span className={cn('text-cuerpo-15', activo && 'text-cuerpo-15-enfasis')}>
                {texto}
                {activo && (
                  <>
                    {' '}
                    <span className="sr-only">(paso actual)</span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
