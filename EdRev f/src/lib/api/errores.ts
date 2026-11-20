/*
 * errores — convierte una falla de la API en una frase para el usuario: el mensaje del propio servidor cuando lo
 * envió (los 409 y 422 explican qué regla se incumplió) y, si no, el mensaje de respaldo que se indique.
 */
import { ErrorApi } from './cliente'

export function mensajeDeApi(error: unknown, porDefecto: string): string {
  if (error instanceof ErrorApi && typeof error.cuerpo === 'object' && error.cuerpo !== null) {
    const mensaje = (error.cuerpo as { mensaje?: unknown }).mensaje
    if (typeof mensaje === 'string' && mensaje !== '') return mensaje
  }
  return porDefecto
}
