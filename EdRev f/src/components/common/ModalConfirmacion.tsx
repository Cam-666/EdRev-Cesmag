/*
 * ModalConfirmacion — pide confirmación antes de una acción que no se puede deshacer (por ejemplo, eliminar una
 * cuenta o una plantilla). El botón de confirmar es la acción destructiva; Cancelar es la salida segura.
 * Se construye sobre Modal (foco atrapado, Escape).
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
  /** Texto del botón destructivo, por ejemplo «Eliminar cuenta». */
  etiquetaConfirmar: string
  cargando?: boolean
  /** Mensaje del intento fallido, que se muestra dentro del diálogo. */
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
