/*
 * comite — reglas de la revisión inicial del comité que comparten las pantallas y la API simulada, para que lo
 * que ofrece la página y lo que acepta el servidor nunca se contradigan.
 * - Las rondas se registran mientras el artículo se está revisando (Postulado / En revisión) y no tiene pares;
 *   no hay límite de rondas.
 * - Solo «Aprobado» en la ronda más reciente permite asignar pares, y solo mientras el artículo está «En
 *   revisión» o «En evaluación». Un artículo retomado tras archivarse vuelve como «Postulado»: debe pasar de
 *   nuevo por el comité, así que puede registrar una ronda aunque ya tuviera pares, y no se le asignan pares
 *   hasta que esa ronda lo apruebe.
 * - El comité elige el resultado de una ronda; la página solo sugiere uno a partir del reporte antiplagio y de
 *   las observaciones (ver resultadoSugerido). Ningún resultado cierra el proceso.
 * - El artículo puede cambiar de revista en cualquier etapa, las veces que haga falta.
 */
import type { EstadoArticulo, ResultadoRonda, RondaComite } from '@/types/articulo'

interface ArticuloEnComite {
  estado: EstadoArticulo
  rondasComite: RondaComite[]
}

const EN_COMITE: readonly EstadoArticulo[] = ['postulado', 'en-revision']

/**
 * El resultado que la página sugiere para una ronda de la revisión inicial; la decisión es del comité.
 * Coincidencias sobre el límite → Rechazado (no publicable; el artículo igual sigue en revisión); dentro del
 * límite y sin observaciones → Aprobado (publicable); dentro del límite con observaciones → Requiere ajustes
 * (publicable con observaciones: el autor corrige y se registra otra ronda). El porcentaje de IA nunca decide.
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

/** Un artículo «Postulado» que ya tiene rondas fue retomado y debe revisarse de nuevo. */
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
