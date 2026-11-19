/*
 * ElegirPlantillaDeUso — chooses which template of a journal is used for one purpose (the
 * invitation, the thank-you mail or the constancia). Only the templates created for that purpose are
 * offered; choosing one releases the one used until now. Covers: RF-25, RF-30, RF-45.
 */
import { ETIQUETA_USO } from '../config/plantillas'
import { useAsignarPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { mensajeDeApi } from '@/lib/api/errores'
import type { Plantilla, UsoPlantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'
import { REVISTAS } from '@/types/revista'

export interface ElegirPlantillaDeUsoProps {
  revista: Revista
  uso: UsoPlantilla
  /** Every template, of both journals; the component keeps those of its journal and class. */
  plantillas: Plantilla[]
}

export function ElegirPlantillaDeUso({ revista, uso, plantillas }: ElegirPlantillaDeUsoProps) {
  const asignar = useAsignarPlantilla()
  const candidatas = plantillas.filter((p) => p.revista === revista && p.fin === uso)
  const enUso = candidatas.find((p) => p.uso === uso)
  const nombre = REVISTAS[revista].nombreCorto

  return (
    <div className="flex flex-col gap-2">
      <ListaDesplegable
        etiqueta={`${ETIQUETA_USO[uso]} de ${nombre}`}
        opciones={candidatas.map((p) => ({
          valor: p.id,
          etiqueta: p.cuerpo.trim() ? p.nombre : `${p.nombre} · sin texto`,
        }))}
        valor={enUso?.id}
        onCambio={(id) => {
          if (id !== enUso?.id) asignar.mutate({ id, uso })
        }}
      />
      {asignar.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(asignar.error, 'No fue posible cambiar la plantilla.')}
        </Alerta>
      )}
    </div>
  )
}
