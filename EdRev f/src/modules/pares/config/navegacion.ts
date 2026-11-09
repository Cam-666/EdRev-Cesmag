/*
 * navegacion — what the assignment screen hands to the article sheet through the router state, so
 * the sheet can confirm the invitation (or warn that it bounced) right after assigning.
 * Covers: RF-24, RF-27, HU-17, HU-18.
 */
import type { ResultadoAsignacion } from '@/types/par'

export interface EstadoTrasAsignar {
  envio: {
    parId: string
    nombre: string
    destinatario: string
    estado: ResultadoAsignacion['correo']['estado']
  }
}

export function esEstadoTrasAsignar(valor: unknown): valor is EstadoTrasAsignar {
  if (typeof valor !== 'object' || valor === null || !('envio' in valor)) return false
  const envio = (valor as { envio: unknown }).envio
  return typeof envio === 'object' && envio !== null && 'destinatario' in envio && 'estado' in envio
}
