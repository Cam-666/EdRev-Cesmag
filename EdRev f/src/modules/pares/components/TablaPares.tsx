/*
 * TablaPares — los pares de la base con universidad, área, evaluaciones entregadas y disponibilidad (los pares
 * bloqueados se marcan, nunca se esconden solo con color). La fila completa abre la ficha del par.
 */
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { ParListado } from '@/types/par'

export interface TablaParesProps {
  pares: ParListado[]
  cargando: boolean
  vacio: string
}

export function TablaPares({ pares, cargando, vacio }: TablaParesProps) {
  const columnas: Array<ColumnaTabla<ParListado>> = [
    { clave: 'nombre', encabezado: 'Par evaluador', render: (p) => p.nombre },
    { clave: 'universidad', encabezado: 'Universidad', render: (p) => p.universidad },
    { clave: 'area', encabezado: 'Área', render: (p) => p.area },
    { clave: 'evaluaciones', encabezado: 'Evaluaciones', render: (p) => p.evaluaciones },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (p) => <DistintivoEstado estado={p.estado} />,
    },
  ]
  return (
    <Tabla
      etiqueta="Pares evaluadores"
      columnas={columnas}
      filas={pares}
      obtenerClave={(p) => p.id}
      hrefFila={(p) => `/pares/${encodeURIComponent(p.id)}`}
      etiquetaEnlace={(p) => `Abrir la ficha de ${p.nombre}`}
      cargando={cargando}
      vacio={vacio}
    />
  )
}
