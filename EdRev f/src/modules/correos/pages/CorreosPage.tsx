/*
 * CorreosPage — Correos enviados (/:revista/correos): el registro de correos enviados de la revista con los
 * contadores (enviados / rebotados / fallidos / en cola), un aviso para los rebotados, «Corregir y reenviar» y
 * «Reintentar fallidos» (los correos que falló el servicio y la cola). No se pierde nada: los envíos fallidos
 * quedan en cola para reintentarlos.
 */
import { useState } from 'react'
import { CorregirCorreoModal } from '../components/CorregirCorreoModal'
import { DetalleCorreoModal } from '../components/DetalleCorreoModal'
import { TablaCorreosRevista } from '../components/TablaCorreosRevista'
import { ESTADOS_CORREO, ETIQUETA_TIPO_CORREO, TIPOS_CORREO } from '../config/listas'
import { useCorreos, useReintentarCorreo, useReintentarFallidos } from '../hooks/useCorreos'
import { useFiltrosCorreos } from '../hooks/useFiltrosCorreos'
import type { CorreoConArticulo } from '../services/correosService'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { DEFINICIONES_ESTADO } from '@/components/common/DistintivoEstado'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Paginacion } from '@/components/common/Paginacion'
import { TarjetaMetrica } from '@/components/common/TarjetaMetrica'
import { mensajeDeApi } from '@/lib/api/errores'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import type { EstadoCorreo, TipoCorreo } from '@/types/historial'

const TODOS = 'todos'

export function CorreosPage() {
  const { filtros, cambiar, hayFiltros } = useFiltrosCorreos()
  const lista = useCorreos(filtros)
  const puedeReintentar = usePermiso('asignar-pares')
  const reintentar = useReintentarCorreo()
  const fallidos = useReintentarFallidos()
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [viendo, setViendo] = useState<CorreoConArticulo | null>(null)
  const [corrigiendo, setCorrigiendo] = useState<CorreoConArticulo | null>(null)
  const datos = lista.data

  const primerFallo = datos?.items.find((c) => c.estado === 'rebotado' && !c.atendido)

  function reintentarUno(correo: CorreoConArticulo) {
    setAviso(null)
    reintentar.mutate(correo.id, {
      onSuccess: () =>
        setAviso({ tipo: 'exito', texto: `Correo a ${correo.destinatario} enviado.` }),
      onError: (e) =>
        setAviso({ tipo: 'error', texto: mensajeDeApi(e, 'No fue posible reintentar el envío.') }),
    })
  }

  function reintentarTodos() {
    setAviso(null)
    fallidos.mutate(undefined, {
      onSuccess: (r) =>
        setAviso(
          r.siguenFallando > 0
            ? {
                tipo: 'error',
                texto: `Se reintentaron ${r.reintentados} envíos: ${r.enviados} enviados y ${r.siguenFallando} siguen fallando.`,
              }
            : {
                tipo: 'exito',
                texto: `Se reintentaron ${r.reintentados} envíos y todos se enviaron.`,
              },
        ),
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Correos enviados"
        acciones={
          puedeReintentar && (
            <Boton tamano="sm" cargando={fallidos.isPending} onClick={reintentarTodos}>
              Reintentar fallidos
            </Boton>
          )
        }
      >
        <p className="text-cuerpo-13 text-texto-secundario">Registro de envíos de la revista</p>
      </EncabezadoPagina>

      <div role="status" aria-live="polite">
        {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      </div>

      {primerFallo && !aviso && (
        <Alerta
          tipo="error"
          titulo="Hay correos que no llegaron"
          accion={
            puedeReintentar ? (
              <Boton variante="secundario" tamano="sm" onClick={() => setCorrigiendo(primerFallo)}>
                Corregir y reenviar
              </Boton>
            ) : undefined
          }
        >
          La dirección {primerFallo.destinatario} rebotó.
        </Alerta>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaMetrica valor={datos?.enviados ?? '–'} etiqueta="Enviados" />
        <TarjetaMetrica
          valor={datos?.rebotados ?? '–'}
          etiqueta="Rebotados"
          alerta={(datos?.rebotados ?? 0) > 0}
        />
        <TarjetaMetrica
          valor={datos?.fallidos ?? '–'}
          etiqueta="Fallidos"
          alerta={(datos?.fallidos ?? 0) > 0}
        />
        <TarjetaMetrica valor={datos?.enCola ?? '–'} etiqueta="En cola" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ListaDesplegable
          etiqueta="Tipo de correo"
          valor={filtros.tipo ?? TODOS}
          onCambio={(v) => cambiar({ tipo: v === TODOS ? undefined : (v as TipoCorreo) })}
          opciones={[
            { valor: TODOS, etiqueta: 'Todos' },
            ...TIPOS_CORREO.map((t) => ({
              valor: t,
              etiqueta: ETIQUETA_TIPO_CORREO[t],
            })),
          ]}
        />
        <ListaDesplegable
          etiqueta="Resultado"
          valor={filtros.estado ?? TODOS}
          onCambio={(v) => cambiar({ estado: v === TODOS ? undefined : (v as EstadoCorreo) })}
          opciones={[
            { valor: TODOS, etiqueta: 'Todos' },
            ...ESTADOS_CORREO.map((e) => ({ valor: e, etiqueta: DEFINICIONES_ESTADO[e].texto })),
          ]}
        />
      </div>

      <EstadoConsulta
        cargando={false}
        error={lista.isError}
        onReintentar={() => void lista.refetch()}
        descripcion="el registro de correos"
      >
        <TablaCorreosRevista
          correos={datos?.items ?? []}
          cargando={lista.isPending}
          puedeReintentar={puedeReintentar}
          onVer={setViendo}
          onCorregir={setCorrigiendo}
          onReintentar={reintentarUno}
          vacio={
            hayFiltros
              ? 'Ningún correo coincide con los filtros.'
              : 'Aún no se han enviado correos desde esta revista.'
          }
        />
        {datos && datos.total > 0 && (
          <Paginacion
            pagina={filtros.pagina}
            porPagina={filtros.porPagina}
            total={datos.total}
            onCambiar={(pagina) => cambiar({ pagina })}
          />
        )}
      </EstadoConsulta>

      <DetalleCorreoModal correo={viendo} onCerrar={() => setViendo(null)} />
      <CorregirCorreoModal
        correo={corrigiendo}
        onCerrar={() => setCorrigiendo(null)}
        onReenviado={(texto) => setAviso({ tipo: 'exito', texto })}
      />
    </section>
  )
}
