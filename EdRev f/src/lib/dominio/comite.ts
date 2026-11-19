/*
 * comite — rules of the initial committee review shared by the screens and the mock API, so
 * what the page offers and what the server accepts never disagree.
 * - Rounds are registered while the article is being screened (Postulado / En revisión) and has
 *   no peers; there is no limit of rounds (RF-06).
 * - Only «Aprobado» in the most recent round enables the assignment of peers (RF-19), and only
 *   while the article is «En revisión» or «En evaluación». An article taken up again after being
 *   archived comes back as «Postulado»: it must go through the committee again, so it can register
 *   a new round even though it had peers, and cannot be assigned peers until that round approves it.
 * - The committee chooses the result of a round; the page only suggests one from the
 *   anti-plagiarism report and the observations (see resultadoSugerido). No result closes the process.
 * - The article can change journal at any stage, as many times as needed (RF-02, RF-07).
 * Covers: RF-02, RF-06, RF-07, RF-19, HU-03, HU-04, HU-13.
 */
import type { EstadoArticulo, ResultadoRonda, RondaComite } from '@/types/articulo'

interface ArticuloEnComite {
  estado: EstadoArticulo
  rondasComite: RondaComite[]
}

const EN_COMITE: readonly EstadoArticulo[] = ['postulado', 'en-revision']

/**
 * The result the page suggests for a round of the initial committee review (RF-06); the decision is
 * the committee's. Matches above the limit → Rechazado (not publishable; the article still stays in
 * review); within the limit and no observations →
 * Aprobado (publishable); within the limit with observations → Requiere ajustes (publishable with
 * observations: the author corrects and another round is registered). The AI percentage never
 * decides.
 */
export function resultadoSugerido(
  coincidencias: number,
  observacion: string,
  umbral: number,
): ResultadoRonda {
  if (coincidencias > umbral) return 'rechazado'
  return observacion.trim() ? 'ajustes' : 'aprobado'
}

export function ultimaRonda(articulo: ArticuloEnComite): RondaComite | null {
  return articulo.rondasComite[articulo.rondasComite.length - 1] ?? null
}

/** An article «Postulado» that already has rounds was taken up again and must be reviewed anew. */
export function requiereNuevaRevision(articulo: ArticuloEnComite): boolean {
  return articulo.estado === 'postulado' && articulo.rondasComite.length > 0
}

export function puedeRegistrarRonda(articulo: ArticuloEnComite, tienePares: boolean): boolean {
  return EN_COMITE.includes(articulo.estado) && (!tienePares || requiereNuevaRevision(articulo))
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
