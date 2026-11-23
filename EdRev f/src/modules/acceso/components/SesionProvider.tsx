/*
 * SesionProvider — el único lugar que sabe quién ha ingresado. El estado de autenticación vive aquí; los
 * guardias y los hooks lo leen, las pantallas nunca lo tocan directamente. En producción envuelve la sesión JWT
 * del backend.
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
  /** Si se omite, la sesión se restaura del almacenamiento; si se pasa null o un usuario, se fuerza (pruebas, demostraciones). */
  usuarioInicial?: Usuario | null
  children: ReactNode
}

export function SesionProvider({ usuarioInicial, children }: SesionProviderProps) {
  // Mientras MSW está encendido, una sesión restaurada o forzada recibe el token simulado que le corresponde. Con
  // el backend real se restaura el token guardado con la sesión; un perfil sin su token no puede hacer ninguna
  // petición, así que esa sesión se descarta y la persona vuelve a ingresar. Se ejecuta una vez, antes de que
  // cualquier hijo consulte datos.
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
      setUltimoCierre(usuario && motivo !== 'manual' ? { motivo, correo: usuario.correo } : null)
      setUsuario(null)
    },
    [usuario],
  )

  // El backend rechazó el token: la sesión venció o la cuenta fue inhabilitada; se lleva a la persona al ingreso.
  useEffect(() => {
    if (!usuario) return
    alExpirarSesion((motivo) => cerrarSesion(motivo ?? 'inactividad'))
    return () => alExpirarSesion(null)
  }, [usuario, cerrarSesion])

  const valor = useMemo(
    () => ({ usuario, ultimoCierre, iniciarSesion, cerrarSesion }),
    [usuario, ultimoCierre, iniciarSesion, cerrarSesion],
  )
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
