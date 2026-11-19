/*
 * AccionesAsignacion — the actions available on an assigned peer, according to its status:
 *   invited / 2nd attempt → register the answer; when the last send bounced or failed, correct the
 *                           address and resend the invitation (RF-28). The 2nd attempt itself is
 *                           automatic (RF-29, D7): there is no reminder;
 *   accepted              → mark the delivery (with date);
 *   delivered             → issue the constancia (offered right after the delivery, RF-23; only once
 *                           the concept and the date are registered, which the delivery asks for);
 *                           once issued, download or resend it (HU-23). The concept can be changed.
 * Both profiles can do all of it (RNF-05).
 * Covers: RF-20, RF-22, RF-23, RF-28, RF-30, RF-32, RF-33, HU-14, HU-17, HU-19, HU-23.
 */
import { useState } from 'react'
import { ConceptoModal } from './ConceptoModal'
import { EntregaModal } from './EntregaModal'
import { RespuestaParModal } from './RespuestaParModal'
import { useReenviarInvitacion } from '../hooks/useAsignaciones'
import { EmitirConstanciaModal } from '@/modules/constancias/components/EmitirConstanciaModal'
import { useReenviarConstancia } from '@/modules/constancias/hooks/useConstancias'
import { descargarConstancia } from '@/modules/constancias/services/descarga'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { useRevista } from '@/lib/revista/useRevista'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import type { AsignacionDetalle } from '@/types/par'

export interface AccionesAsignacionProps {
  asignacion: AsignacionDetalle
}

type Dialogo = 'respuesta' | 'entrega' | 'concepto' | null

