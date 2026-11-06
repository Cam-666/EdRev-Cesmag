/*
 * EnlaceBoton — a router link that looks like a button (navigation is a link, not a button).
 * Covers: RNF-11 (links navigate, buttons act).
 */
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { clasesBoton } from './Boton'
import type { TamanoBoton, VarianteBoton } from './Boton'
import { cn } from '@/lib/cn'

export interface EnlaceBotonProps extends LinkProps {
  variante?: VarianteBoton
  tamano?: TamanoBoton
}

export function EnlaceBoton({
  variante = 'primario',
  tamano = 'md',
  className,
  ...resto
}: EnlaceBotonProps) {
  return <Link {...resto} className={cn(clasesBoton(variante, tamano), className)} />
}
