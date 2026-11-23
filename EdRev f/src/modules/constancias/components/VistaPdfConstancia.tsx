/*
 * VistaPdfConstancia — la constancia que se va a enviar, como el PDF real, en un visor grande dentro del diálogo
 * de emisión: es el mismo archivo que recibirá el par (encabezado, texto con sus datos, firma y pie de página).
 * Con el servidor real se pide el PDF; con los datos de ejemplo del navegador no hay PDF, y el diálogo muestra la
 * vista de texto (VistaPreviaConstancia).
 */
import { useVistaPdfConstancia } from '../hooks/useConstancias'
import { Alerta } from '@/components/common/Alerta'
import { VisorPdf } from '@/components/common/VisorPdf'
import { mensajeDeApi } from '@/lib/api/errores'

export function VistaPdfConstancia({ constanciaId }: { constanciaId: string | null }) {
  const consulta = useVistaPdfConstancia(constanciaId)

  if (consulta.isError) {
    return (
      <Alerta tipo="error">
        {mensajeDeApi(consulta.error, 'No fue posible mostrar la constancia.')}
      </Alerta>
    )
  }
  if (!consulta.data)
    return <p className="text-cuerpo-13 text-texto-secundario">Preparando la constancia…</p>
  return (
    <VisorPdf
      archivo={consulta.data}
      titulo="Vista previa de la constancia en PDF"
      className="mx-auto max-w-3xl"
    />
  )
}
