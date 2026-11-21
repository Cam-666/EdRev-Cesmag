/*
 * VistaPreviaCorreo — el correo de una plantilla tal como lo recibe el par: el encabezado institucional con el
 * escudo, el texto con datos de ejemplo, los botones, el bloque de contacto y los avisos legales. Lo arma el
 * servidor con el texto que se está editando (un momento después de la última tecla), así lo que se ve aquí es
 * el correo mismo y no un texto plano.
 */
import { useQuery } from '@tanstack/react-query'
import { vistaCorreoPlantilla } from '../services/adminService'
import { Alerta } from '@/components/common/Alerta'
import { mensajeDeApi } from '@/lib/api/errores'
import { useRetrasado } from '@/lib/useRetrasado'
import type { Revista } from '@/types/revista'

export interface VistaPreviaCorreoProps {
  revista: Revista
  uso: 'invitacion' | 'agradecimiento' | 'mensaje'
  /** El texto guardado que se está editando (con sus marcas). */
  cuerpo: string
}

export function VistaPreviaCorreo({ revista, uso, cuerpo }: VistaPreviaCorreoProps) {
  const texto = useRetrasado(cuerpo)
  const consulta = useQuery({
    queryKey: ['admin', 'vista-correo', revista, uso, texto],
    queryFn: () => vistaCorreoPlantilla({ revista, uso, cuerpo: texto }),
    placeholderData: (anterior) => anterior,
  })
  return (
    <div className="flex flex-col gap-2">
      {consulta.isError && (
        <Alerta tipo="error">{mensajeDeApi(consulta.error, 'No fue posible mostrar el correo.')}</Alerta>
      )}
      {consulta.data ? (
        <iframe
          title="Vista previa del correo"
          srcDoc={consulta.data.html}
          sandbox=""
          className="h-[760px] w-full rounded-lg border border-borde-base bg-white"
        />
      ) : (
        !consulta.isError && <p className="text-cuerpo-13 text-texto-secundario">Preparando la vista previa…</p>
      )}
    </div>
  )
}
