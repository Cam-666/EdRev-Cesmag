import { createContext } from 'react'

/** DOM node inside the top bar where pages portal their header actions. */
export const DestinoAcciones = createContext<HTMLElement | null>(null)
