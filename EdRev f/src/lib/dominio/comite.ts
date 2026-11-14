/*
 * comite — rules of the initial committee review shared by the screens and the mock API, so
 * what the page offers and what the server accepts never disagree.
 * - Rounds are registered while the article is being screened (Postulado / En revisión) and has
 *   no peers; there is no limit of rounds (RF-06).
 * - Only «Aprobado» in the most recent round enables the assignment of peers (RF-19).
 * - The article can change journal at any stage, as many times as needed (RF-02, RF-07).
 * Covers: RF-02, RF-06, RF-07, RF-19, HU-03, HU-04, HU-13.
 */
import type { EstadoArticulo, RondaComite } from '@/types/articulo'

interface ArticuloEnComite {
  estado: EstadoArticulo
  rondasComite: RondaComite[]
}

const EN_COMITE: readonly EstadoArticulo[] = ['postulado', 'en-revision']

export function ultimaRonda(articulo: ArticuloEnComite): RondaComite | null {
  return articulo.rondasComite[articulo.rondasComite.length - 1] ?? null
}

export function puedeRegistrarRonda(articulo: ArticuloEnComite, tienePares: boolean): boolean {
  return EN_COMITE.includes(articulo.estado) && !tienePares
}

export function aprobadoPorComite(articulo: ArticuloEnComite): boolean {
  return ultimaRonda(articulo)?.resultado === 'aprobado'
}

export function puedeAsignarPares(articulo: ArticuloEnComite): boolean {
  return (
    aprobadoPorComite(articulo) &&
    (articulo.estado === 'en-revision' || articulo.estado === 'en-evaluacion')
  )
}
