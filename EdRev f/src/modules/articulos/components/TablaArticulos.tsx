/*
 * TablaArticulos — article list: OJS number, title, type, peers answered/assigned, postulation
 * date and status. The whole row is a link to the sheet; an archived article opens the
 * "Retomar el proceso" dialog over its sheet (as the Figma prototype does).
 * Covers: RF-35, RF-36, RF-08, HU-26, RNF-11.
 */
import { ETIQUETA_TIPO } from '../config/listas'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { formatearFecha } from '@/lib/format'
import type { ArticuloListado } from '@/types/articulo'
import type { Revista } from '@/types/revista'

export interface TablaArticulosProps {
  revista: Revista
  articulos: ArticuloListado[]
  cargando: boolean
  /** Message of the empty state (differs when filters are active). */
  vacio: string
}

export function TablaArticulos({ revista, articulos, cargando, vacio }: TablaArticulosProps) {
  const columnas: Array<ColumnaTabla<ArticuloListado>> = [
    {
      clave: 'ojs',
      encabezado: 'Nº OJS',
      render: (a) => a.numeroOjs,
      className: 'whitespace-nowrap',
    },
    { clave: 'titulo', encabezado: 'Título', render: (a) => a.titulo },
    { clave: 'tipo', encabezado: 'Tipo', render: (a) => ETIQUETA_TIPO[a.tipo] },
    {
      clave: 'pares',
      encabezado: 'Pares',
      render: (a) => `${a.paresRespondieron}/${a.paresAsignados}`,
    },
    {
      clave: 'postulado',
      encabezado: 'Postulado',
      render: (a) => formatearFecha(a.fechaPostulacion),
      className: 'whitespace-nowrap',
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (a) => <DistintivoEstado estado={a.estado} />,
    },
  ]

  return (
    <Tabla
      etiqueta="Artículos de la revista"
      columnas={columnas}
      filas={articulos}
      obtenerClave={(a) => a.id}
      hrefFila={(a) =>
        `/${revista}/articulos/${encodeURIComponent(a.id)}${a.estado === 'archivado' ? '/reabrir' : ''}`
      }
      etiquetaEnlace={(a) => `Abrir el artículo ${a.numeroOjs}`}
      cargando={cargando}
      vacio={vacio}
    />
  )
}
