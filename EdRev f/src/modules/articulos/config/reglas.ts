/*
 * reglas — reglas de negocio del módulo de artículos, sin React para que sean fáciles de probar: el aviso sobre
 * 15 % (nunca bloquea) y el par de desempate (solo cuando los dos primeros conceptos se contradicen).
 */
import { UMBRAL_COINCIDENCIAS } from './listas'
import type { ConceptoPar, EstadoAsignacion } from '@/types/par'

/** Solo el porcentaje de coincidencias dispara el aviso; el de IA nunca. */
export function superaUmbral(coincidencias: number): boolean {
  return coincidencias > UMBRAL_COINCIDENCIAS
}

/** «publicable» contra «no publicable» es una contradicción; cualquier otra combinación no lo es. */
export function conceptosContradictorios(a: ConceptoPar | null, b: ConceptoPar | null): boolean {
  if (!a || !b) return false
  return (
    (a === 'publicable' && b === 'no-publicable') || (a === 'no-publicable' && b === 'publicable')
  )
}

/**
 * Hasta tres evaluadores. Un par que no aceptó sigue en la lista pero libera el lugar, así el proceso continúa con
 * quien aceptó mientras se invita a otros pares.
 */
export function paresVigentes<T extends { estado: EstadoAsignacion }>(asignaciones: T[]): T[] {
  return asignaciones.filter((a) => a.estado === 'acepto' || a.estado === 'entrego')
}

export function aNumero(texto: string): number {
  return Number(texto.trim().replace(',', '.'))
}
