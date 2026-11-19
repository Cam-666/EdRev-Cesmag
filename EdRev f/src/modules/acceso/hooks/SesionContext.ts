import { createContext } from 'react'
import type { MotivoCierre, RespuestaIngreso } from '@/types/acceso'
import type { Usuario } from '@/types/usuario'

export interface CierreSesion {
  motivo: MotivoCierre
  /** Email of the user whose session closed (to prefill "Reanudar sesión"). */
  correo: string
}

export interface SesionContextValue {
  /** null = not authenticated. */
  usuario: Usuario | null
  /** Why the last session ended; null after a new login or before any session. */
  ultimoCierre: CierreSesion | null
  /** The session lives only in this browser tab; there is no "keep me signed in" (RNF-05). */
  iniciarSesion: (respuesta: RespuestaIngreso) => void
  cerrarSesion: (motivo?: MotivoCierre) => void
}

export const SesionContext = createContext<SesionContextValue | null>(null)
