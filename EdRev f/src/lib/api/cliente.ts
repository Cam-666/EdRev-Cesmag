/*
 * cliente — the single HTTP entry point of the frontend. Modules call it from their own
 * services/; no component talks to fetch directly. MSW answers these calls in this stage; with
 * the real backend only MSW is turned off. Authentication (JWT header) is attached here only.
 */

export class ErrorApi extends Error {
  readonly estado: number
  /** Parsed JSON body of the error response, when there is one. */
  readonly cuerpo: unknown

  constructor(estado: number, mensaje: string, cuerpo?: unknown) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.cuerpo = cuerpo
  }
}

let token: string | null = null

/** Sets the bearer token sent with every request (null = signed out). Called only by the session layer. */
export function establecerToken(nuevo: string | null): void {
  token = nuevo
}

function baseApi(): string {
  const base: unknown = import.meta.env.VITE_API_URL
  return typeof base === 'string' && base !== '' ? base : '/api'
}

async function leerJson(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json()
  } catch {
    return undefined
  }
}

/** A file of the API (e.g. a constancia in PDF), with the same session header. */
export async function solicitarArchivo(ruta: string): Promise<Blob> {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const respuesta = await fetch(`${baseApi()}${ruta}`, { headers })
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, respuesta.statusText, await leerJson(respuesta))
  }
  return respuesta.blob()
}

export async function solicitar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  // A FormData body (file upload) sets its own multipart boundary.
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const respuesta = await fetch(`${baseApi()}${ruta}`, { ...init, headers })
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, respuesta.statusText, await leerJson(respuesta))
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
