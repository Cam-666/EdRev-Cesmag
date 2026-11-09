/*
 * EntregaModal — marks that a peer delivered the evaluation (done in the OJS, so the mark is
 * manual) with its date. The evaluation then shows a pending constancia.
 * Covers: RF-22, RF-23, HU-16. Administradora only (RNF-05).
 */
import { useState } from 'react'
import { useMarcarEntrega } from '../hooks/useAsignaciones'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { AsignacionDetalle } from '@/types/par'

export interface EntregaModalProps {
  asignacion: AsignacionDetalle
  abierto: boolean
  onCerrar: () => void
  onRegistrada: (mensaje: string) => void
}

function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntregaModal({ asignacion, abierto, onCerrar, onRegistrada }: EntregaModalProps) {
  const [fecha, setFecha] = useState(hoy())
  const [error, setError] = useState<string | undefined>()
  const mutacion = useMarcarEntrega()

  function confirmar() {
    if (!fecha) {
      setError('Seleccione la fecha de entrega.')
      return
    }
    setError(undefined)
    mutacion.mutate(
      { asignacionId: asignacion.id, fecha },
      {
        onSuccess: () => {
          onRegistrada(
            `Entrega de ${asignacion.par.nombre} registrada. Su constancia quedó pendiente.`,
          )
          onCerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Marcar entrega"
      descripcion={`${asignacion.par.nombre} entregó su evaluación en el OJS.`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={mutacion.isPending} onClick={confirmar}>
            Marcar entrega
          </Boton>
        </>
      }
    >
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible marcar la entrega.')}
        </Alerta>
      )}
      <CampoTexto
        etiqueta="Fecha de entrega"
        type="date"
        value={fecha}
        max={hoy()}
        min={asignacion.fechaInvitacion.slice(0, 10)}
        error={error}
        onChange={(e) => setFecha(e.target.value)}
      />
    </Modal>
  )
}
