/*
 * VistaPreviaCorreo — the mail of a template as the peer receives it: the institutional header with
 * the shield, the text with sample data, the buttons, the contact block and the legal notices. It
 * is built by the server from the text being edited (a moment after the last key), so what is seen
 * here is the mail itself and not a plain text. Covers: RF-25, RF-45, RNF-11.
 */
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { vistaCorreoPlantilla } from '../services/adminService'
import { Alerta } from '@/components/common/Alerta'
import { mensajeDeApi } from '@/lib/api/errores'
import type { Revista } from '@/types/revista'

export interface VistaPreviaCorreoProps {
  revista: Revista
  uso: 'invitacion' | 'agradecimiento'
  /** The stored text being edited (with its markers). */
  cuerpo: string
}

/** The value after it has stopped changing for `ms`; avoids a request on every key. */
function useRetrasado<T>(valor: T, ms = 500): T {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retrasado
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
