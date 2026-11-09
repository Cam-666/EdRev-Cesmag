/*
 * DetalleAutor — side panel of the authors list: the record of the selected author and the
 * articles associated to it, with their status. Covers: RF-11, HU-07 (criterion 3).
 */
import { useArticulosDeAutor } from '../hooks/useAutores'
import type { AutorConTotal } from '../services/autoresService'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { ArticuloDeAutor } from '@/types/autor'
import type { Revista } from '@/types/revista'

export interface DetalleAutorProps {
  revista: Revista
  autor: AutorConTotal
}

export function DetalleAutor({ revista, autor }: DetalleAutorProps) {
  const consulta = useArticulosDeAutor(autor.id)
  const columnas: Array<ColumnaTabla<ArticuloDeAutor>> = [
    { clave: 'articulo', encabezado: 'Artículo', render: (a) => `${a.numeroOjs} · ${a.titulo}` },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (a) => <DistintivoEstado estado={a.estado} />,
    },
  ]

  return (
    <section
      aria-labelledby="titulo-detalle-autor"
      className="flex h-fit flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <div>
        <h2 id="titulo-detalle-autor" className="text-titulo-16">
          {autor.nombre}
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-cuerpo-13">
          <dt className="text-texto-secundario">ORCID</dt>
          <dd>{autor.orcid}</dd>
          <dt className="text-texto-secundario">Filiación</dt>
          <dd>{autor.filiacion}</dd>
          <dt className="text-texto-secundario">País</dt>
          <dd>{autor.pais}</dd>
          <dt className="text-texto-secundario">Correo</dt>
          <dd>{autor.correo}</dd>
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-etiqueta-13">Artículos de este autor</h3>
        <EstadoConsulta
          cargando={consulta.isPending}
          error={consulta.isError}
          onReintentar={() => void consulta.refetch()}
          descripcion="los artículos del autor"
        >
          <Tabla
            etiqueta={`Artículos de ${autor.nombre}`}
            columnas={columnas}
            filas={consulta.data ?? []}
            obtenerClave={(a) => a.id}
            hrefFila={(a) => `/${revista}/articulos/${encodeURIComponent(a.id)}`}
            etiquetaEnlace={(a) => `Abrir el artículo ${a.numeroOjs}`}
            vacio="Este autor aún no tiene artículos."
          />
        </EstadoConsulta>
      </div>
    </section>
  )
}
