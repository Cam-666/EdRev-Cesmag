/*
 * TablaArticulos — listado de artículos: número de OJS, título, tipo, evaluaciones entregadas sobre pares
 * asignados (los que aceptaron), fecha de postulación y estado. Toda la fila es un enlace a la ficha; un artículo
 * archivado abre el diálogo «Retomar el proceso» sobre su ficha (como en el prototipo de Figma).
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
  /** Mensaje del estado vacío (cambia cuando hay filtros activos). */
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
      encabezado: 'Pares (entregas)',
      render: (a) => `${a.paresEntregaron}/${a.paresAsignados}`,
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
