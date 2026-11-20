import { createContext } from 'react'
import type { MotivoCierre, RespuestaIngreso } from '@/types/acceso'
import type { Usuario } from '@/types/usuario'

export interface CierreSesion {
  motivo: MotivoCierre
  /** Correo del usuario cuya sesión se cerró (para llenar «Reanudar sesión»). */
  correo: string
}

export interface SesionContextValue {
  /** null = sin autenticar. */
  usuario: Usuario | null
  /** Por qué terminó la última sesión; null después de un nuevo ingreso o antes de cualquier sesión. */
  ultimoCierre: CierreSesion | null
  /** La sesión vive solo en esta pestaña del navegador; no existe «mantener la sesión iniciada». */
  iniciarSesion: (respuesta: RespuestaIngreso) => void
  cerrarSesion: (motivo?: MotivoCierre) => void
}

export const SesionContext = createContext<SesionContextValue | null>(null)
