/*
 * ParesPage — Pares evaluadores (/:revista/pares): la base de pares, que es común a las dos revistas, con
 * búsqueda por área temática y universidad, y la disponibilidad de cada par. Los pares se asignan desde la ficha
 * del artículo (Pares y evaluación).
 */
import { useState } from 'react'
import { FiltrosPares } from '../components/FiltrosPares'
import { ParModal } from '../components/ParModal'
import { TablaPares } from '../components/TablaPares'
import { useFiltrosPares } from '../hooks/useFiltrosPares'
import { usePares } from '../hooks/usePares'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Paginacion } from '@/components/common/Paginacion'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'

export function ParesPage() {
  const { filtros, cambiar, hayFiltros } = useFiltrosPares()
  const lista = usePares(filtros)
  const puedeRegistrar = usePermiso('registrar-datos')
  const [registrando, setRegistrando] = useState(false)
  const total = lista.data?.total ?? 0
  const base = lista.data?.totalBase ?? 0

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Pares evaluadores"
        acciones={
          <>
            {puedeRegistrar && (
              <Boton tamano="sm" onClick={() => setRegistrando(true)}>
                Registrar par
              </Boton>
            )}
            <EnlaceBoton variante="neutro" tamano="sm" to="/pares/bloqueados">
              Bloqueados
            </EnlaceBoton>
          </>
        }
      >
        <p className="text-cuerpo-13 text-texto-secundario">
          {lista.data ? `${base} pares · base común de las dos revistas` : ' '}
        </p>
      </EncabezadoPagina>
      <FiltrosPares filtros={filtros} onCambio={cambiar} />

      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="los pares evaluadores"
      >
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {lista.data
            ? `${total} ${total === 1 ? 'par' : 'pares'}${hayFiltros ? ' con estos filtros' : ''}`
            : ' '}
        </p>
        <TablaPares
          pares={lista.data?.items ?? []}
          cargando={lista.isPending}
          vacio={
            hayFiltros || filtros.estado !== 'disponibles'
              ? 'No se encontraron pares evaluadores con los filtros seleccionados.'
              : 'Aún no hay pares evaluadores registrados.'
          }
        />
        {lista.data && total > 0 && (
          <Paginacion
            pagina={filtros.pagina}
            porPagina={filtros.porPagina}
            total={total}
            onCambiar={(pagina) => cambiar({ pagina })}
          />
        )}
      </EstadoConsulta>

      <ParModal abierto={registrando} onCerrar={() => setRegistrando(false)} />
    </section>
  )
}
