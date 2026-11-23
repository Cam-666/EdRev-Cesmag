/*
 * useFiltrosCorreos — los filtros del registro de correos (tipo, resultado, a quién se escribió) viven en la cadena de consulta de la
 * URL, así una vista filtrada se puede enlazar y recargar.
 */
import { useSearchParams } from 'react-router-dom'
import { ESTADOS_CORREO, TIPOS_CORREO } from '../config/listas'
import type { FiltrosCorreos } from '../services/correosService'
import type { EstadoCorreo, TipoCorreo } from '@/types/historial'

export const POR_PAGINA_CORREOS = 10

const TIPOS: TipoCorreo[] = TIPOS_CORREO
const ESTADOS: EstadoCorreo[] = ESTADOS_CORREO

export function useFiltrosCorreos() {
  const [params, setParams] = useSearchParams()
  const tipo = params.get('tipo')
  const estado = params.get('estado')
  const para = params.get('para')

  const filtros: FiltrosCorreos = {
    tipo: TIPOS.find((t) => t === tipo),
    estado: ESTADOS.find((e) => e === estado),
    para: para === 'par' || para === 'autor' ? para : undefined,
    pagina: Math.max(1, Number(params.get('pagina') ?? 1) || 1),
    porPagina: POR_PAGINA_CORREOS,
  }

  function cambiar(cambios: Partial<Omit<FiltrosCorreos, 'porPagina'>>) {
    const siguiente = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || String(valor) === '') siguiente.delete(clave)
      else siguiente.set(clave, String(valor))
    }
    if (!('pagina' in cambios)) siguiente.delete('pagina')
    setParams(siguiente, { replace: true })
  }

  return { filtros, cambiar, hayFiltros: Boolean(filtros.tipo || filtros.estado || filtros.para) }
}
