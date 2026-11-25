/*
 * ArticulosPage — Artículos (/:revista/articulos): el listado de artículos de la revista con filtros por estado,
 * número de publicación y rango de fechas de postulación, búsqueda y paginación.
 */
import { FiltrosArticulos } from '../components/FiltrosArticulos'
import { TablaArticulos } from '../components/TablaArticulos'
import { useArticulos } from '../hooks/useArticulos'
import { useFiltrosArticulos } from '../hooks/useFiltrosArticulos'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Paginacion } from '@/components/common/Paginacion'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { useRevista } from '@/lib/revista/useRevista'

export function ArticulosPage() {
  const { revista } = useRevista()
  const { filtros, cambiar, hayFiltros } = useFiltrosArticulos()
  const lista = useArticulos(filtros)
  const puedeRegistrar = usePermiso('registrar-datos')
  const total = lista.data?.total ?? 0

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Artículos"
        acciones={
          puedeRegistrar && (
            <EnlaceBoton tamano="sm" to={`/${revista}/articulos/nuevo`}>
              Registrar artículo
            </EnlaceBoton>
          )
        }
      >
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {lista.data ? `${total} ${hayFiltros ? 'resultados' : 'registrados'}` : ' '}
        </p>
      </EncabezadoPagina>

      {filtros.sinResponder && (
        <Alerta
          tipo="advertencia"
          titulo="Artículos con pares sin responder"
          accion={
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() => cambiar({ sinResponder: undefined })}
            >
              Quitar este filtro
            </Boton>
          }
        >
          Se muestran solo los artículos que tienen pares con la invitación sin responder.
        </Alerta>
      )}

      {filtros.sinPares && (
        <Alerta
          tipo="advertencia"
          titulo="Artículos sin pares"
          accion={
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() => cambiar({ sinPares: undefined })}
            >
              Quitar este filtro
            </Boton>
          }
        >
          Se muestran solo los artículos aprobados por el comité que todavía no tienen pares
          evaluadores asignados.
        </Alerta>
      )}

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
