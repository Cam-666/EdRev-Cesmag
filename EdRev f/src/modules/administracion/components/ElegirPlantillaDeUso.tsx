/*
 * ElegirPlantillaDeUso — elige qué plantilla de una revista se usa para un fin (la invitación, el correo de
 * agradecimiento o la constancia). Solo se ofrecen las plantillas creadas para ese fin; al elegir una, queda
 * libre la que se usaba hasta ahora.
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
  /** Todas las plantillas, de las dos revistas; el componente conserva las de su revista y su fin. */
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
