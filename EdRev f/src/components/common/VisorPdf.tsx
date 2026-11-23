/*
 * VisorPdf — muestra un PDF con el visor del propio navegador (el recuadro gris con su barra para ampliar, imprimir
 * y descargar), con la hoja completa a la vista: así se ven a la vez el encabezado, el texto, la firma y el pie de
 * página. El recuadro tiene la proporción de una hoja Carta (más el alto de la barra del visor): el visor ajusta la
 * hoja al ancho, y en un recuadro más ancho que la hoja la parte de abajo (pie de página, firma) quedaba cortada. Cada PDF nuevo abre un visor nuevo, para que no conserve la ampliación ni la posición del anterior.
 */
import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/cn'

export interface VisorPdfProps {
  /** El PDF que se muestra; null mientras se prepara. */
  archivo: Blob | null
  /** Nombre accesible del visor (por ejemplo «Vista previa de la constancia en PDF»). */
  titulo: string
  className?: string
}

export function VisorPdf({ archivo, titulo, className }: VisorPdfProps) {
  const direccion = useMemo(
    () =>
      archivo && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null,
    [archivo],
  )
  useEffect(() => () => (direccion ? URL.revokeObjectURL(direccion) : undefined), [direccion])
  if (!direccion) return null
  return (
    <iframe
      key={direccion}
      title={titulo}
      // «Fit»: la hoja entera cabe en el recuadro (con «FitH» algunos navegadores la abrían ampliada).
      src={`${direccion}#view=Fit`}
      className={cn('aspect-[612/850] w-full rounded-lg border border-borde-base bg-white', className)}
    />
  )
}
