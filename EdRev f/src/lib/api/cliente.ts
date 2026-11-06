/*
 * cliente — the single HTTP entry point of the frontend. Modules call it from their own
 * services/; no component talks to fetch directly. MSW answers these calls in this stage; with
 * the real backend only MSW is turned off. Authentication (JWT header) is attached here only.
 */

export class ErrorApi extends Error {
  readonly estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

type ProveedorToken = () => string | null

let proveedorToken: ProveedorToken = () => null

/** Registers where the bearer token comes from (set once by the session layer). */
export function configurarProveedorToken(proveedor: ProveedorToken): void {
  proveedorToken = proveedor
}

export async function solicitar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  const token = proveedorToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const respuesta = await fetch(`/api${ruta}`, { ...init, headers })
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, respuesta.statusText)
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
