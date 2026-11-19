/*
 * reglas — business rules of the articles module, free of React so they are easy to test.
 * Covers: RF-05 (warning above 15 %, never blocking), RF-21 (tiebreaker only when the first two
 * concepts contradict each other).
 */
import { UMBRAL_COINCIDENCIAS } from './listas'
import type { ConceptoPar, EstadoAsignacion } from '@/types/par'

/** RF-05: only the matches percentage triggers the warning; the AI percentage never does. */
export function superaUmbral(coincidencias: number): boolean {
  return coincidencias > UMBRAL_COINCIDENCIAS
}

/** RF-21: "publicable" against "no publicable" is a contradiction; anything else is not. */
export function conceptosContradictorios(a: ConceptoPar | null, b: ConceptoPar | null): boolean {
  if (!a || !b) return false
  return (
    (a === 'publicable' && b === 'no-publicable') || (a === 'no-publicable' && b === 'publicable')
  )
}

/**
 * RF-19: up to three evaluators. A peer who did not accept stays listed but frees the slot, so the
 * process goes on with whoever accepted while other peers are invited.
 */
export function paresVigentes<T extends { estado: EstadoAsignacion }>(asignaciones: T[]): T[] {
  return asignaciones.filter((a) => a.estado === 'acepto' || a.estado === 'entrego')
}

export function aNumero(texto: string): number {
  return Number(texto.trim().replace(',', '.'))
}
