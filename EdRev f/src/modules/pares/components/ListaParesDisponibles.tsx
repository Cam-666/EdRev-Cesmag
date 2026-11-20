/*
 * ListaParesDisponibles — los pares que se pueden asignar al artículo: no bloqueados y sin evaluación en curso
 * (invitado o aceptó). Se busca por nombre, área o universidad. No se ofrecen pares de la misma institución que
 * algún autor. «Asignar» envía la invitación de inmediato.
 */
import { useState } from 'react'
import { usePares } from '../hooks/usePares'
import { Boton } from '@/components/common/Boton'
import { Buscador } from '@/components/common/Buscador'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { useRetardo } from '@/lib/useRetardo'
import type { ParListado } from '@/types/par'

export interface ListaParesDisponiblesProps {
  articuloId: string
  /** Id del par que se está asignando en este momento (su botón muestra el indicador de carga). */
  asignando: string | null
  onAsignar: (par: ParListado) => void
}

export function ListaParesDisponibles({
  articuloId,
  asignando,
  onAsignar,
}: ListaParesDisponiblesProps) {
  const [texto, setTexto] = useState('')
  const q = useRetardo(texto.trim(), 250)
  const lista = usePares({
    q,
    estado: 'asignables',
    articulo: articuloId,
    pagina: 1,
    porPagina: 50,
  })

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
    {
      clave: 'asignar',
      encabezado: 'Asignar',
      render: (p) =>
        !p.correo ? (
          <EnlaceBoton
            variante="neutro"
            tamano="sm"
            className="relative z-10"
            to={`/pares/${encodeURIComponent(p.id)}`}
          >
            Registrar correo <span className="sr-only">de {p.nombre}</span>
          </EnlaceBoton>
        ) : (
          <Boton
            variante="secundario"
            tamano="sm"
            cargando={asignando === p.id}
            disabled={asignando !== null && asignando !== p.id}
            onClick={() => onAsignar(p)}
          >
            Asignar <span className="sr-only">a {p.nombre}</span>
          </Boton>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <Buscador
        className="max-w-md"
        etiqueta="Buscar par disponible"
        placeholder="Nombre, correo o área"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="los pares disponibles"
      >
        <Tabla
          etiqueta="Pares disponibles"
          columnas={columnas}
          filas={lista.data?.items ?? []}
          obtenerClave={(p) => p.id}
          cargando={lista.isPending}
          vacio={
            q
              ? 'Ningún par disponible coincide con la búsqueda.'
              : 'No hay pares disponibles: todos tienen una evaluación en curso o están bloqueados.'
          }
        />
      </EstadoConsulta>
    </div>
  )
}
