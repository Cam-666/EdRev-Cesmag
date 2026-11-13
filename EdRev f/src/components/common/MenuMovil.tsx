/*
 * MenuMovil — on small screens the side panel does not fit: a «Menú» button opens it as a drawer
 * (Radix Dialog: focus trap, Escape and the overlay close it). It closes by itself when the user
 * navigates. Covers: RNF-10, RNF-11 (usable on any screen width, keyboard and screen reader).
 */
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import type { ReactNode } from 'react'

export interface MenuMovilProps {
  /** Current pathname: the drawer closes when it changes. */
  ruta: string
  children: ReactNode
}

export function MenuMovil({ ruta, children }: MenuMovilProps) {
  const [abierto, setAbierto] = useState(false)
  const [rutaPrevia, setRutaPrevia] = useState(ruta)
  if (rutaPrevia !== ruta) {
    setRutaPrevia(ruta)
    setAbierto(false)
  }
  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger className="flex min-h-control items-center gap-2 rounded-md px-3 text-etiqueta-13 text-texto-principal hover:bg-superficie-sutil">
        <span aria-hidden="true">☰</span> Menú
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-velo-modal" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex focus:outline-none">
          <Dialog.Title className="sr-only">Menú principal</Dialog.Title>
          <Dialog.Description className="sr-only">
            Módulos del sistema y de cada revista
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
