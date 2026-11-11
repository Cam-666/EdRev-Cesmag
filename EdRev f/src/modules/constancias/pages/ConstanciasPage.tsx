/*
 * ConstanciasPage — Constancias (/:revista/constancias): pending and issued constancias of the
 * journal. "Emitir" opens the preview rendered from the template; "Emitir y enviar" generates the
 * document and sends it attached to the thank-you mail, leaving a trace in Correos enviados.
 * "Emitir pendientes" does the same for all of them. Issuing and reissuing are Administradora-only.
 * Covers: RF-30, RF-31, RF-32, RF-33, RF-34, HU-21..HU-24, RNF-05.
 */
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { TablaEmitidas, TablaPendientes } from '../components/TablaConstancias'
import { VistaPreviaConstancia } from '../components/VistaPreviaConstancia'
import {
  useConstancias,
  useEmitirConstancia,
  useEmitirPendientes,
  useReenviarConstancia,
  useVistaConstancia,
} from '../hooks/useConstancias'
import { descargarConstancia } from '../services/descarga'
import { obtenerVistaConstancia } from '../services/constanciasService'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { useRevista } from '@/lib/revista/useRevista'
import type { FilaConstancia, ResultadoEmision } from '@/types/constancia'

interface Aviso {
  tipo: 'exito' | 'error' | 'informacion'
  texto: string
}

function avisoDeEmision(r: ResultadoEmision, verbo: string): Aviso {
  return r.correo.estado === 'rebotado'
    ? {
        tipo: 'error',
        texto: `La constancia de ${r.constancia.par.nombre} se generó, pero la dirección ${r.correo.destinatario} rebotó. Corríjala en Correos enviados y reintente.`,
      }
    : {
        tipo: 'exito',
        texto: `${verbo} la constancia de ${r.constancia.par.nombre} y se envió a ${r.correo.destinatario}. Quedó registrada en Correos enviados.`,
      }
}

export function ConstanciasPage() {
  const { revista } = useRevista()
  const consulta = useConstancias()
  const puedeEmitir = usePermiso('emitir-constancia')
  const emitir = useEmitirConstancia()
  const masiva = useEmitirPendientes()
  const reenviar = useReenviarConstancia()
  const [elegida, setElegida] = useState<FilaConstancia | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)

  const pendientes = consulta.data?.pendientes ?? []
  const emitidas = consulta.data?.emitidas ?? []
  const vigente = elegida && pendientes.some((p) => p.id === elegida.id) ? elegida : null
  const vista = useVistaConstancia(vigente?.id ?? null)

  function emitirElegida() {
    if (!vigente) return
    setAviso(null)
    emitir.mutate(vigente.id, {
      onSuccess: (r) => {
        setAviso(avisoDeEmision(r, 'Se emitió'))
        setElegida(null)
      },
      onError: (e) =>
        setAviso({ tipo: 'error', texto: mensajeDeApi(e, 'No fue posible emitir la constancia.') }),
    })
  }

  function emitirTodas() {
    masiva.mutate(undefined, {
      onSuccess: (r) => {
        setConfirmando(false)
        setElegida(null)
        setAviso({
          tipo: r.fallidos > 0 ? 'error' : 'exito',
          texto:
            r.fallidos > 0
              ? `Se emitieron ${r.emitidas} constancias; ${r.fallidos} no se pudieron entregar por correo. Revíselas en Correos enviados.`
              : `Se emitieron y enviaron ${r.emitidas} constancias. Quedaron registradas en Correos enviados.`,
        })
      },
    })
  }

  async function descargar(fila: FilaConstancia) {
    const v = await obtenerVistaConstancia(revista, fila.id)
    descargarConstancia(v, fila.par.nombre)
  }

  function reenviarFila(fila: FilaConstancia) {
    setAviso(null)
    reenviar.mutate(fila.id, {
      onSuccess: (r) => setAviso(avisoDeEmision(r, 'Se reemitió')),
      onError: (e) =>
        setAviso({
          tipo: 'error',
          texto: mensajeDeApi(e, 'No fue posible reenviar la constancia.'),
        }),
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Constancias"
        acciones={
          puedeEmitir &&
          pendientes.length > 0 && (
            <Boton tamano="sm" onClick={() => setConfirmando(true)}>
              Emitir pendientes
            </Boton>
          )
        }
      >
        <p className="text-cuerpo-13 text-texto-secundario">
          Pendientes y emitidas de esta revista
        </p>
      </EncabezadoPagina>

      <div role="status" aria-live="polite">
        {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      </div>

      <EstadoConsulta
        cargando={false}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="las constancias"
      >
        <div
          className={cn(
            'grid grid-cols-1 gap-6',
            vigente && vista.data && 'xl:grid-cols-[1fr_360px]',
          )}
        >
          <div className="flex flex-col gap-6">
            <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3">
              <h2 id="titulo-pendientes" className="text-titulo-16">
                Pendientes de emisión
                {consulta.data && (
                  <span className="ml-2 text-cuerpo-13 text-texto-secundario">
                    ({pendientes.length})
                  </span>
                )}
              </h2>
              <TablaPendientes
                filas={pendientes}
                cargando={consulta.isPending}
                seleccionada={vigente?.id ?? null}
                onElegir={(f) => {
                  setAviso(null)
                  setElegida(f)
                }}
                puedeEmitir={puedeEmitir}
              />
            </section>

            <section aria-labelledby="titulo-emitidas" className="flex flex-col gap-3">
              <h2 id="titulo-emitidas" className="text-titulo-16">
                Emitidas
                {consulta.data && (
                  <span className="ml-2 text-cuerpo-13 text-texto-secundario">
                    ({emitidas.length})
                  </span>
                )}
              </h2>
              <TablaEmitidas
                filas={emitidas}
                cargando={consulta.isPending}
                onDescargar={(f) => void descargar(f)}
                onReenviar={puedeEmitir ? reenviarFila : null}
              />
            </section>
          </div>

          {vigente && vista.data && (
            <aside aria-labelledby="titulo-vista-constancia" className="flex h-fit flex-col gap-3">
              <h2 id="titulo-vista-constancia" className="text-titulo-16">
                Vista previa
              </h2>
              <VistaPreviaConstancia vista={vista.data} />
              <Boton onClick={emitirElegida} cargando={emitir.isPending}>
                Emitir y enviar
              </Boton>
            </aside>
          )}
        </div>
      </EstadoConsulta>

      <Modal
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        titulo="Emitir las constancias pendientes"
        descripcion={`Se generarán ${pendientes.length} constancias y cada una se enviará por correo a su par.`}
        acciones={
          <>
            <Boton variante="neutro" onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
            <Boton cargando={masiva.isPending} onClick={emitirTodas}>
              Emitir y enviar
            </Boton>
          </>
        }
      >
        {masiva.isError && (
          <Alerta tipo="error">{mensajeDeApi(masiva.error, 'No fue posible emitirlas.')}</Alerta>
        )}
      </Modal>
    </section>
  )
}
