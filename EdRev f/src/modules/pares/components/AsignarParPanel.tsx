/*
 * AsignarParPanel — «Asignar par evaluador» en la ficha del artículo, una vez que el comité aprobó el artículo.
 * Dos caminos: elegir entre los pares disponibles de la revista o registrar un candidato nuevo (queda en la base).
 * En ambos la invitación sale sola. El panel queda abierto para seguir invitando mientras los demás responden; el
 * resultado de cada asignación se informa a la ficha.
 */
import { useState } from 'react'
import { EnviarInvitacionModal } from './EnviarInvitacionModal'
import { FormularioCandidato } from './FormularioCandidato'
import { ListaParesDisponibles } from './ListaParesDisponibles'
import { useAsignarPar } from '../hooks/useAsignaciones'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { Pestanas } from '@/components/common/Pestanas'
import { mensajeDeApi } from '@/lib/api/errores'
import type { DatosAsignacion, ResultadoAsignacion } from '@/types/par'
import type { EleccionCorreo } from '@/types/plantilla'

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
  // Antes de asignar se abre la ventana de la invitación: el par elegido o el candidato nuevo que espera el envío.
  const [pendiente, setPendiente] = useState<{
    datos: DatosAsignacion
    nombre: string
    limpiar?: () => void
  } | null>(null)

  function enviar(eleccion: EleccionCorreo) {
    if (!pendiente) return
    asignar.mutate(
      { ...pendiente.datos, ...eleccion },
      {
        onSuccess: (r) => {
          pendiente.limpiar?.()
          setPendiente(null)
          onAsignado(r)
        },
      },
    )
  }

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
                asignando={null}
                onAsignar={(par) => setPendiente({ datos: { parId: par.id }, nombre: par.nombre })}
              />
            ),
          },
          {
            valor: 'nuevo',
            etiqueta: 'Registrar un candidato nuevo',
            contenido: (
              <FormularioCandidato
                enviando={false}
                onEnviar={(nuevo, limpiar) => setPendiente({ datos: { nuevo }, nombre: nuevo.nombre, limpiar })}
              />
            ),
          },
        ]}
      />
      <EnviarInvitacionModal
        abierto={pendiente !== null}
        nombrePar={pendiente?.nombre ?? ''}
        enviando={asignar.isPending}
        error={asignar.isError ? mensajeDeApi(asignar.error, 'No fue posible asignar el par.') : null}
        onEnviar={enviar}
        onCerrar={() => {
          asignar.reset()
          setPendiente(null)
        }}
      />
    </section>
  )
}
