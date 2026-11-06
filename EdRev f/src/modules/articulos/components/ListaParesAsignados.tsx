/*
 * ListaParesAsignados — peers of the article in assignment order with status, concept and
 * delivery date, the tiebreaker warning and the "Cómo se resuelve" rules card. Read-only in
 * this phase: assigning, resending, concept and delivery actions arrive with the assignment
 * flow. Covers: RF-19, RF-20, RF-21, RF-22, HU-13.
 */
import { ETIQUETA_CONCEPTO } from '../config/listas'
import { conceptosContradictorios } from '../config/reglas'
import { Alerta } from '@/components/common/Alerta'
import { FilaParAsignado } from '@/components/common/FilaParAsignado'
import type { AsignacionDetalle } from '@/types/par'

export interface ListaParesAsignadosProps {
  asignaciones: AsignacionDetalle[]
}

export function ListaParesAsignados({ asignaciones }: ListaParesAsignadosProps) {
  const [primero, segundo] = asignaciones
  const divergen = conceptosContradictorios(primero?.concepto ?? null, segundo?.concepto ?? null)

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {divergen && (
          <Alerta tipo="advertencia">
            Los conceptos de los dos primeros pares se contradicen.
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
              />
            ))}
          </ul>
        )}
      </div>

      <aside
        aria-labelledby="titulo-como-se-resuelve"
        className="h-fit rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
      >
        <h2 id="titulo-como-se-resuelve" className="mb-2 text-titulo-16">
          Cómo se resuelve
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-cuerpo-13 text-texto-secundario">
          <li>Un artículo admite hasta tres pares, en orden.</li>
          <li>Si los dos primeros conceptos coinciden, no se pide un tercero.</li>
          <li>Solo la Administradora registra conceptos y marca entregas.</li>
        </ul>
      </aside>
    </div>
  )
}
