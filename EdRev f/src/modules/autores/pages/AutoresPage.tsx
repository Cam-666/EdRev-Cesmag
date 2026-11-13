/*
 * AutoresPage — Autores (/:revista/autores): the common author directory of both journals,
 * searchable by name or ORCID and filterable by journal, with the number of articles of each.
 * A click on an author opens its own screen (AutorDetallePage).
 * Covers: RF-09, RF-10, RF-11, HU-06, HU-07.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegistrarAutorModal } from '../components/RegistrarAutorModal'
import { useBuscarAutores } from '../hooks/useBuscarAutores'
import type { AutorConTotal } from '../services/autoresService'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { Buscador } from '@/components/common/Buscador'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { useRevista } from '@/lib/revista/useRevista'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const FILTRO_REVISTA = [
  { valor: 'ambas', etiqueta: 'Ambas' },
  { valor: 'reep', etiqueta: REVISTAS.reep.nombreCorto },
  { valor: 'ire', etiqueta: REVISTAS.ire.nombreCorto },
]

export function AutoresPage() {
  const { revista } = useRevista()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [filtro, setFiltro] = useState('ambas')
  const [registrando, setRegistrando] = useState(false)
  const puedeRegistrar = usePermiso('registrar-datos')
  const en = filtro === 'ambas' ? undefined : (filtro as Revista)
  const lista = useBuscarAutores(texto, 100, true, en)
  const ficha = (id: string) => `/${revista}/autores/${encodeURIComponent(id)}`

  const columnas: Array<ColumnaTabla<AutorConTotal>> = [
    { clave: 'autor', encabezado: 'Autor', render: (a) => a.nombre },
    { clave: 'orcid', encabezado: 'ORCID', render: (a) => a.orcid || '—', className: 'whitespace-nowrap' },
    { clave: 'filiacion', encabezado: 'Filiación', render: (a) => a.filiacion },
    {
      clave: 'revistas',
      encabezado: 'Revistas',
      render: (a) => a.revistas.map((r) => REVISTAS[r].nombreCorto).join(' · ') || 'Sin artículos',
    },
    { clave: 'articulos', encabezado: 'Artículos', render: (a) => a.totalArticulos },
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
          {lista.data ? `${lista.data.total} autores · directorio común de ambas revistas` : ' '}
        </p>
      </EncabezadoPagina>

      <div className="flex flex-wrap items-end gap-4">
        <Buscador
          className="w-full max-w-md"
          etiqueta="Buscar por nombre u ORCID"
          placeholder="Buscar por nombre u ORCID"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <ListaDesplegable
          className="w-60"
          etiqueta="Revista"
          opciones={FILTRO_REVISTA}
          valor={filtro}
          onCambio={setFiltro}
        />
      </div>

      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="el directorio de autores"
      >
        <Tabla
          etiqueta="Directorio de autores"
          columnas={columnas}
          filas={lista.data?.items ?? []}
          obtenerClave={(a) => a.id}
          cargando={lista.isPending}
          hrefFila={(a) => ficha(a.id)}
          etiquetaEnlace={(a) => `Ver la ficha de ${a.nombre}`}
          vacio={
            texto.trim() || en
              ? 'Ningún autor coincide con la búsqueda.'
              : 'Aún no hay autores registrados.'
          }
        />
      </EstadoConsulta>

      <RegistrarAutorModal
        abierto={registrando}
        onCerrar={() => setRegistrando(false)}
        onRegistrado={(id) => navigate(ficha(id))}
      />
    </section>
  )
}
