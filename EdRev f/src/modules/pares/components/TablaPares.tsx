/*
 * TablaPares — the journal's peers with university, area, delivered evaluations and availability
 * (blocked peers are marked, never hidden by color alone). The whole row opens the peer record;
 * when an article is being worked on, each available peer has an "Asignar" link that keeps it.
 * Covers: RF-12, RF-14, RF-15, RF-17, HU-09.
 */
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { ParListado } from '@/types/par'
import type { Revista } from '@/types/revista'

export interface TablaParesProps {
  revista: Revista
  pares: ParListado[]
  cargando: boolean
  vacio: string
  /** Article being worked on; with it, available peers can be assigned from the row. */
  articulo?: string
  /** Whether the user may assign peers (Administradora and Auxiliar). */
  puedeAsignar: boolean
}

export function TablaPares({
  revista,
  pares,
  cargando,
  vacio,
  articulo,
  puedeAsignar,
}: TablaParesProps) {
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
  if (articulo && puedeAsignar) {
    columnas.push({
      clave: 'asignar',
      encabezado: 'Asignar',
      render: (p) =>
        p.estado === 'bloqueado' ? (
          <span className="text-cuerpo-13 text-texto-secundario">No disponible</span>
        ) : (
          <EnlaceBoton
            variante="secundario"
            tamano="sm"
            className="relative z-10"
            to={`/${revista}/pares/asignar?articulo=${encodeURIComponent(articulo)}&par=${encodeURIComponent(p.id)}`}
          >
            Asignar <span className="sr-only">a {p.nombre}</span>
          </EnlaceBoton>
        ),
    })
  }

  return (
    <Tabla
      etiqueta="Pares evaluadores de la revista"
      columnas={columnas}
      filas={pares}
      obtenerClave={(p) => p.id}
      hrefFila={(p) => `/${revista}/pares/${encodeURIComponent(p.id)}`}
      etiquetaEnlace={(p) => `Abrir la ficha de ${p.nombre}`}
      cargando={cargando}
      vacio={vacio}
    />
  )
}
