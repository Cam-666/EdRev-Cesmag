/*
 * ModalConfirmacion — asks for confirmation before an action that cannot be undone (for example,
 * deleting an account or a template). The confirm button is the destructive action; Cancel is the
 * safe way out. Built on Modal (focus trap, Escape). Covers: RNF-11, RNF-19.
 */
import type { ReactNode } from 'react'
import { Alerta } from './Alerta'
import { Boton } from './Boton'
import { Modal } from './Modal'

export interface ModalConfirmacionProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void
  titulo: string
  descripcion: string
  /** Label of the destructive button, e.g. «Eliminar cuenta». */
  etiquetaConfirmar: string
  cargando?: boolean
  /** Message of the failed attempt, shown inside the dialog. */
  error?: string | null
  children?: ReactNode
}

export function ModalConfirmacion({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  descripcion,
  etiquetaConfirmar,
  cargando,
  error,
  children,
}: ModalConfirmacionProps) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      descripcion={descripcion}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="peligro" cargando={cargando} onClick={onConfirmar}>
            {etiquetaConfirmar}
          </Boton>
        </>
      }
    >
      {error && <Alerta tipo="error">{error}</Alerta>}
      {children}
    </Modal>
  )
}
