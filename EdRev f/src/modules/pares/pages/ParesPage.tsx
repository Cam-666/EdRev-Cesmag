/*
 * ParesPage — Pares evaluadores (/:revista/pares): the journal's own peer base, searchable by
 * thematic area and university, with the availability of each peer. With `?articulo=` it is the
 * place to pick the peer to assign to that article.
 * Covers: RF-12, RF-13, RF-14, RF-15, RF-17, RNF-06, HU-08, HU-09.
 */
import { useState } from 'react'
import { FiltrosPares } from '../components/FiltrosPares'
import { ParModal } from '../components/ParModal'
import { TablaPares } from '../components/TablaPares'
import { useFiltrosPares } from '../hooks/useFiltrosPares'
import { usePares } from '../hooks/usePares'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Paginacion } from '@/components/common/Paginacion'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { useRevista } from '@/lib/revista/useRevista'

export function ParesPage() {
  const { revista, datos } = useRevista()
  const { filtros, cambiar, hayFiltros } = useFiltrosPares()
  const lista = usePares(filtros)
  const puedeRegistrar = usePermiso('registrar-datos')
  const puedeAsignar = usePermiso('asignar-pares')
  const [registrando, setRegistrando] = useState(false)
  const total = lista.data?.total ?? 0
  const base = lista.data?.totalBase ?? 0

  return (
    <section className="flex flex-col gap-4">
      <AccionesEncabezado>
        {puedeRegistrar && (
          <Boton tamano="sm" onClick={() => setRegistrando(true)}>
            Registrar par
          </Boton>
        )}
        <EnlaceBoton variante="neutro" tamano="sm" to={`/${revista}/pares/bloqueados`}>
          Bloqueados
        </EnlaceBoton>
      </AccionesEncabezado>

      <header>
        <h1 className="text-titulo-24">Pares evaluadores</h1>
        <p className="text-cuerpo-13 text-texto-secundario">
          {lista.data ? `${base} pares · base propia de esta revista` : ' '}
        </p>
      </header>
      <Alerta tipo="informacion">
        {lista.data
          ? `Estos ${base} pares pertenecen solo a ${datos.nombreCorto}.`
          : 'Cargando la base de pares…'}
      </Alerta>

      {filtros.articulo && (
        <Alerta
          tipo="advertencia"
          titulo={`Asignar un par al artículo ${filtros.articulo}`}
          accion={
            <EnlaceBoton
              variante="secundario"
              tamano="sm"
              to={`/${revista}/articulos/${encodeURIComponent(filtros.articulo)}/pares`}
            >
              Cancelar
            </EnlaceBoton>
          }
        >
          Busque entre los pares de la revista y pulse «Asignar». Los pares con conflicto posible se
          pueden asignar de todos modos.
        </Alerta>
      )}

      <FiltrosPares filtros={filtros} onCambio={cambiar} />

      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="los pares evaluadores"
      >
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {lista.data
            ? `${total} ${total === 1 ? 'par' : 'pares'}${hayFiltros ? ' con estos filtros' : ''}`
            : ' '}
        </p>
        <TablaPares
          revista={revista}
          pares={lista.data?.items ?? []}
          cargando={lista.isPending}
          articulo={filtros.articulo}
          puedeAsignar={puedeAsignar}
          vacio={
            hayFiltros || filtros.estado !== 'disponibles'
              ? 'Ningún par coincide con los filtros.'
              : 'Aún no hay pares registrados en esta revista.'
          }
        />
        {lista.data && total > 0 && (
          <Paginacion
            pagina={filtros.pagina}
            porPagina={filtros.porPagina}
            total={total}
            onCambiar={(pagina) => cambiar({ pagina })}
          />
        )}
      </EstadoConsulta>

      <ParModal abierto={registrando} onCerrar={() => setRegistrando(false)} />
    </section>
  )
}
