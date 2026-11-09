/*
 * AccionesAsignacion — the actions available on an assigned peer, according to its status and
 * the user's profile:
 *   invited / 2nd attempt → resend the invitation, send a reminder, register the answer;
 *   accepted              → mark the delivery (with date);
 *   delivered             → register the concept.
 * The Auxiliar can assign and resend; answers, deliveries and concepts are Administradora-only.
 * Covers: RF-20, RF-22, RF-23, RF-28, RF-29 (reminder: simulated, still "En revisión"), HU-14,
 * HU-16, HU-19.
 */
import { useState } from 'react'
import { ConceptoModal } from './ConceptoModal'
import { EntregaModal } from './EntregaModal'
import { RespuestaParModal } from './RespuestaParModal'
import { useReenviarInvitacion } from '../hooks/useAsignaciones'
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
  const reenviar = useReenviarInvitacion()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [mensaje, setMensaje] = useState('')

  const sinResponder = asignacion.estado === 'invitado' || asignacion.estado === 'segundo-intento'
  const nombre = asignacion.par.nombre

  function enviar(tipo: 'reenvio' | 'recordatorio') {
    setMensaje('')
    reenviar.mutate(
      { asignacionId: asignacion.id, tipo },
      {
        onSuccess: ({ correo }) => {
          if (correo.estado === 'rebotado') {
            setMensaje(
              `La dirección ${correo.destinatario} rebotó. Corrija el correo del par y reenvíe.`,
            )
          } else if (tipo === 'recordatorio') {
            setMensaje(`Recordatorio a ${nombre} en cola de envío.`)
          } else {
            setMensaje(`Invitación reenviada a ${nombre}.`)
          }
        },
      },
    )
  }

  const hayAcciones =
    (sinResponder && (puedeAsignar || puedeRespuesta)) ||
    (asignacion.estado === 'acepto' && puedeEntrega) ||
    (asignacion.estado === 'entrego' && puedeConcepto)

  return (
    <div className="flex flex-col items-end gap-2">
      {hayAcciones && (
        <div className="flex flex-wrap justify-end gap-2">
          {sinResponder && puedeAsignar && (
            <>
              <Boton
                variante="secundario"
                tamano="sm"
                cargando={reenviar.isPending}
                onClick={() => enviar('reenvio')}
              >
                Reenviar invitación <span className="sr-only">a {nombre}</span>
              </Boton>
              <Boton
                variante="neutro"
                tamano="sm"
                disabled={reenviar.isPending}
                onClick={() => enviar('recordatorio')}
              >
                Recordatorio <span className="sr-only">a {nombre}</span>
              </Boton>
            </>
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
        onRegistrada={setMensaje}
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
