/*
 * VistaPdfConstancia — la constancia que se va a enviar, como el PDF real, en un visor grande dentro del diálogo
 * de emisión: es el mismo archivo que recibirá el par (encabezado, texto con sus datos, firma y pie de página).
 * Con el servidor real se pide el PDF; con los datos de ejemplo del navegador no hay PDF, y el diálogo muestra la
 * vista de texto (VistaPreviaConstancia).
 */
import { useEffect, useMemo } from 'react'
import { useVistaPdfConstancia } from '../hooks/useConstancias'
import { Alerta } from '@/components/common/Alerta'
import { mensajeDeApi } from '@/lib/api/errores'

export function VistaPdfConstancia({ constanciaId }: { constanciaId: string | null }) {
  const consulta = useVistaPdfConstancia(constanciaId)
  const direccion = useMemo(
    () =>
      consulta.data && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(consulta.data) : null,
    [consulta.data],
  )
  useEffect(() => () => (direccion ? URL.revokeObjectURL(direccion) : undefined), [direccion])

  if (consulta.isError) {
    return <Alerta tipo="error">{mensajeDeApi(consulta.error, 'No fue posible mostrar la constancia.')}</Alerta>
  }
  if (!direccion) return <p className="text-cuerpo-13 text-texto-secundario">Preparando la constancia…</p>
  return (
    <iframe
      title="Vista previa de la constancia en PDF"
      src={`${direccion}#view=FitH`}
      className="h-[75vh] min-h-[560px] w-full rounded-lg border border-borde-base bg-white"
    />
  )
}
