/*
 * useFiltrosPares — los filtros del listado de pares (área, universidad, disponibilidad, búsqueda) viven en la
 * cadena de consulta de la URL, junto con el artículo en el que se trabaja (`articulo`), así los enlaces
 * «Asignar» conservan su contexto.
 */
import { useSearchParams } from 'react-router-dom'
import type { FiltroEstadoPares, FiltrosPares } from '../services/paresService'

export const POR_PAGINA_PARES = 10

type Cambios = Partial<Omit<FiltrosPares, 'porPagina'>>

function esEstado(valor: string | null): valor is FiltroEstadoPares {
  return valor === 'disponibles' || valor === 'bloqueados' || valor === 'todos'
}

export function useFiltrosPares() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado')

  const filtros: FiltrosPares = {
    q: params.get('q') ?? undefined,
    area: params.get('area') ?? undefined,
    universidad: params.get('universidad') ?? undefined,
    estado: esEstado(estado) ? estado : 'disponibles',
    articulo: params.get('articulo') ?? undefined,
    pagina: Math.max(1, Number(params.get('pagina') ?? 1) || 1),
    porPagina: POR_PAGINA_PARES,
  }

  function cambiar(cambios: Cambios) {
    const siguiente = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === '') siguiente.delete(clave)
      else siguiente.set(clave, String(valor))
    }
    if (!('pagina' in cambios)) siguiente.delete('pagina')
    setParams(siguiente, { replace: true })
  }

  const hayFiltros = Boolean(filtros.q || filtros.area || filtros.universidad)
  return { filtros, cambiar, hayFiltros }
}
