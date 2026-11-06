/*
 * SesionProvider — the only place that holds who is logged in. Authentication state lives here;
 * guards and hooks read it, screens never touch it directly.
 * Covers: HU-28, RF-39, RNF-05. In production this wraps the JWT session of the backend.
 */
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SesionContext } from '../hooks/SesionContext'
import type { Usuario } from '@/types/usuario'

export interface SesionProviderProps {
  usuarioInicial?: Usuario | null
  children: ReactNode
}

export function SesionProvider({ usuarioInicial = null, children }: SesionProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioInicial)
  const iniciarSesion = useCallback((u: Usuario) => setUsuario(u), [])
  const cerrarSesion = useCallback(() => setUsuario(null), [])
  const valor = useMemo(
    () => ({ usuario, iniciarSesion, cerrarSesion }),
    [usuario, iniciarSesion, cerrarSesion],
  )
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
