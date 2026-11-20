/*
 * ListaParesAsignados — los pares del artículo en orden de asignación con su estado, concepto y fecha de
 * entrega, el aviso de desempate y las acciones de cada par. Las invitaciones corren en paralelo: solo los pares
 * que aceptaron o entregaron ocupan un lugar; los demás siguen en la lista.
 */
import { ETIQUETA_CONCEPTO } from '../config/listas'
import { AccionesAsignacion } from '@/modules/pares/components/AccionesAsignacion'
import { Alerta } from '@/components/common/Alerta'
import { FilaParAsignado } from '@/components/common/FilaParAsignado'
import { activa, conceptosDifieren, reglaPares } from '@/lib/dominio/pares'
import type { AsignacionDetalle } from '@/types/par'

export interface ListaParesAsignadosProps {
  asignaciones: AsignacionDetalle[]
}

export function ListaParesAsignados({ asignaciones }: ListaParesAsignadosProps) {
  const activos = asignaciones.filter(activa)
  const difieren = conceptosDifieren(activos[0], activos[1])
  const { desempate } = reglaPares(asignaciones)

  return (
    <div className="flex flex-col gap-4">
      {difieren && (
        <Alerta tipo="advertencia">
          {desempate
            ? 'Los conceptos de los dos primeros pares no coinciden: puede asignar un tercer par de desempate.'
            : 'Los conceptos de los dos primeros pares no coinciden.'}
        </Alerta>
      )}
      {asignaciones.length === 0 ? (
        <p className="rounded-lg border border-borde-base bg-superficie-tarjeta p-5 text-texto-secundario">
          Aún no hay pares asignados a este artículo.
        </p>
      ) : (
        <ul aria-label="Pares asignados" className="flex flex-col gap-3">
          {asignaciones.map((a) => (
            <FilaParAsignado
              key={a.id}
              orden={a.orden}
              nombre={a.par.nombre}
              universidad={a.par.universidad}
              estado={a.estado}
              concepto={a.concepto ? ETIQUETA_CONCEPTO[a.concepto] : null}
              fechaEntrega={a.fechaEntrega}
              esDesempate={a.esDesempate}
              constanciaEmitida={a.constanciaEmitida}
              acciones={<AccionesAsignacion asignacion={a} />}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
