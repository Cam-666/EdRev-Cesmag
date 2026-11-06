/*
 * accesoService — HTTP calls of the access module. Components never call fetch directly.
 * Covers: HU-28, RF-39.
 */
import { solicitar } from '@/lib/api/cliente'
import type { CredencialesIngreso, RespuestaIngreso } from '@/types/acceso'

export function iniciarSesionApi(credenciales: CredencialesIngreso): Promise<RespuestaIngreso> {
  return solicitar<RespuestaIngreso>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credenciales),
  })
}

export async function solicitarRecuperacionApi(correo: string): Promise<void> {
  await solicitar<unknown>('/auth/recuperar', {
    method: 'POST',
    body: JSON.stringify({ correo }),
  })
}
