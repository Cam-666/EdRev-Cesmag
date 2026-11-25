/*
 * TableroPage — Tablero (/:revista/tablero): el tablero de la revista. Muestra al ingresar las dos situaciones
 * que la dependencia identificó como prioridad —pares que no han respondido y evaluaciones entregadas con
 * constancia pendiente—, con su cantidad y una forma de abrir cada listado, además de los artículos aprobados por
 * el comité que todavía no tienen pares, los artículos en evaluación y los aprobados.
 */
import { Alerta } from '@/components/common/Alerta'
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                valor={t.sinPares}
                etiqueta="Artículos sin pares"
                alerta={t.sinPares > 0}
                href={`/${revista}/articulos?sinPares=1`}
                textoEnlace="Ver artículos"
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
            {t.porCorregir > 0 && (
              <Alerta
                tipo="advertencia"
                titulo="Registros migrados por corregir"
                accion={
                  <EnlaceBoton variante="secundario" tamano="sm" to={`/${revista}/por-corregir`}>
                    Corregir
                  </EnlaceBoton>
                }
              >
                {t.porCorregir === 1
                  ? '1 registro del Excel no encaja en las listas del sistema.'
                  : `${t.porCorregir} registros del Excel no encajan en las listas del sistema.`}
              </Alerta>
            )}
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
