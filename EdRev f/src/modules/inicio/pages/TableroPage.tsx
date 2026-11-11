/*
 * TableroPage — Tablero (/:revista/tablero): the journal dashboard. Shows at login the two
 * situations the dependency identified as priority — peers that have not answered and delivered
 * evaluations with a pending constancia — with their count and a way to open each list, plus the
 * articles in evaluation and approved.
 * Covers: RF-37, HU-25, RF-02.
 */
import { AlertasTablero } from '../components/AlertasTablero'
import { useTablero } from '../hooks/usePanel'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { TarjetaMetrica } from '@/components/common/TarjetaMetrica'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { formatearFechaLarga } from '@/lib/format'
import { useRevista } from '@/lib/revista/useRevista'

export function TableroPage() {
  const { revista } = useRevista()
  const consulta = useTablero()
  const puedeRegistrar = usePermiso('registrar-datos')
  const puedeEmitir = usePermiso('emitir-constancia')
  const t = consulta.data

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Tablero"
        acciones={
          puedeRegistrar && (
            <EnlaceBoton tamano="sm" to={`/${revista}/articulos/nuevo`}>
              Registrar artículo
            </EnlaceBoton>
          )
        }
      >
        <p className="text-cuerpo-13 text-texto-secundario">
          {t ? `Al ${formatearFechaLarga(t.fecha)}` : ' '}
        </p>
      </EncabezadoPagina>

      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="el tablero"
      >
        {t && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TarjetaMetrica
                valor={t.sinResponder.length}
                etiqueta="Pares sin responder"
                alerta={t.sinResponder.length > 0}
                href={`/${revista}/articulos?sinResponder=1`}
              />
              <TarjetaMetrica
                valor={t.constanciasPendientes.length}
                etiqueta="Constancias pendientes"
                alerta={t.constanciasPendientes.length > 0}
                href={`/${revista}/constancias`}
              />
              <TarjetaMetrica
                valor={t.enEvaluacion}
                etiqueta="En evaluación"
                href={`/${revista}/articulos?estado=en-evaluacion`}
                textoEnlace="Ver artículos"
              />
              <TarjetaMetrica
                valor={t.aprobados}
                etiqueta="Aprobados"
                href={`/${revista}/articulos?estado=aprobado`}
                textoEnlace="Ver artículos"
              />
            </div>
            <AlertasTablero
              revista={revista}
              sinResponder={t.sinResponder}
              constanciasPendientes={t.constanciasPendientes}
              puedeEmitir={puedeEmitir}
            />
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
