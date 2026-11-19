/*
 * useFiltrosArticulos — list filters live in the URL query string, so a filtered list can be
 * linked, reloaded and used with the browser's back button. Covers: RF-35, HU-26.
 */
import { useSearchParams } from 'react-router-dom'
import { ESTADOS_FILTRO, POR_PAGINA } from '../config/listas'
import type { EstadoArticulo, FiltrosArticulos } from '@/types/articulo'

type Cambios = Partial<Omit<FiltrosArticulos, 'porPagina'>>

function esEstado(valor: string | null): valor is EstadoArticulo {
  return valor !== null && (ESTADOS_FILTRO as string[]).includes(valor)
}

export function useFiltrosArticulos() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado')

  const filtros: FiltrosArticulos = {
    q: params.get('q') ?? undefined,
    estado: esEstado(estado) ? estado : undefined,
    publicacion: params.get('publicacion') ?? undefined,
    anio: Number(params.get('anio')) > 0 ? Number(params.get('anio')) : undefined,
    desde: params.get('desde') ?? undefined,
    hasta: params.get('hasta') ?? undefined,
    sinResponder: params.get('sinResponder') === '1' ? true : undefined,
    pagina: Math.max(1, Number(params.get('pagina') ?? 1) || 1),
    porPagina: POR_PAGINA,
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

  const hayFiltros = Boolean(
    filtros.q ||
    filtros.estado ||
    filtros.publicacion ||
    filtros.anio ||
    filtros.desde ||
    filtros.hasta ||
    filtros.sinResponder,
  )

  return { filtros, cambiar, hayFiltros }
}
