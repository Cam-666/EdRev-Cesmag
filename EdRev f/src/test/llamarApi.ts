/*
 * llamarApi — test helper: calls the mock API directly (through MSW) as a given user, to test
 * the rules of the simulated backend without rendering any screen.
 */
import { ADMINISTRADORA } from '@/mocks/seed/usuarios'
import { tokenMock } from '@/mocks/token'
import type { Usuario } from '@/types/usuario'

const BASE = 'http://localhost/api'

export interface OpcionesLlamada {
  usuario?: Usuario | null
  metodo?: string
  cuerpo?: unknown
}

export function llamar(
  ruta: string,
  { usuario = ADMINISTRADORA, metodo = 'GET', cuerpo }: OpcionesLlamada = {},
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (usuario) headers.Authorization = `Bearer ${tokenMock(usuario.id)}`
  return fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}

export async function json<T>(respuesta: Response): Promise<T> {
  return (await respuesta.json()) as T
}
