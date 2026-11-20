/* ChipAreaTematica — etiqueta de un área temática, que se puede quitar. */
import { cn } from '@/lib/cn'

export interface ChipAreaTematicaProps {
  area: string
  onQuitar?: () => void
  /** Convierte la etiqueta en un botón de alternancia (se usa para filtrar por área). */
  onSeleccionar?: () => void
  seleccionada?: boolean
  className?: string
}

export function ChipAreaTematica({
  area,
  onQuitar,
  onSeleccionar,
  seleccionada = false,
  className,
}: ChipAreaTematicaProps) {
  if (onSeleccionar) {
    return (
      <button
        type="button"
        aria-pressed={seleccionada}
        onClick={onSeleccionar}
        className={cn(
          'inline-flex items-center rounded-full border px-3 py-1 text-etiqueta-13',
          seleccionada
            ? 'border-cesmag-azul bg-estado-info-fondo text-estado-info'
            : 'border-borde-fuerte bg-superficie-sutil text-neutro-800 hover:bg-neutro-200',
          className,
        )}
      >
        {area}
      </button>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-borde-fuerte bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800',
        className,
      )}
    >
      {area}
      {onQuitar && (
        <button
          type="button"
          onClick={onQuitar}
          className="rounded-full px-1 text-texto-secundario hover:text-texto-principal"
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Quitar {area}</span>
        </button>
      )}
    </span>
  )
}
