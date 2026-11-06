/*
 * AccionesEncabezado — lets a page place buttons in the top bar (e.g. "Registrar artículo")
 * without the layout knowing about them.
 */
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DestinoAcciones } from './DestinoAcciones'

export function AccionesEncabezado({ children }: { children: ReactNode }) {
  const destino = useContext(DestinoAcciones)
  return destino ? createPortal(children, destino) : null
}
