/*
 * SesionProvider — the only place that holds who is logged in. Authentication state lives here;
 * guards and hooks read it, screens never touch it directly.
 * Covers: HU-28, RF-39, RNF-05. In production this wraps the JWT session of the backend.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SesionContext } from '../hooks/SesionContext'
import type { CierreSesion } from '../hooks/SesionContext'
import { borrarSesion, guardarSesion, leerSesion, leerToken } from '../services/almacenSesion'
import { alExpirarSesion, establecerToken } from '@/lib/api/cliente'
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
  // While MSW is on, a restored or forced session gets the matching mock token. With the real
  // backend the token saved with the session is restored; a profile without its token cannot make
  // any request, so that session is discarded and the user signs in again. Runs once, before any
  // child fetches.
  const [inicial] = useState(() => {
    let u = usuarioInicial !== undefined ? usuarioInicial : leerSesion()
    if (u && mocksActivos()) establecerToken(tokenMock(u.id))
    else {
      const token = usuarioInicial === undefined ? leerToken() : null
      if (u && usuarioInicial === undefined && !token) {
        borrarSesion()
        u = null
      }
      establecerToken(u ? token : null)
    }
    return u
  })
  const [usuario, setUsuario] = useState<Usuario | null>(inicial)
  const [ultimoCierre, setUltimoCierre] = useState<CierreSesion | null>(null)

  const iniciarSesion = useCallback((respuesta: RespuestaIngreso) => {
    establecerToken(respuesta.token)
    guardarSesion(respuesta.usuario, respuesta.token)
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

  // The backend rejected the token: the session expired, so the user is taken to the login.
  useEffect(() => {
    if (!usuario) return
    alExpirarSesion(() => cerrarSesion('inactividad'))
    return () => alExpirarSesion(null)
  }, [usuario, cerrarSesion])

  const valor = useMemo(
    () => ({ usuario, ultimoCierre, iniciarSesion, cerrarSesion }),
    [usuario, ultimoCierre, iniciarSesion, cerrarSesion],
  )
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
