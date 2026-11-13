/*
 * SesionProvider — the only place that holds who is logged in. Authentication state lives here;
 * guards and hooks read it, screens never touch it directly.
 * Covers: HU-28, RF-39, RNF-05. In production this wraps the JWT session of the backend.
 */
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SesionContext } from '../hooks/SesionContext'
import type { CierreSesion } from '../hooks/SesionContext'
import { borrarSesion, guardarSesion, leerSesion } from '../services/almacenSesion'
import { establecerToken } from '@/lib/api/cliente'
import { mocksActivos } from '@/mocks/habilitar'
import { tokenMock } from '@/mocks/token'
import type { MotivoCierre, RespuestaIngreso } from '@/types/acceso'
import type { Usuario } from '@/types/usuario'

export interface SesionProviderProps {
  /** Omit to restore the session from storage; pass null/user to force it (tests, demos). */
  usuarioInicial?: Usuario | null
  children: ReactNode
}

export function SesionProvider({ usuarioInicial, children }: SesionProviderProps) {
  // While MSW is on, a restored or forced session gets the matching mock token; with the real
  // backend a cookie/JWT replaces it. Runs once, before any child fetches.
  const [inicial] = useState(() => {
    const u = usuarioInicial !== undefined ? usuarioInicial : leerSesion()
    establecerToken(u && mocksActivos() ? tokenMock(u.id) : null)
    return u
  })
  const [usuario, setUsuario] = useState<Usuario | null>(inicial)
  const [ultimoCierre, setUltimoCierre] = useState<CierreSesion | null>(null)

  const iniciarSesion = useCallback((respuesta: RespuestaIngreso) => {
    establecerToken(respuesta.token)
    guardarSesion(respuesta.usuario)
    setUltimoCierre(null)
    setUsuario(respuesta.usuario)
  }, [])

  const cerrarSesion = useCallback(
    (motivo: MotivoCierre = 'manual') => {
      establecerToken(null)
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
