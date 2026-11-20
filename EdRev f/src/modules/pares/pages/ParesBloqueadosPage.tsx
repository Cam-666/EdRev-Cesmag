/*
 * ParesBloqueadosPage — Pares bloqueados (/:revista/pares/bloqueados): los pares que no reciben invitaciones
 * nuevas, con el motivo (no respondió tras el 2.º intento o no desea participar) y la fecha. Solo la
 * Administradora puede desbloquear.
 */
import { BotonVolver } from '@/components/common/BotonVolver'
import { useState } from 'react'
import { DesbloquearParModal } from '../components/DesbloquearParModal'
import { ETIQUETA_MOTIVO } from '../config/listas'
import { usePares } from '../hooks/usePares'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { formatearFecha } from '@/lib/format'
import type { ParListado } from '@/types/par'

export function ParesBloqueadosPage() {
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
      <BotonVolver to="/pares">Volver a pares evaluadores</BotonVolver>
      <EncabezadoPagina titulo="Pares bloqueados">
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {lista.data
            ? `${total} ${total === 1 ? 'par no recibe' : 'pares no reciben'} nuevas invitaciones`
            : ' '}
        </p>
      </EncabezadoPagina>
      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="los pares bloqueados"
      >
        <Tabla
          etiqueta="Pares bloqueados"
          columnas={columnas}
          filas={lista.data?.items ?? []}
          obtenerClave={(p) => p.id}
          cargando={lista.isPending}
          vacio="No hay pares evaluadores bloqueados."
        />
      </EstadoConsulta>
      <DesbloquearParModal par={elegido} onCerrar={() => setElegido(null)} />
    </section>
  )
}
