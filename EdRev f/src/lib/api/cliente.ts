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

type ProveedorToken = () => string | null

let proveedorToken: ProveedorToken = () => null

/** Registers where the bearer token comes from (set once by the session layer). */
export function configurarProveedorToken(proveedor: ProveedorToken): void {
  proveedorToken = proveedor
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

export async function solicitar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  const token = proveedorToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const respuesta = await fetch(`${baseApi()}${ruta}`, { ...init, headers })
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, respuesta.statusText, await leerJson(respuesta))
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
