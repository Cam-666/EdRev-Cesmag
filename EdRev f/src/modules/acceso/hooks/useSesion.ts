import { useContext } from 'react'
import { SesionContext } from './SesionContext'
import type { SesionContextValue } from './SesionContext'
import type { Usuario } from '@/types/usuario'

export function useSesion(): SesionContextValue {
  const valor = useContext(SesionContext)
  if (!valor) throw new Error('useSesion must be used inside <SesionProvider>')
  return valor
}

/** Usuario actual dentro de las rutas privadas (el guardia garantiza que hay uno). */
export function useUsuarioActual(): Usuario {
  const { usuario } = useSesion()
  if (!usuario) throw new Error('useUsuarioActual used outside a private route')
  return usuario
}
