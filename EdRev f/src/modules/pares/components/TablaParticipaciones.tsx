/*
 * TablaParticipaciones — los artículos en que participó un par, con estado, concepto y constancia (símbolo y
 * texto). La constancia es visible desde la ficha del par.
 */
import { ETIQUETA_CONCEPTO } from '@/modules/articulos/config/listas'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { Participacion } from '@/types/par'

export interface TablaParticipacionesProps {
  participaciones: Participacion[]
}

export function TablaParticipaciones({ participaciones }: TablaParticipacionesProps) {
  const columnas: Array<ColumnaTabla<Participacion>> = [
    {
      clave: 'articulo',
      encabezado: 'Artículo',
      render: (p) => `${p.numeroOjs} · ${p.titulo}`,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (p) => <DistintivoEstado estado={p.estado} />,
    },
    {
      clave: 'concepto',
      encabezado: 'Concepto',
      render: (p) => (p.concepto ? ETIQUETA_CONCEPTO[p.concepto] : '--'),
    },
    {
      clave: 'constancia',
      encabezado: 'Constancia',
      render: (p) =>
        p.constancia ? (
          <DistintivoEstado estado={p.constancia === 'emitida' ? 'emitida' : 'pendiente'} />
        ) : (
          '--'
        ),
    },
  ]
  return (
    <Tabla
      etiqueta="Participaciones del par"
      columnas={columnas}
      filas={participaciones}
      obtenerClave={(p) => p.asignacionId}
      hrefFila={(p) => `/${p.revista}/articulos/${encodeURIComponent(p.articuloId)}/pares`}
      etiquetaEnlace={(p) => `Abrir el artículo ${p.numeroOjs}`}
      vacio="Este par aún no ha participado en ningún artículo."
    />
  )
}
