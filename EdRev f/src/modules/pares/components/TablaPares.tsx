/*
 * TablaPares — the journal's peers with university, area, delivered evaluations and availability
 * (blocked peers are marked, never hidden by color alone). The whole row opens the peer record.
 * Covers: RF-12, RF-14, RF-15, RF-17, HU-09.
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
