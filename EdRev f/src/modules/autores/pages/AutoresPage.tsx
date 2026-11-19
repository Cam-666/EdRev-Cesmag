/*
 * AutoresPage — Autores (/:revista/autores): the common author directory of both journals,
 * searchable by name or ORCID and filterable by journal, country, institution, ORCID and number of
 * articles, with the number of articles of each.
 * A click on an author opens its own screen (AutorDetallePage).
 * Covers: RF-09, RF-10, RF-11, HU-06, HU-07.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegistrarAutorModal } from '../components/RegistrarAutorModal'
import { useBuscarAutores, useOpcionesFiltrosAutores } from '../hooks/useBuscarAutores'
import type { FiltrosAutores } from '../services/autoresService'
import type { AutorConTotal } from '../services/autoresService'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { Buscador } from '@/components/common/Buscador'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const TODOS = 'todos'

const FILTRO_REVISTA = [
  { valor: TODOS, etiqueta: 'Todos' },
  { valor: 'reep', etiqueta: REVISTAS.reep.nombreCorto },
  { valor: 'ire', etiqueta: REVISTAS.ire.nombreCorto },
]

const FILTRO_ORCID = [
  { valor: TODOS, etiqueta: 'Todos' },
  { valor: 'con', etiqueta: 'Con ORCID' },
  { valor: 'sin', etiqueta: 'Sin ORCID' },
]

const FILTRO_ARTICULOS = [
  { valor: TODOS, etiqueta: 'Todos' },
  { valor: 'uno', etiqueta: 'Un artículo' },
  { valor: 'varios', etiqueta: 'Dos o más artículos' },
]

export function AutoresPage() {
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [filtro, setFiltro] = useState(TODOS)
  const [pais, setPais] = useState(TODOS)
  const [filiacion, setFiliacion] = useState(TODOS)
  const [orcid, setOrcid] = useState(TODOS)
  const [articulos, setArticulos] = useState(TODOS)
  const opciones = useOpcionesFiltrosAutores()
  const [registrando, setRegistrando] = useState(false)
  const puedeRegistrar = usePermiso('registrar-datos')
  const en = filtro === TODOS ? undefined : (filtro as Revista)
  const filtros: FiltrosAutores = {
    ...(en ? { en } : {}),
    ...(pais !== TODOS ? { pais } : {}),
    ...(filiacion !== TODOS ? { filiacion } : {}),
    ...(orcid !== TODOS ? { orcid: orcid as 'con' | 'sin' } : {}),
    ...(articulos !== TODOS ? { articulos: articulos as 'uno' | 'varios' } : {}),
  }
  const hayFiltros = Object.keys(filtros).length > 0
  const lista = useBuscarAutores(texto, 100, true, filtros)
  const ficha = (id: string) => `/autores/${encodeURIComponent(id)}`

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
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ListaDesplegable
          etiqueta="Revista"
          opciones={FILTRO_REVISTA}
          valor={filtro}
          onCambio={setFiltro}
        />
        <ListaDesplegable
          etiqueta="País"
          opciones={[
            { valor: TODOS, etiqueta: 'Todos' },
            ...(opciones.data?.paises ?? []).map((p) => ({ valor: p, etiqueta: p })),
          ]}
          valor={pais}
          onCambio={setPais}
        />
        <ListaDesplegable
          etiqueta="Institución"
          opciones={[
            { valor: TODOS, etiqueta: 'Todas' },
            ...(opciones.data?.filiaciones ?? []).map((f) => ({ valor: f, etiqueta: f })),
          ]}
          valor={filiacion}
          onCambio={setFiliacion}
        />
        <ListaDesplegable etiqueta="ORCID" opciones={FILTRO_ORCID} valor={orcid} onCambio={setOrcid} />
        <ListaDesplegable
          etiqueta="Número de artículos"
          opciones={FILTRO_ARTICULOS}
          valor={articulos}
          onCambio={setArticulos}
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
            texto.trim() || hayFiltros
              ? 'No se encontraron autores con la búsqueda realizada.'
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
