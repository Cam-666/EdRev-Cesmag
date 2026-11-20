/*
 * BarraIndicador — una barra horizontal de las gráficas del informe: un <progress> nativo (así conserva su
 * significado sin color), delgada, con los extremos redondeados, en el color de su serie. Se imprime a color.
 */
import { cn } from '@/lib/cn'

export type SerieInforme = 'reep' | 'ire' | 'unica'

const COLOR: Record<SerieInforme, string> = {
  reep: '[&::-webkit-progress-value]:bg-serie-reep [&::-moz-progress-bar]:bg-serie-reep',
  ire: '[&::-webkit-progress-value]:bg-serie-ire [&::-moz-progress-bar]:bg-serie-ire',
  unica: '[&::-webkit-progress-value]:bg-serie-unica [&::-moz-progress-bar]:bg-serie-unica',
}

export interface BarraIndicadorProps {
  valor: number
  maximo: number
  serie: SerieInforme
  /** Lectura accesible de la barra, por ejemplo «Aprobaciones de Educación y Pedagogía: 4». */
  etiqueta: string
}

export function BarraIndicador({ valor, maximo, serie, etiqueta }: BarraIndicadorProps) {
  return (
    <progress
      value={valor}
      max={Math.max(maximo, 1)}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        'h-2.5 w-full print:h-3.5 appearance-none overflow-hidden rounded-full border-0 bg-superficie-sutil [print-color-adjust:exact]',
        '[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-superficie-sutil',
        '[&::-webkit-progress-value]:rounded-full',
        '[&::-moz-progress-bar]:rounded-full',
        COLOR[serie],
      )}
    />
  )
}
