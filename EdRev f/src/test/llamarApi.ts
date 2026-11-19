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
  /** A body sent as is (e.g. a multipart upload), with its own content type. */
  cuerpoCrudo?: { cuerpo: string; tipo: string }
}

export function llamar(
  ruta: string,
  { usuario = ADMINISTRADORA, metodo = 'GET', cuerpo, cuerpoCrudo }: OpcionesLlamada = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': cuerpoCrudo?.tipo ?? 'application/json',
  }
  if (usuario) headers.Authorization = `Bearer ${tokenMock(usuario.id)}`
  return fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpoCrudo?.cuerpo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)),
  })
}

export async function json<T>(respuesta: Response): Promise<T> {
  return (await respuesta.json()) as T
}

const CRLF = String.fromCharCode(13, 10)

/** A multipart/form-data body with one file field, as a browser sends an upload. */
export function multipart(campo: string, nombre: string, tipo: string, contenido: string) {
  const limite = 'limite-de-prueba'
  return {
    tipo: `multipart/form-data; boundary=${limite}`,
    cuerpo: [
      `--${limite}`,
      `Content-Disposition: form-data; name="${campo}"; filename="${nombre}"`,
      `Content-Type: ${tipo}`,
      '',
      contenido,
      `--${limite}--`,
      '',
    ].join(CRLF),
  }
}
