/*
 * ArticulosPage — Artículos (/:revista/articulos): the journal's article list with filters by
 * status, publication number and postulation date range, search and pagination.
 * Covers: RF-35, RF-02, RNF-01, HU-26.
 */
import { FiltrosArticulos } from '../components/FiltrosArticulos'
import { TablaArticulos } from '../components/TablaArticulos'
import { useArticulos } from '../hooks/useArticulos'
import { useFiltrosArticulos } from '../hooks/useFiltrosArticulos'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Paginacion } from '@/components/common/Paginacion'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { useRevista } from '@/lib/revista/useRevista'

export function ArticulosPage() {
  const { revista } = useRevista()
  const { filtros, cambiar, hayFiltros } = useFiltrosArticulos()
  const lista = useArticulos(filtros)
  const puedeRegistrar = usePermiso('registrar-datos')
  const total = lista.data?.total ?? 0

  return (
    <section className="flex flex-col gap-4">
      {puedeRegistrar && (
        <AccionesEncabezado>
          <EnlaceBoton variante="neutro" tamano="sm" to={`/${revista}/articulos/nuevo`}>
            Registrar artículo
          </EnlaceBoton>
        </AccionesEncabezado>
      )}
      <header>
        <h1 className="text-titulo-24">Artículos</h1>
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {lista.data ? `${total} ${hayFiltros ? 'resultados' : 'registrados'}` : ' '}
        </p>
      </header>

      <FiltrosArticulos filtros={filtros} onCambio={cambiar} />

      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="el listado de artículos"
      >
        <TablaArticulos
          revista={revista}
          articulos={lista.data?.items ?? []}
          cargando={lista.isPending}
          vacio={
            hayFiltros
              ? 'Ningún artículo coincide con los filtros.'
              : 'Aún no hay artículos registrados en esta revista.'
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
    </section>
  )
}
