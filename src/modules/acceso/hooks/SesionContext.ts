import { createContext } from 'react'
import type { Usuario } from '@/types/usuario'

export interface SesionContextValue {
  /** null = not authenticated. */
  usuario: Usuario | null
  iniciarSesion: (usuario: Usuario) => void
  cerrarSesion: () => void
}

export const SesionContext = createContext<SesionContextValue | null>(null)
