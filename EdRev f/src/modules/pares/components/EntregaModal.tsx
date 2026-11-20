/*
 * EntregaModal — marca que un par entregó la evaluación (se hace en el OJS, así que la marca es manual) con su
 * concepto y la fecha de la evaluación: la constancia solo se emite cuando la evaluación está completa, por eso
 * los dos se registran juntos. Justo después de guardar, la ficha ofrece emitir la constancia.
 * Para ambos perfiles.
 */
import { useState } from 'react'
import { OPCIONES_CONCEPTO } from '../config/listas'
import { useMarcarEntrega } from '../hooks/useAsignaciones'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { AsignacionDetalle, ConceptoPar } from '@/types/par'

export interface EntregaModalProps {
  asignacion: AsignacionDetalle
  abierto: boolean
  onCerrar: () => void
  /** Recibe la constancia que se puede emitir de inmediato. */
  onRegistrada: (constanciaId: string | null) => void
}

function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntregaModal({ asignacion, abierto, onCerrar, onRegistrada }: EntregaModalProps) {
  const [fecha, setFecha] = useState(hoy())
  const [concepto, setConcepto] = useState<string | undefined>()
  const [errorConcepto, setErrorConcepto] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const mutacion = useMarcarEntrega()

  function confirmar() {
    setErrorConcepto(concepto ? undefined : 'Seleccione el concepto del par.')
    setError(fecha ? undefined : 'Seleccione la fecha de evaluación.')
    if (!concepto || !fecha) return
    mutacion.mutate(
      { asignacionId: asignacion.id, fecha, concepto: concepto as ConceptoPar },
      {
        onSuccess: ({ constanciaId }) => {
          onCerrar()
          onRegistrada(constanciaId)
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Marcar entrega"
      descripcion={`${asignacion.par.nombre} entregó su evaluación en el OJS. Registre su concepto y la fecha de evaluación; después podrá emitir la constancia.`}
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
      <ListaDesplegable
        etiqueta="Concepto"
        opciones={OPCIONES_CONCEPTO}
        valor={concepto}
        onCambio={setConcepto}
        error={errorConcepto}
      />
      <CampoTexto
        etiqueta="Fecha de evaluación"
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
