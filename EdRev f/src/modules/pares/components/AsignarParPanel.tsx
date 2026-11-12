/*
 * AsignarParPanel — «Asignar par evaluador» in the article sheet, once the committee approved the
 * article. Two ways: choose from the peers available in the journal, or register a brand-new
 * candidate (saved in the base). Either way the invitation goes out by itself. The panel stays
 * open to keep inviting while the others answer; the result of each assignment is reported to
 * the sheet. Covers: RF-12, RF-17, RF-19, RF-24, RF-27, HU-13, HU-18.
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
