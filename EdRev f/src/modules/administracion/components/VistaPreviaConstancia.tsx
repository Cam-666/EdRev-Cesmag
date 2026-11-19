/*
 * VistaPreviaConstancia — the constancia of a template as the PDF it really is, in a viewer inside
 * the page: header, text with sample data, signature and footer. It is built by the server from the
 * text being edited and the images uploaded, a moment after the last change. Covers: RF-30, RF-45.
 */
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { vistaPdfConstancia } from '../services/adminService'
import { Alerta } from '@/components/common/Alerta'
import { mensajeDeApi } from '@/lib/api/errores'
import type { Plantilla } from '@/types/plantilla'

export interface VistaPreviaConstanciaProps {
  plantilla: Plantilla
  /** The stored text being edited (with its markers). */
  cuerpo: string
}

export function VistaPreviaConstancia({ plantilla, cuerpo }: VistaPreviaConstanciaProps) {
  const [texto, setTexto] = useState(cuerpo)
  useEffect(() => {
    const t = setTimeout(() => setTexto(cuerpo), 500)
    return () => clearTimeout(t)
  }, [cuerpo])
  // The images and the template change what the PDF shows: they are part of the key.
  const imagenes = JSON.stringify(plantilla.imagenes)
  const consulta = useQuery({
    queryKey: ['admin', 'vista-pdf', plantilla.id, texto, imagenes],
    queryFn: () => vistaPdfConstancia(plantilla.id, texto),
    placeholderData: (anterior) => anterior,
  })
  const direccion = useMemo(
    () =>
      consulta.data && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(consulta.data)
        : null,
    [consulta.data],
  )
  useEffect(() => () => (direccion ? URL.revokeObjectURL(direccion) : undefined), [direccion])

  return (
    <div className="flex flex-col gap-2">
      {consulta.isError && (
        <Alerta tipo="error">{mensajeDeApi(consulta.error, 'No fue posible mostrar la constancia.')}</Alerta>
      )}
      {direccion ? (
        <iframe
          title="Vista previa de la constancia en PDF"
          src={`${direccion}#view=FitH`}
          className="h-[860px] w-full rounded-lg border border-borde-base bg-white"
        />
      ) : (
        !consulta.isError && <p className="text-cuerpo-13 text-texto-secundario">Preparando la vista previa…</p>
      )}
    </div>
  )
}
