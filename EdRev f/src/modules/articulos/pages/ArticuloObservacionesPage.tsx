/*
 * ArticuloObservacionesPage — Observaciones tab (/:revista/articulos/:id/observaciones): write a
 * dated note and read the earlier ones, newest first. Covers: RF-07, HU-04.
 */
import { FormularioObservacion } from '../components/FormularioObservacion'
import { ListaObservaciones } from '../components/ListaObservaciones'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { useObservaciones } from '../hooks/useObservaciones'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'

export function ArticuloObservacionesPage() {
  const articulo = useArticuloActual()
  const consulta = useObservaciones(articulo.id)
  const puedeEscribir = usePermiso('registrar-datos')

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      {puedeEscribir && <FormularioObservacion articuloId={articulo.id} />}
      <div className="flex flex-col gap-3">
        <h2 className="text-titulo-16">Registradas</h2>
        <EstadoConsulta
          cargando={consulta.isPending}
          error={consulta.isError}
          onReintentar={() => void consulta.refetch()}
          descripcion="las observaciones"
        >
          <ListaObservaciones observaciones={consulta.data ?? []} />
        </EstadoConsulta>
      </div>
    </section>
  )
}
