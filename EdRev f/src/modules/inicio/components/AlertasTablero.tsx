/*
 * AlertasTablero — las dos alertas que la dependencia marcó como prioridad, cada una con su cantidad y los
 * primeros casos: pares que no han respondido la invitación y evaluaciones entregadas cuya constancia está
 * pendiente. Cada una abre el listado completo de sus casos.
 */
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { formatearFecha } from '@/lib/format'
import type { CasoConstanciaPendiente, CasoSinResponder } from '@/types/panel'
import type { Revista } from '@/types/revista'

const MUESTRA = 4

export interface AlertasTableroProps {
  revista: Revista
  sinResponder: CasoSinResponder[]
  constanciasPendientes: CasoConstanciaPendiente[]
  /** Si el usuario puede emitir constancias (muestra los enlaces «Emitir»). */
  puedeEmitir: boolean
}

export function AlertasTablero({
  revista,
  sinResponder,
  constanciasPendientes,
  puedeEmitir,
}: AlertasTableroProps) {
  const columnasSinResponder: Array<ColumnaTabla<CasoSinResponder>> = [
    {
      clave: 'ojs',
      encabezado: 'Nº OJS',
      render: (c) => c.numeroOjs,
      className: 'whitespace-nowrap',
    },
    { clave: 'articulo', encabezado: 'Artículo', render: (c) => c.titulo },
    { clave: 'par', encabezado: 'Par', render: (c) => c.par },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (c) => <DistintivoEstado estado={c.estado} />,
    },
  ]
  const columnasConstancias: Array<ColumnaTabla<CasoConstanciaPendiente>> = [
    { clave: 'par', encabezado: 'Par', render: (c) => c.par },
    {
      clave: 'ojs',
      encabezado: 'Artículo',
      render: (c) => c.numeroOjs,
      className: 'whitespace-nowrap',
    },
    {
      clave: 'entrego',
      encabezado: 'Entregó',
      render: (c) => formatearFecha(c.fechaEntrega),
      className: 'whitespace-nowrap',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section aria-labelledby="titulo-alerta-pares" className="flex flex-col gap-3">
        <h2 id="titulo-alerta-pares" className="text-titulo-16">
          Pares sin responder
        </h2>
        <Tabla
          etiqueta="Pares que no han respondido la invitación"
          columnas={columnasSinResponder}
          filas={sinResponder.slice(0, MUESTRA)}
          obtenerClave={(c) => c.asignacionId}
          hrefFila={(c) => `/${revista}/articulos/${encodeURIComponent(c.articuloId)}/pares`}
          etiquetaEnlace={(c) => `Abrir el artículo ${c.numeroOjs}`}
          vacio="No hay pares pendientes de responder la invitación."
        />
        {sinResponder.length > 0 && (
          <div>
            <EnlaceBoton variante="texto" tamano="sm" to={`/${revista}/articulos?sinResponder=1`}>
              Ver los {sinResponder.length}
            </EnlaceBoton>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-alerta-constancias" className="flex flex-col gap-3">
        <h2 id="titulo-alerta-constancias" className="text-titulo-16">
          Constancias pendientes
        </h2>
        <Tabla
          etiqueta="Evaluaciones entregadas con constancia pendiente"
          columnas={columnasConstancias}
          filas={constanciasPendientes.slice(0, MUESTRA)}
          obtenerClave={(c) => c.constanciaId}
          vacio="No hay constancias pendientes."
        />
        {constanciasPendientes.length > 0 && (
          <div className="flex gap-2">
            <EnlaceBoton variante="texto" tamano="sm" to={`/${revista}/constancias`}>
              Ver los {constanciasPendientes.length}
            </EnlaceBoton>
            {puedeEmitir && (
              <EnlaceBoton variante="secundario" tamano="sm" to={`/${revista}/constancias`}>
                Emitir las {constanciasPendientes.length}
              </EnlaceBoton>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
