/*
 * ParDetallePage — Ficha del par evaluador (/:revista/pares/:id): data, availability, the
 * authorization of data treatment with its date, delivered evaluations, unanswered invitations and
 * every participation with concept and constancia. Edit, block / unblock and assign from here.
 * Covers: RF-15, RF-16, RF-18, RNF-06, HU-23 (constancias visible from the peer's record).
 */
import { BotonVolver } from '@/components/common/BotonVolver'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { BloquearParModal } from '../components/BloquearParModal'
import { DesbloquearParModal } from '../components/DesbloquearParModal'
import { ParModal } from '../components/ParModal'
import { TablaParticipaciones } from '../components/TablaParticipaciones'
import { ETIQUETA_MOTIVO } from '../config/listas'
import { usePar } from '../hooks/usePares'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { ErrorApi } from '@/lib/api/cliente'
import { formatearFecha } from '@/lib/format'
import { useRevista } from '@/lib/revista/useRevista'

export function ParDetallePage() {
  const { revista } = useRevista()
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const articulo = params.get('articulo')
  const consulta = usePar(id)
  const puedeEditar = usePermiso('registrar-datos')
  const puedeAsignar = usePermiso('asignar-pares')
  const puedeBloquear = usePermiso('bloquear-par')
  const puedeDesbloquear = usePermiso('desbloquear-par')
  const [editando, setEditando] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const [desbloqueando, setDesbloqueando] = useState(false)

  if (consulta.error instanceof ErrorApi && consulta.error.estado === 404) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-titulo-24">Par evaluador no encontrado</h1>
        <Alerta
          tipo="advertencia"
          accion={
            <EnlaceBoton variante="secundario" tamano="sm" to={`/${revista}/pares`}>
              Volver a la base
            </EnlaceBoton>
          }
        >
          No existe ese par en la base de esta revista.
        </Alerta>
      </section>
    )
  }

  const par = consulta.data
  const bloqueado = par?.bloqueo != null

  return (
    <EstadoConsulta
      cargando={consulta.isPending}
      error={consulta.isError}
      onReintentar={() => void consulta.refetch()}
      descripcion="el par evaluador"
    >
      {par && (
        <section className="flex flex-col gap-6">
          <BotonVolver to={`/${revista}/pares`}>Volver a pares evaluadores</BotonVolver>
          <EncabezadoPagina
            titulo={par.nombre}
            acciones={
              <>
                {articulo && puedeAsignar && !bloqueado && (
                  <EnlaceBoton
                    tamano="sm"
                    to={`/${revista}/pares/asignar?articulo=${encodeURIComponent(articulo)}&par=${encodeURIComponent(par.id)}`}
                  >
                    Asignar
                  </EnlaceBoton>
                )}
                {puedeEditar && (
                  <Boton variante="neutro" tamano="sm" onClick={() => setEditando(true)}>
                    Editar
                  </Boton>
                )}
                {bloqueado
                  ? puedeDesbloquear && (
                      <Boton variante="neutro" tamano="sm" onClick={() => setDesbloqueando(true)}>
                        Desbloquear
                      </Boton>
                    )
                  : puedeBloquear && (
                      <Boton variante="peligro" tamano="sm" onClick={() => setBloqueando(true)}>
                        Bloquear
                      </Boton>
                    )}
              </>
            }
          >
            <p className="text-cuerpo-13 text-texto-secundario">Par evaluador de esta revista</p>
          </EncabezadoPagina>

          {par.bloqueo && (
            <Alerta tipo="error" titulo="Par bloqueado">
              {ETIQUETA_MOTIVO[par.bloqueo.motivo]} · desde el {formatearFecha(par.bloqueo.fecha)}.
              No recibe nuevas invitaciones.
            </Alerta>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
            <section
              aria-labelledby="titulo-datos-par"
              className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
            >
              <h2 id="titulo-datos-par" className="text-titulo-16">
                Datos del par
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Profesión</dt>
                  <dd className="text-cuerpo-15">{par.profesion || 'Sin registrar'}</dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Correo</dt>
                  <dd className="text-cuerpo-15">{par.correo}</dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Área</dt>
                  <dd className="text-cuerpo-15">{par.area}</dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Universidad</dt>
                  <dd className="text-cuerpo-15">{par.universidad}</dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Estado</dt>
                  <dd>
                    <DistintivoEstado estado={bloqueado ? 'bloqueado' : 'disponible'} />
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-labelledby="titulo-resumen-par"
              className="h-fit rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
            >
              <h2 id="titulo-resumen-par" className="mb-3 text-titulo-16">
                Resumen
              </h2>
              <dl className="flex flex-col gap-3">
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">
                    Evaluaciones entregadas
                  </dt>
                  <dd className="text-titulo-24">{par.evaluacionesEntregadas}</dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">
                    Invitaciones sin responder
                  </dt>
                  <dd className="text-titulo-24">{par.invitacionesSinResponder}</dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">
                    Última participación
                  </dt>
                  <dd className="text-cuerpo-15">
                    {par.ultimaParticipacion ? formatearFecha(par.ultimaParticipacion) : '--'}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section aria-labelledby="titulo-participaciones" className="flex flex-col gap-3">
            <h2 id="titulo-participaciones" className="text-titulo-16">
              Participaciones
            </h2>
            <TablaParticipaciones revista={revista} participaciones={par.participaciones} />
          </section>

          <ParModal abierto={editando} onCerrar={() => setEditando(false)} par={par} />
          <BloquearParModal par={par} abierto={bloqueando} onCerrar={() => setBloqueando(false)} />
          <DesbloquearParModal
            par={desbloqueando ? par : null}
            onCerrar={() => setDesbloqueando(false)}
          />
        </section>
      )}
    </EstadoConsulta>
  )
}