export function AccionesAsignacion({ asignacion }: AccionesAsignacionProps) {
  const puedeAsignar = usePermiso('asignar-pares')
  const puedeRespuesta = usePermiso('registrar-respuesta')
  const puedeEntrega = usePermiso('marcar-entrega')
  const puedeConcepto = usePermiso('registrar-concepto')
  const puedeEmitir = usePermiso('emitir-constancia')
  const reenviar = useReenviarInvitacion()
  const reemitir = useReenviarConstancia()
  const { revista } = useRevista()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [mensaje, setMensaje] = useState('')
  const [emitiendo, setEmitiendo] = useState<{ id: string; aviso?: string } | null>(null)

  const sinResponder = asignacion.estado === 'invitado' || asignacion.estado === 'segundo-intento'
  const nombre = asignacion.par.nombre

  // RF-28: the invitation is resent only when the previous send bounced or failed.
  const ultimo = asignacion.ultimoCorreo
  const fallo =
    ultimo && !ultimo.atendido && (ultimo.estado === 'rebotado' || ultimo.estado === 'fallido')
      ? ultimo.estado
      : null
  const emitida = asignacion.estado === 'entrego' && asignacion.constanciaEmitida

  function enviar() {
    setMensaje('')
    reenviar.mutate(asignacion.id, {
      onSuccess: ({ correo }) =>
        setMensaje(
          correo.estado === 'rebotado'
            ? `La dirección ${correo.destinatario} sigue rebotando. Corrija el correo del par.`
            : `Invitación reenviada a ${nombre}.`,
        ),
    })
  }

  async function descargar() {
    if (!asignacion.constanciaId) return
    await descargarConstancia(revista, asignacion.constanciaId, nombre)
  }

  function reenviarConstancia() {
    if (!asignacion.constanciaId) return
    setMensaje('')
    reemitir.mutate(asignacion.constanciaId, {
      onSuccess: ({ correo }) =>
        setMensaje(
          correo.estado === 'rebotado'
            ? `La dirección ${correo.destinatario} rebotó.`
            : `Constancia reenviada a ${nombre}.`,
        ),
    })
  }

  const hayAcciones =
    (sinResponder && ((puedeAsignar && fallo) || puedeRespuesta)) ||
    (asignacion.estado === 'acepto' && puedeEntrega) ||
    (asignacion.estado === 'entrego' && (puedeConcepto || puedeEmitir))

  return (
    <div className="flex flex-col items-end gap-2">
      {hayAcciones && (
        <div className="flex flex-wrap justify-end gap-2">
          {sinResponder && puedeAsignar && fallo === 'rebotado' && (
            <EnlaceBoton
              variante="neutro"
              tamano="sm"
              to={`/pares/${encodeURIComponent(asignacion.par.id)}`}
            >
              Corregir correo <span className="sr-only">de {nombre}</span>
            </EnlaceBoton>
          )}
          {sinResponder && puedeAsignar && fallo && (
            <Boton variante="secundario" tamano="sm" cargando={reenviar.isPending} onClick={enviar}>
              Reenviar invitación <span className="sr-only">a {nombre}</span>
            </Boton>
          )}
          {sinResponder && puedeRespuesta && (
            <Boton variante="neutro" tamano="sm" onClick={() => setDialogo('respuesta')}>
              Registrar respuesta <span className="sr-only">de {nombre}</span>
            </Boton>
          )}
          {asignacion.estado === 'acepto' && puedeEntrega && (
            <Boton variante="secundario" tamano="sm" onClick={() => setDialogo('entrega')}>
              Marcar entrega <span className="sr-only">de {nombre}</span>
            </Boton>
          )}
          {asignacion.estado === 'entrego' &&
            puedeEmitir &&
            !asignacion.constanciaEmitida &&
            asignacion.concepto &&
            asignacion.constanciaId && (
              <Boton
                tamano="sm"
                onClick={() =>
                  setEmitiendo({ id: asignacion.constanciaId ?? '', aviso: undefined })
                }
              >
                Emitir constancia <span className="sr-only">de {nombre}</span>
              </Boton>
            )}
          {emitida && (
            <Boton variante="neutro" tamano="sm" onClick={() => void descargar()}>
              Descargar constancia <span className="sr-only">de {nombre}</span>
            </Boton>
          )}
          {emitida && puedeEmitir && (
            <Boton
              variante="neutro"
              tamano="sm"
              cargando={reemitir.isPending}
              onClick={reenviarConstancia}
            >
              Reenviar constancia <span className="sr-only">a {nombre}</span>
            </Boton>
          )}
          {asignacion.estado === 'entrego' && puedeConcepto && (
            <Boton variante="secundario" tamano="sm" onClick={() => setDialogo('concepto')}>
              {asignacion.concepto ? 'Cambiar concepto' : 'Registrar concepto'}{' '}
              <span className="sr-only">de {nombre}</span>
            </Boton>
          )}
        </div>
      )}

      <p role="status" className="max-w-xs text-right text-cuerpo-13 text-texto-secundario">
        {reenviar.isError
          ? mensajeDeApi(reenviar.error, 'No fue posible enviar el correo.')
          : reemitir.isError
            ? mensajeDeApi(reemitir.error, 'No fue posible reenviar la constancia.')
            : mensaje}
      </p>

      <RespuestaParModal
        asignacion={asignacion}
        abierto={dialogo === 'respuesta'}
        onCerrar={() => setDialogo(null)}
        onRegistrada={setMensaje}
      />
      <EntregaModal
        asignacion={asignacion}
        abierto={dialogo === 'entrega'}
        onCerrar={() => setDialogo(null)}
        onRegistrada={(constanciaId) => {
          setMensaje(`Entrega de ${nombre} registrada.`)
          if (constanciaId && puedeEmitir) {
            setEmitiendo({
              id: constanciaId,
              aviso: 'Entrega registrada. ¿Emitir la constancia ahora?',
            })
          }
        }}
      />
      <EmitirConstanciaModal
        constanciaId={emitiendo?.id ?? null}
        nombrePar={nombre}
        aviso={emitiendo?.aviso}
        onCerrar={() => setEmitiendo(null)}
        onEmitida={setMensaje}
      />
      <ConceptoModal
        asignacion={asignacion}
        abierto={dialogo === 'concepto'}
        onCerrar={() => setDialogo(null)}
        onRegistrado={setMensaje}
      />
    </div>
  )
}
