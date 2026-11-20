/* EnlaceBoton — un enlace del enrutador con aspecto de botón (navegar es un enlace; actuar es un botón). */
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
