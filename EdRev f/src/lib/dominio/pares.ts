/*
 * pares — rules about the places of the peers of an article, shared by the screens and the mock API.
 * - Only peers who accepted or delivered take one of the three places; those who decline or do
 *   not answer do not (RF-19).
 * - A peer is available when it is not blocked and has no evaluation in progress (invited or
 *   accepted) in its journal (RF-19, HU-13).
 * Covers: RF-19, RF-21, HU-13.
 */
import type { EstadoAsignacion } from '@/types/par'

export const MAX_PARES_ACTIVOS = 3

export function ocupaCupo(a: { estado: EstadoAsignacion }): boolean {
  return a.estado === 'acepto' || a.estado === 'entrego'
}

export function enCurso(a: { estado: EstadoAsignacion }): boolean {
  return a.estado === 'invitado' || a.estado === 'segundo-intento' || a.estado === 'acepto'
}
