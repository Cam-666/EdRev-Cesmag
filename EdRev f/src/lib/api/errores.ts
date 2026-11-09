/*
 * errores — turns an API failure into a sentence for the user: the server's own message when it
 * sent one (409/422 explain what rule was broken), otherwise the given fallback.
 */
import { ErrorApi } from './cliente'

export function mensajeDeApi(error: unknown, porDefecto: string): string {
  if (error instanceof ErrorApi && typeof error.cuerpo === 'object' && error.cuerpo !== null) {
    const mensaje = (error.cuerpo as { mensaje?: unknown }).mensaje
    if (typeof mensaje === 'string' && mensaje !== '') return mensaje
  }
  return porDefecto
}
