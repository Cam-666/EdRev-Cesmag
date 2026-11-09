/*
 * ParesBloqueadosPage — Pares bloqueados (/:revista/pares/bloqueados): peers that receive no new
 * invitations, with the reason (no answer after the 2nd attempt, or does not want to take part)
 * and the date. Only the Administradora can unblock.
 * Covers: RF-15, RF-16, HU-10, HU-11.
 */
import { useState } from 'react'
import { DesbloquearParModal } from '../components/DesbloquearParModal'
import { ETIQUETA_MOTIVO } from '../config/listas'
import { usePares } from '../hooks/usePares'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { formatearFecha } from '@/lib/format'
import { useRevista } from '@/lib/revista/useRevista'
import type { ParListado } from '@/types/par'

export function ParesBloqueadosPage() {
  const { revista } = useRevista()
  const lista = usePares({ estado: 'bloqueados', pagina: 1, porPagina: 100 })
  const puedeDesbloquear = usePermiso('desbloquear-par')
  const [elegido, setElegido] = useState<ParListado | null>(null)
  const total = lista.data?.total ?? 0

  const columnas: Array<ColumnaTabla<ParListado>> = [
    { clave: 'nombre', encabezado: 'Par evaluador', render: (p) => p.nombre },
    { clave: 'universidad', encabezado: 'Universidad', render: (p) => p.universidad },
    {
      clave: 'motivo',
      encabezado: 'Motivo',
      render: (p) => (p.bloqueo ? ETIQUETA_MOTIVO[p.bloqueo.motivo] : '--'),
    },
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      render: (p) => (p.bloqueo ? formatearFecha(p.bloqueo.fecha) : '--'),
      className: 'whitespace-nowrap',
    },
  ]
  if (puedeDesbloquear) {
    columnas.push({
      clave: 'acciones',
      encabezado: 'Desbloquear',
      render: (p) => (
        <Boton variante="secundario" tamano="sm" onClick={() => setElegido(p)}>
          Desbloquear <span className="sr-only">a {p.nombre}</span>
        </Boton>
      ),
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <AccionesEncabezado>
        <EnlaceBoton variante="neutro" tamano="sm" to={`/${revista}/pares`}>
          Volver a la base
        </EnlaceBoton>
      </AccionesEncabezado>
      <header>
        <h1 className="text-titulo-24">Pares bloqueados</h1>
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {lista.data
            ? `${total} ${total === 1 ? 'par no recibe' : 'pares no reciben'} nuevas invitaciones`
            : ' '}
        </p>
      </header>
      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="los pares bloqueados"
      >
        <Tabla
          etiqueta="Pares bloqueados de la revista"
          columnas={columnas}
          filas={lista.data?.items ?? []}
          obtenerClave={(p) => p.id}
          cargando={lista.isPending}
          vacio="No hay pares bloqueados en esta revista."
        />
      </EstadoConsulta>
      <DesbloquearParModal par={elegido} onCerrar={() => setElegido(null)} />
    </section>
  )
}
