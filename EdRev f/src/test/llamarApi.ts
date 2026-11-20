/*
 * llamarApi — ayuda de pruebas: llama directamente a la API simulada (a través de MSW) como un usuario dado, para
 * probar las reglas del backend simulado sin dibujar ninguna pantalla.
 */
import { ADMINISTRADORA } from '@/mocks/seed/usuarios'
import { tokenMock } from '@/mocks/token'
import type { Usuario } from '@/types/usuario'

const BASE = 'http://localhost/api'

export interface OpcionesLlamada {
  usuario?: Usuario | null
  metodo?: string
  cuerpo?: unknown
  /** Un cuerpo que se envía tal cual (por ejemplo una subida multipart), con su propio tipo de contenido. */
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

/** Un cuerpo multipart/form-data con un campo de archivo, como lo envía un navegador al subir un archivo. */
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
