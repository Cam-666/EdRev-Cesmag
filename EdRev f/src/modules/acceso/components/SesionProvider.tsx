/*
 * SesionProvider — the only place that holds who is logged in. Authentication state lives here;
 * guards and hooks read it, screens never touch it directly.
 * Covers: HU-28, RF-39, RNF-05. In production this wraps the JWT session of the backend.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { SesionContext } from '../hooks/SesionContext'
import type { CierreSesion } from '../hooks/SesionContext'
import { borrarSesion, guardarSesion, leerSesion } from '../services/almacenSesion'
import { configurarProveedorToken } from '@/lib/api/cliente'
import type { MotivoCierre, RespuestaIngreso } from '@/types/acceso'
import type { Usuario } from '@/types/usuario'

export interface SesionProviderProps {
  /** Omit to restore the session from storage; pass null/user to force it (tests, demos). */
  usuarioInicial?: Usuario | null
  children: ReactNode
}

export function SesionProvider({ usuarioInicial, children }: SesionProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(() =>
    usuarioInicial !== undefined ? usuarioInicial : leerSesion(),
  )
  const [ultimoCierre, setUltimoCierre] = useState<CierreSesion | null>(null)
  const token = useRef<string | null>(null)

  useEffect(() => {
    configurarProveedorToken(() => token.current)
  }, [])

  const iniciarSesion = useCallback((respuesta: RespuestaIngreso, mantener = false) => {
    token.current = respuesta.token
    guardarSesion(respuesta.usuario, mantener)
    setUltimoCierre(null)
    setUsuario(respuesta.usuario)
  }, [])

  const cerrarSesion = useCallback(
    (motivo: MotivoCierre = 'manual') => {
      token.current = null
      borrarSesion()
      setUltimoCierre(
        usuario && motivo === 'inactividad' ? { motivo, correo: usuario.correo } : null,
      )
      setUsuario(null)
    },
    [usuario],
  )

  const valor = useMemo(
    () => ({ usuario, ultimoCierre, iniciarSesion, cerrarSesion }),
    [usuario, ultimoCierre, iniciarSesion, cerrarSesion],
  )
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
