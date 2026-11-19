/*
 * ConceptoModal — registers the concept issued by a peer, chosen from the closed list of the
 * evaluation form (publicable, publicable con modificaciones sustanciales, no publicable). Each
 * peer has its own concept. Covers: RF-20, HU-14. Both profiles (RNF-05).
 */
import { useState } from 'react'
import { OPCIONES_CONCEPTO } from '../config/listas'
import { useRegistrarConcepto } from '../hooks/useAsignaciones'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { AsignacionDetalle, ConceptoPar } from '@/types/par'

export interface ConceptoModalProps {
  asignacion: AsignacionDetalle
  abierto: boolean
  onCerrar: () => void
  onRegistrado: (mensaje: string) => void
}

export function ConceptoModal({ asignacion, abierto, onCerrar, onRegistrado }: ConceptoModalProps) {
  const [concepto, setConcepto] = useState<string | undefined>(asignacion.concepto ?? undefined)
  const [error, setError] = useState<string | undefined>()
  const mutacion = useRegistrarConcepto()

  function confirmar() {
    if (!concepto) {
      setError('Seleccione el concepto del par.')
      return
    }
    setError(undefined)
    mutacion.mutate(
      { asignacionId: asignacion.id, concepto: concepto as ConceptoPar },
      {
        onSuccess: () => {
          onRegistrado(`Concepto de ${asignacion.par.nombre} registrado.`)
          onCerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar concepto"
      descripcion={`${asignacion.par.nombre} · par ${asignacion.orden}`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={mutacion.isPending} onClick={confirmar}>
            Registrar concepto
          </Boton>
        </>
      }
    >
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible registrar el concepto.')}
        </Alerta>
      )}
      <ListaDesplegable
        etiqueta="Concepto"
        opciones={OPCIONES_CONCEPTO}
        valor={concepto}
        onCambio={setConcepto}
        error={error}
      />
    </Modal>
  )
}
