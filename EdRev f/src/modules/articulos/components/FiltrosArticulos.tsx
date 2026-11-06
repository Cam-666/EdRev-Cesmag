/*
 * FiltrosArticulos — search, status, publication number and postulation date range.
 * Covers: RF-35, HU-26 (filters by status, publication number and date range).
 * The Figma "Año" filter is replaced by the date range, as HU-26 requires.
 */
import { useEffect, useState } from 'react'
import { ESTADOS_FILTRO } from '../config/listas'
import { usePublicaciones } from '../hooks/useArticulos'
import { Buscador } from '@/components/common/Buscador'
import { CampoTexto } from '@/components/common/CampoTexto'
import { DEFINICIONES_ESTADO } from '@/components/common/DistintivoEstado'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { useRetardo } from '@/lib/useRetardo'
import type { FiltrosArticulos as Filtros } from '@/types/articulo'

const TODOS = 'todos'

export interface FiltrosArticulosProps {
  filtros: Filtros
  onCambio: (cambios: Partial<Omit<Filtros, 'porPagina'>>) => void
}

export function FiltrosArticulos({ filtros, onCambio }: FiltrosArticulosProps) {
  const publicaciones = usePublicaciones()
  const [texto, setTexto] = useState(filtros.q ?? '')
  const textoRetardado = useRetardo(texto, 300)

  useEffect(() => {
    if (textoRetardado.trim() !== (filtros.q ?? '')) onCambio({ q: textoRetardado.trim() })
    // Only react to the debounced text; the other inputs apply immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoRetardado])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Buscador
        className="xl:col-span-2 xl:self-end"
        etiqueta="Buscar por título o número de OJS"
        placeholder="Buscar por título o número de OJS"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <ListaDesplegable
        etiqueta="Estado"
        valor={filtros.estado ?? TODOS}
        onCambio={(v) => onCambio({ estado: v === TODOS ? undefined : (v as Filtros['estado']) })}
        opciones={[
          { valor: TODOS, etiqueta: 'Todos' },
          ...ESTADOS_FILTRO.map((e) => ({ valor: e, etiqueta: DEFINICIONES_ESTADO[e].texto })),
        ]}
      />
      <ListaDesplegable
        etiqueta="Publicación"
        valor={filtros.publicacion ?? TODOS}
        onCambio={(v) => onCambio({ publicacion: v === TODOS ? undefined : v })}
        opciones={[
          { valor: TODOS, etiqueta: 'Todas' },
          ...(publicaciones.data ?? []).map((p) => ({ valor: p, etiqueta: p })),
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <CampoTexto
          etiqueta="Postulado desde"
          type="date"
          value={filtros.desde ?? ''}
          max={filtros.hasta}
          onChange={(e) => onCambio({ desde: e.target.value })}
        />
        <CampoTexto
          etiqueta="Hasta"
          type="date"
          value={filtros.hasta ?? ''}
          min={filtros.desde}
          onChange={(e) => onCambio({ hasta: e.target.value })}
        />
      </div>
    </div>
  )
}
