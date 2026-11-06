/*
 * ChipAreaTematica — thematic area chip, optionally removable. Covers: RF-13.
 */
import { cn } from '@/lib/cn'

export interface ChipAreaTematicaProps {
  area: string
  onQuitar?: () => void
  className?: string
}

export function ChipAreaTematica({ area, onQuitar, className }: ChipAreaTematicaProps) {
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
