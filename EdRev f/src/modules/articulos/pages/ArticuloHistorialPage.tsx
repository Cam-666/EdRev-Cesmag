/*
 * ArticuloHistorialPage — pestaña Historial (/:revista/articulos/:id/historial): los correos enviados del
 * artículo y «quién cambió qué».
 */
import { ListaAuditoria } from '../components/ListaAuditoria'
import { TablaCorreos } from '../components/TablaCorreos'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { useHistorial } from '../hooks/useHistorial'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'

export function ArticuloHistorialPage() {
  const articulo = useArticuloActual()
  const consulta = useHistorial(articulo.id)

  return (
    <EstadoConsulta
      cargando={consulta.isPending}
      error={consulta.isError}
      onReintentar={() => void consulta.refetch()}
      descripcion="el historial"
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <h2 className="text-titulo-16">Correos enviados por este artículo</h2>
          <TablaCorreos correos={consulta.data?.correos ?? []} />
        </section>
        <ListaAuditoria entradas={consulta.data?.auditoria ?? []} />
      </div>
    </EstadoConsulta>
  )
}
