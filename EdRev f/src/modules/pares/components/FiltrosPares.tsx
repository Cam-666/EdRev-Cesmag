/*
 * FiltrosPares — filtros de la base de pares: área temática de texto libre con las áreas registradas como
 * sugerencias y etiquetas clicables, universidad, disponibilidad y búsqueda por nombre.
 */
import { useEffect, useState } from 'react'
import { useAreas, useUniversidades } from '../hooks/usePares'
import type { FiltroEstadoPares, FiltrosPares as Filtros } from '../services/paresService'
import { Buscador } from '@/components/common/Buscador'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ChipAreaTematica } from '@/components/common/ChipAreaTematica'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { useRetardo } from '@/lib/useRetardo'

const TODAS = 'todas'

export interface FiltrosParesProps {
  filtros: Filtros
  onCambio: (cambios: Partial<Omit<Filtros, 'porPagina'>>) => void
}

export function FiltrosPares({ filtros, onCambio }: FiltrosParesProps) {
  const areas = useAreas()
  const universidades = useUniversidades()
  const [texto, setTexto] = useState(filtros.q ?? '')
  const [area, setArea] = useState(filtros.area ?? '')
  const textoRetardado = useRetardo(texto, 300)
  const areaRetardada = useRetardo(area, 300)

  useEffect(() => {
    if (textoRetardado.trim() !== (filtros.q ?? '')) onCambio({ q: textoRetardado.trim() })
    // Only react to the debounced text; the selects apply immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoRetardado])

  useEffect(() => {
    if (areaRetardada.trim() !== (filtros.area ?? '')) onCambio({ area: areaRetardada.trim() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaRetardada])

  function elegirArea(valor: string) {
    const nueva = area === valor ? '' : valor
    setArea(nueva)
    onCambio({ area: nueva })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CampoTexto
          etiqueta="Área temática"
          list="areas-registradas"
          autoComplete="off"
          placeholder="Escriba un área"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
        <datalist id="areas-registradas">
          {(areas.data ?? []).map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <ListaDesplegable
          etiqueta="Universidad"
          valor={filtros.universidad ?? TODAS}
          onCambio={(v) => onCambio({ universidad: v === TODAS ? undefined : v })}
          opciones={[
            { valor: TODAS, etiqueta: 'Todas' },
            ...(universidades.data ?? []).map((u) => ({ valor: u, etiqueta: u })),
          ]}
        />
        <ListaDesplegable
          etiqueta="Estado"
          valor={filtros.estado}
          onCambio={(v) => onCambio({ estado: v as FiltroEstadoPares })}
          opciones={[
            { valor: 'disponibles', etiqueta: 'Disponibles' },
            { valor: 'bloqueados', etiqueta: 'Bloqueados' },
            { valor: 'todos', etiqueta: 'Todos' },
          ]}
        />
        <Buscador
          className="xl:self-end"
          etiqueta="Buscar por nombre o correo"
          placeholder="Buscar por nombre o correo"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {(areas.data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <p id="titulo-areas" className="text-cuerpo-13 text-texto-secundario">
            Áreas registradas:
          </p>
          <ul aria-labelledby="titulo-areas" className="flex flex-wrap gap-2">
            {(areas.data ?? []).map((a) => (
              <li key={a}>
                <ChipAreaTematica
                  area={a}
                  seleccionada={filtros.area === a}
                  onSeleccionar={() => elegirArea(a)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
