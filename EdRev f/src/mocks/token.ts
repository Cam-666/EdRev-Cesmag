/*
 * token — token portador simulado que lleva el id del usuario, para que la API simulada sepa quién actúa (el
 * backend real lo lee del JWT). Solo se usa mientras MSW está encendido.
 */
const PREFIJO = 'mock-jwt:'

export function tokenMock(usuarioId: string): string {
  return `${PREFIJO}${usuarioId}`
}

export function idUsuarioDeAutorizacion(cabecera: string | null): string | null {
  if (!cabecera?.startsWith(`Bearer ${PREFIJO}`)) return null
  return cabecera.slice(`Bearer ${PREFIJO}`.length) || null
}
