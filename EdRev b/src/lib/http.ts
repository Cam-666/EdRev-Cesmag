/*
 * http — errors with an HTTP status and a message for the user ({ mensaje }, the same body the
 * frontend already reads), and the journal of the URL (reep = 1, ire = 2; D9).
 */
export class ErrorHttp extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    readonly cuerpo?: Record<string, unknown>,
  ) {
    super(mensaje)
  }
}

export const REVISTAS = { reep: 1, ire: 2 } as const
export type Sigla = keyof typeof REVISTAS

export function idRevista(sigla: unknown): number {
  if (sigla !== 'reep' && sigla !== 'ire') throw new ErrorHttp(404, 'Revista no encontrada')
  return REVISTAS[sigla]
}

export function siglaDe(id: number): Sigla {
  return id === 1 ? 'reep' : 'ire'
}

/** Positive integer id from the URL, or 404. */
export function idNumerico(valor: unknown, que = 'Registro'): number {
  const n = Number(valor)
  if (!Number.isInteger(n) || n <= 0) throw new ErrorHttp(404, `${que} no encontrado`)
  return n
}

export function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
