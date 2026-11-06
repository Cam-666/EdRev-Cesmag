/*
 * token — mock bearer token that carries the user id, so the mock API knows who acts (the real
 * backend reads it from the JWT). Only used while MSW is on.
 */
const PREFIJO = 'mock-jwt:'

export function tokenMock(usuarioId: string): string {
  return `${PREFIJO}${usuarioId}`
}

export function idUsuarioDeAutorizacion(cabecera: string | null): string | null {
  if (!cabecera?.startsWith(`Bearer ${PREFIJO}`)) return null
  return cabecera.slice(`Bearer ${PREFIJO}`.length) || null
}
