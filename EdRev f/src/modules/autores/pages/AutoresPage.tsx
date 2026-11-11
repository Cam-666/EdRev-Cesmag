/*
 * AutoresPage — Autores (/:revista/autores): the journal's reusable author records, searchable by
 * name or ORCID, with the number of articles of each and, for the selected one, its articles.
 * Authors of one journal never appear in the other.
 * Covers: RF-09, RF-10, RF-11, HU-06, HU-07.
 */
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DetalleAutor } from '../components/DetalleAutor'
import { RegistrarAutorModal } from '../components/RegistrarAutorModal'
import { useBuscarAutores } from '../hooks/useBuscarAutores'
import type { AutorConTotal } from '../services/autoresService'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { Buscador } from '@/components/common/Buscador'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { useRevista } from '@/lib/revista/useRevista'

export function AutoresPage() {
  const { revista } = useRevista()
  const [params, setParams] = useSearchParams()
  const [texto, setTexto] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const puedeRegistrar = usePermiso('registrar-datos')
  const lista = useBuscarAutores(texto, 100)
  const base = useBuscarAutores('', 1)
  const elegidoId = params.get('autor')
  const elegido = lista.data?.items.find((a) => a.id === elegidoId) ?? null

  function elegir(id: string) {
    const siguiente = new URLSearchParams(params)
    siguiente.set('autor', id)
    setParams(siguiente, { replace: true })
  }

  const columnas: Array<ColumnaTabla<AutorConTotal>> = [
    { clave: 'autor', encabezado: 'Autor', render: (a) => a.nombre },
    { clave: 'orcid', encabezado: 'ORCID', render: (a) => a.orcid, className: 'whitespace-nowrap' },
    { clave: 'filiacion', encabezado: 'Filiación', render: (a) => a.filiacion },
    { clave: 'articulos', encabezado: 'Artículos', render: (a) => a.totalArticulos },
    {
      clave: 'ver',
      encabezado: 'Ver',
      render: (a) => (
        <Boton
          variante="texto"
          tamano="sm"
          aria-pressed={a.id === elegidoId}
          onClick={() => elegir(a.id)}
        >
          Ver <span className="sr-only">los artículos de {a.nombre}</span>
        </Boton>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Autores"
        acciones={
          puedeRegistrar && (
            <Boton tamano="sm" onClick={() => setRegistrando(true)}>
              Registrar autor
            </Boton>
          )
        }
      >
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {base.data ? `${base.data.total} fichas reutilizables` : ' '}
        </p>
      </EncabezadoPagina>

      <Buscador
        className="max-w-md"
        etiqueta="Buscar por nombre u ORCID"
        placeholder="Buscar por nombre u ORCID"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div className={cn('grid grid-cols-1 gap-6', elegido && 'xl:grid-cols-[1fr_380px]')}>
        <EstadoConsulta
          cargando={false}
          error={lista.isError}
          onReintentar={() => void lista.refetch()}
          descripcion="las fichas de autor"
        >
          <Tabla
            etiqueta="Fichas de autor de la revista"
            columnas={columnas}
            filas={lista.data?.items ?? []}
            obtenerClave={(a) => a.id}
            cargando={lista.isPending}
            vacio={
              texto.trim()
                ? 'Ninguna ficha coincide con la búsqueda.'
                : 'Aún no hay autores registrados en esta revista.'
            }
          />
        </EstadoConsulta>
        {elegido && <DetalleAutor revista={revista} autor={elegido} />}
      </div>

      <RegistrarAutorModal
        abierto={registrando}
        onCerrar={() => setRegistrando(false)}
        onRegistrado={elegir}
      />
    </section>
  )
}
