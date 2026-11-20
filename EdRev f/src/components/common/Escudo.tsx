/*
 * Escudo — el escudo de la Universidad CESMAG. Es decorativo por defecto (alt=""), porque el nombre de la
 * universidad siempre está escrito a su lado; se pasa `alt` solo donde es el único identificador.
 */
import escudo from '@/assets/escudo-cesmag.webp'
import { cn } from '@/lib/cn'

export type TamanoEscudo = 'sm' | 'md' | 'lg'

export interface EscudoProps {
  tamano?: TamanoEscudo
  alt?: string
  className?: string
}

const TAMANOS: Record<TamanoEscudo, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export function Escudo({ tamano = 'md', alt = '', className }: EscudoProps) {
  return (
    <img
      src={escudo}
      alt={alt}
      className={cn('shrink-0 object-contain', TAMANOS[tamano], className)}
    />
  )
}
