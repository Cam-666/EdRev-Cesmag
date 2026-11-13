/*
 * PorCorregirPage — Registros migrados por corregir (/:revista/por-corregir): the records loaded
 * from the Excel whose hand-written text did not fit the closed lists of the system (a type,
 * state or concept) or that came without a datum the system needs (the peer email, asked before
 * inviting again). Each one shows what the Excel said and is corrected right there; corrected
 * records leave the list and the change stays in the history. Opened from the dashboard.
 * Covers: RF-42, RF-43, RF-44, HU-32.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormularioCorreccion } from '../components/FormularioCorreccion'
import { ETIQUETA_CAMPO } from '../config/campos'
import { usePorCorregir } from '../hooks/usePorCorregir'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { BotonVolver } from '@/components/common/BotonVolver'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { useRevista } from '@/lib/revista/useRevista'
import type { RegistroPorCorregir } from '@/types/migracion'

export function PorCorregirPage() {
  const { revista } = useRevista()
  const consulta = usePorCorregir()
  const puedeCorregir = usePermiso('registrar-datos')
  const [corregido, setCorregido] = useState<RegistroPorCorregir | null>(null)
  const total = consulta.data?.length ?? 0

  const columnas: Array<ColumnaTabla<RegistroPorCorregir>> = [
    {
      clave: 'registro',
      encabezado: 'Registro',
      render: (r) => (
        <Link to={r.enlace} className="text-texto-enlace hover:underline">
          {r.descripcion}
        </Link>
      ),
    },
    { clave: 'dato', encabezado: 'Dato', render: (r) => ETIQUETA_CAMPO[r.campo] },
    {
      clave: 'excel',
      encabezado: 'En el Excel',
      render: (r) =>
        r.valorExcel ? (
          <span>«{r.valorExcel}»</span>
        ) : (
          <span className="text-texto-secundario">Sin dato</span>
        ),
    },
    {
      clave: 'correccion',
      encabezado: 'Corrección',
      render: (r) =>
        puedeCorregir ? <FormularioCorreccion registro={r} onCorregido={setCorregido} /> : null,
    },
  ]

  return (
    <section className="flex flex-col gap-4">
      <BotonVolver to={`/${revista}/tablero`}>Volver al tablero</BotonVolver>
      <EncabezadoPagina titulo="Registros migrados por corregir">
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {consulta.data
            ? `${total} ${total === 1 ? 'registro' : 'registros'} del Excel por corregir`
            : ' '}
        </p>
      </EncabezadoPagina>
      <div role="status" aria-live="polite">
        {corregido && (
          <Alerta tipo="exito">
            Se corrigió {ETIQUETA_CAMPO[corregido.campo].toLowerCase()} de {corregido.descripcion}.
          </Alerta>
        )}
      </div>
      <EstadoConsulta
        cargando={false}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="los registros por corregir"
      >
        <Tabla
          etiqueta="Registros migrados por corregir"
          columnas={columnas}
          filas={consulta.data ?? []}
          obtenerClave={(r) => r.id}
          cargando={consulta.isPending}
          vacio="No hay registros migrados por corregir."
        />
      </EstadoConsulta>
    </section>
  )
}
