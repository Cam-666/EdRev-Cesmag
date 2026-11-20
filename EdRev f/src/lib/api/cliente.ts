/*
 * cliente — la única puerta HTTP de la interfaz. Los módulos lo llaman desde sus propios services/; ningún
 * componente usa fetch directamente. En desarrollo con datos de ejemplo, MSW responde estas llamadas; con el
 * backend real basta apagar MSW. El encabezado de autenticación (JWT) se agrega solo aquí.
 */

export class ErrorApi extends Error {
  readonly estado: number
  /** Cuerpo JSON de la respuesta de error, cuando lo hay. */
  readonly cuerpo: unknown

  constructor(estado: number, mensaje: string, cuerpo?: unknown) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.cuerpo = cuerpo
  }
}

let token: string | null = null

let alExpirar: (() => void) | null = null

/** Registra qué hacer cuando el backend rechaza el token de sesión (vencido o inválido). */
export function alExpirarSesion(manejador: (() => void) | null): void {
  alExpirar = manejador
}

/** Un 401 con un token en uso significa que la sesión terminó; sin token es solo un ingreso con datos incorrectos. */
function revisarExpiracion(estado: number): void {
  if (estado === 401 && token) alExpirar?.()
}

/** Define el token que se envía en cada petición (null = sin sesión). Solo lo llama la capa de sesión. */
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

/** Un archivo de la API (por ejemplo una constancia en PDF), con el mismo encabezado de sesión. */
export async function solicitarArchivo(ruta: string, init: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  const respuesta = await fetch(`${baseApi()}${ruta}`, { ...init, headers })
  if (!respuesta.ok) {
    revisarExpiracion(respuesta.status)
    throw new ErrorApi(respuesta.status, respuesta.statusText, await leerJson(respuesta))
  }
  return respuesta.blob()
}

export async function solicitar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  // Un cuerpo FormData (subida de archivo) define solo su separador multipart.
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const respuesta = await fetch(`${baseApi()}${ruta}`, { ...init, headers })
  if (!respuesta.ok) {
    revisarExpiracion(respuesta.status)
    throw new ErrorApi(respuesta.status, respuesta.statusText, await leerJson(respuesta))
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
