/* Modal — diálogo sobre Radix Dialog (atrapa el foco, se cierra con Escape y devuelve el foco al cerrarse). */
import * as Dialog from '@radix-ui/react-dialog'
import { useRef } from 'react'
import type { ReactNode } from 'react'

export interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion: string
  children?: ReactNode
  /** Acciones del pie (botones). */
  acciones?: ReactNode
}

export function Modal({ abierto, onCerrar, titulo, descripcion, children, acciones }: ModalProps) {
  // El diálogo es controlado (sin Radix Trigger), así que se recuerda quién lo abrió para devolverle el foco.
  const previo = useRef<HTMLElement | null>(null)
  return (
    <Dialog.Root open={abierto} onOpenChange={(abrir) => !abrir && onCerrar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-velo-modal" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            previo.current = document.activeElement as HTMLElement | null
          }}
          onCloseAutoFocus={(evento) => {
            evento.preventDefault()
            previo.current?.focus()
          }}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-full w-full max-w-acceso -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-superficie-tarjeta p-6 shadow-elevada"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-titulo-20">{titulo}</Dialog.Title>
            <Dialog.Close className="rounded-md px-2 text-texto-secundario hover:text-texto-principal">
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Cerrar</span>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-cuerpo-13 text-texto-secundario">
            {descripcion}
          </Dialog.Description>
          {children}
          {acciones && <div className="flex justify-end gap-2">{acciones}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
