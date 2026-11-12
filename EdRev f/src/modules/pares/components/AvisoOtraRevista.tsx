/*
 * AvisoOtraRevista — warns, while registering a peer, that its email is already in the base of
 * the other journal, says whether it is blocked there and offers to copy its data. The peer is
 * still registered in this journal's own base (each journal keeps its own). Covers: RF-12, HU-08.
 */
import { useParEnOtraRevista } from '../hooks/usePares'
import { ETIQUETA_MOTIVO } from '../config/listas'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { REVISTAS } from '@/types/revista'
import type { ParEnOtraRevista } from '@/types/par'

export interface AvisoOtraRevistaProps {
  correo: string
  onCopiar: (par: ParEnOtraRevista) => void
}

export function AvisoOtraRevista({ correo, onCopiar }: AvisoOtraRevistaProps) {
  const consulta = useParEnOtraRevista(correo)
  const par = consulta.data
  if (!par) return null
  return (
    <Alerta
      tipo="advertencia"
      titulo={`Este correo ya está en ${REVISTAS[par.revista].nombreCorto}`}
      accion={
        <Boton variante="secundario" tamano="sm" onClick={() => onCopiar(par)}>
          Copiar sus datos
        </Boton>
      }
    >
      {par.nombre}.{' '}
      {par.bloqueo
        ? `Allí está bloqueado: ${ETIQUETA_MOTIVO[par.bloqueo.motivo]}.`
        : 'Allí está disponible.'}
    </Alerta>
  )
}
