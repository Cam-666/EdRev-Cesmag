/*
 * AutorDetallePage — ficha del autor (/:revista/autores/:id): la ficha completa de un autor del directorio común
 * y todos sus artículos, con su revista y su estado; cada artículo se abre en su propia revista.
 * «Volver a autores» regresa al directorio.
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { EditarAutorModal } from '../components/EditarAutorModal'
import { useArticulosDeAutor, useAutor } from '../hooks/useAutores'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { BotonVolver } from '@/components/common/BotonVolver'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { ErrorApi } from '@/lib/api/cliente'
import { formatearFechaLarga } from '@/lib/format'
import type { ArticuloDeAutor, Autor } from '@/types/autor'
import { REVISTAS } from '@/types/revista'

export function AutorDetallePage() {
  const { id = '' } = useParams()
  const autor = useAutor(id)
  const articulos = useArticulosDeAutor(id)
  const puedeEditar = usePermiso('registrar-datos')
  const [editando, setEditando] = useState<Autor | null>(null)
  const volver = <BotonVolver to="/autores">Volver a autores</BotonVolver>

  if (autor.error instanceof ErrorApi && autor.error.estado === 404) {
    return (
      <section className="flex flex-col gap-4">
        {volver}
        <h1 className="text-titulo-24">Autor no encontrado</h1>
      </section>
    )
  }

  const columnas: Array<ColumnaTabla<ArticuloDeAutor>> = [
    { clave: 'articulo', encabezado: 'Artículo', render: (a) => `${a.numeroOjs} · ${a.titulo}` },
    { clave: 'revista', encabezado: 'Revista', render: (a) => REVISTAS[a.revista].nombreCorto },
    {
      clave: 'postulado',
      encabezado: 'Postulado',
      render: (a) => formatearFechaLarga(a.fechaPostulacion),
      className: 'whitespace-nowrap',
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (a) => <DistintivoEstado estado={a.estado} />,
    },
  ]

  return (
    <section className="flex flex-col gap-6">
      {volver}
      <EstadoConsulta
        cargando={autor.isPending}
        error={autor.isError}
        onReintentar={() => void autor.refetch()}
        descripcion="la ficha del autor"
      >
        {autor.data && (
          <>
            <EncabezadoPagina
              titulo={autor.data.nombre}
              acciones={
                puedeEditar && (
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    onClick={() => setEditando(autor.data ?? null)}
                  >
                    Editar
                  </Boton>
                )
              }
            >
              <p className="text-cuerpo-13 text-texto-secundario">Directorio común de autores</p>
            </EncabezadoPagina>

            <section
              aria-labelledby="titulo-datos-autor"
              className="rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
            >
              <h2 id="titulo-datos-autor" className="mb-3 text-titulo-16">
                Datos del autor
              </h2>
              <dl className="grid grid-cols-1 gap-4 text-cuerpo-15 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-cuerpo-13 text-texto-secundario">ORCID</dt>
                  <dd>{autor.data.orcid || 'Sin ORCID'}</dd>
                </div>
                <div>
                  <dt className="text-cuerpo-13 text-texto-secundario">Correo</dt>
                  <dd className="break-all">{autor.data.correo}</dd>
                </div>
                <div>
                  <dt className="text-cuerpo-13 text-texto-secundario">Filiación</dt>
                  <dd>{autor.data.filiacion}</dd>
                </div>
                <div>
                  <dt className="text-cuerpo-13 text-texto-secundario">País</dt>
                  <dd>{autor.data.pais}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="titulo-articulos-autor" className="flex flex-col gap-3">
              <h2 id="titulo-articulos-autor" className="text-titulo-16">
                Artículos
              </h2>
              <EstadoConsulta
                cargando={articulos.isPending}
                error={articulos.isError}
                onReintentar={() => void articulos.refetch()}
                descripcion="los artículos del autor"
              >
                <Tabla
                  etiqueta={`Artículos de ${autor.data.nombre}`}
                  columnas={columnas}
                  filas={articulos.data ?? []}
                  obtenerClave={(a) => `${a.revista}-${a.id}`}
                  hrefFila={(a) => `/${a.revista}/articulos/${encodeURIComponent(a.id)}`}
                  etiquetaEnlace={(a) =>
                    `Abrir el artículo ${a.numeroOjs} de ${REVISTAS[a.revista].nombreCorto}`
                  }
                  vacio="Este autor aún no tiene artículos."
                />
              </EstadoConsulta>
            </section>
          </>
        )}
      </EstadoConsulta>
      <EditarAutorModal autor={editando} onCerrar={() => setEditando(null)} />
    </section>
  )
}
