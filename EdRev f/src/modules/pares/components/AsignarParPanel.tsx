/*
 * AsignarParPanel — «Asignar par evaluador» en la ficha del artículo, una vez que el comité aprobó el artículo.
 * Dos caminos: elegir entre los pares disponibles de la revista o registrar un candidato nuevo (queda en la base).
 * En ambos la invitación sale sola. El panel queda abierto para seguir invitando mientras los demás responden; el
 * resultado de cada asignación se informa a la ficha.
 */
import { useState } from 'react'
import { FormularioCandidato } from './FormularioCandidato'
import { ListaParesDisponibles } from './ListaParesDisponibles'
import { useAsignarPar } from '../hooks/useAsignaciones'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { Pestanas } from '@/components/common/Pestanas'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ResultadoAsignacion } from '@/types/par'

export interface AsignarParPanelProps {
  articuloId: string
  esDesempate: boolean
  onAsignado: (resultado: ResultadoAsignacion) => void
  onCerrar: () => void
}

export function AsignarParPanel({
  articuloId,
  esDesempate,
  onAsignado,
  onCerrar,
}: AsignarParPanelProps) {
  const asignar = useAsignarPar(articuloId)
  const [asignando, setAsignando] = useState<string | null>(null)

  return (
    <section
      aria-labelledby="titulo-asignar-par"
      className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id="titulo-asignar-par" className="text-titulo-16">
          {esDesempate ? 'Asignar par de desempate' : 'Asignar par evaluador'}
        </h3>
        <Boton variante="neutro" tamano="sm" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>
      {asignar.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(asignar.error, 'No fue posible asignar el par.')}
        </Alerta>
      )}
      <Pestanas
        etiqueta="Cómo asignar el par"
        pestanas={[
          {
            valor: 'disponible',
            etiqueta: 'Elegir un par disponible',
            contenido: (
              <ListaParesDisponibles
                articuloId={articuloId}
                asignando={asignando}
                onAsignar={(par) => {
                  setAsignando(par.id)
                  asignar.mutate(
                    { parId: par.id },
                    { onSuccess: onAsignado, onSettled: () => setAsignando(null) },
                  )
                }}
              />
            ),
          },
          {
            valor: 'nuevo',
            etiqueta: 'Registrar un candidato nuevo',
            contenido: (
              <FormularioCandidato
                enviando={asignar.isPending}
                onEnviar={(nuevo, limpiar) =>
                  asignar.mutate(
                    { nuevo },
                    {
                      onSuccess: (r) => {
                        limpiar()
                        onAsignado(r)
                      },
                    },
                  )
                }
              />
            ),
          },
        ]}
      />
    </section>
  )
}
