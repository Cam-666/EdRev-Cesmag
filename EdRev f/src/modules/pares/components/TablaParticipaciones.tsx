/*
 * TablaParticipaciones — the articles a peer took part in, with status, concept and constancia
 * (symbol + text). Covers: RF-18, HU-23 (constancia visible from the peer's record).
 */
import { ETIQUETA_CONCEPTO } from '@/modules/articulos/config/listas'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { Participacion } from '@/types/par'
import type { Revista } from '@/types/revista'

export interface TablaParticipacionesProps {
  revista: Revista
  participaciones: Participacion[]
}

export function TablaParticipaciones({ revista, participaciones }: TablaParticipacionesProps) {
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
      hrefFila={(p) => `/${revista}/articulos/${encodeURIComponent(p.articuloId)}/pares`}
      etiquetaEnlace={(p) => `Abrir el artículo ${p.numeroOjs}`}
      vacio="Este par aún no ha participado en ningún artículo."
    />
  )
}
