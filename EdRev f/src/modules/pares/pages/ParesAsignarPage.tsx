/*
 * ParesAsignarPage — Asignar par evaluador (/:revista/pares/asignar?articulo=…&par=…): shows the
 * peer, the order it will take (first, second, third or tiebreaker), the conflict-of-interest
 * warning (which never blocks) and the invitation exactly as it will be sent. "Asignar y enviar"
 * saves the assignment and the invitation goes out by itself.
 * Covers: RF-17, RF-19, RF-21, RF-24, RF-25, RF-27, HU-12, HU-13, HU-17, HU-18.
 */
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { VistaPreviaCorreo } from '../components/VistaPreviaCorreo'
import { useAsignarPar, useVistaPreviaInvitacion } from '../hooks/useAsignaciones'
import { usePar } from '../hooks/usePares'
import { useArticulo } from '@/modules/articulos/hooks/useArticulo'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { mensajeDeApi } from '@/lib/api/errores'
import { useRevista } from '@/lib/revista/useRevista'
import type { EstadoTrasAsignar } from '../config/navegacion'

const ORDINAL = ['primer par', 'segundo par', 'tercer par', 'cuarto par', 'quinto par']

function ordinal(orden: number): string {
  return ORDINAL[orden - 1] ?? `par ${orden}`
}

export function ParesAsignarPage() {
  const { revista } = useRevista()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const articuloId = params.get('articulo') ?? ''
  const parId = params.get('par') ?? ''

  const articulo = useArticulo(articuloId)
  const par = usePar(parId)
  const vista = useVistaPreviaInvitacion(articuloId, parId)
  const asignar = useAsignarPar(articuloId)

  if (!articuloId) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-titulo-24">Asignar par evaluador</h1>
        <Alerta
          tipo="informacion"
          accion={
            <EnlaceBoton variante="secundario" tamano="sm" to={`/${revista}/articulos`}>
              Ir a los artículos
            </EnlaceBoton>
          }
        >
          Para asignar un par, abra la ficha de un artículo y use «Asignar par» en la pestaña Pares
          y evaluación.
        </Alerta>
      </section>
    )
  }
  if (!parId) {
    return <Navigate to={`/${revista}/pares?articulo=${encodeURIComponent(articuloId)}`} replace />
  }

  const fichaPares = `/${revista}/articulos/${encodeURIComponent(articuloId)}/pares`
  const cargando = articulo.isPending || par.isPending || vista.isPending
  const falloGrave = (articulo.isError || par.isError) && !cargando

  function confirmar() {
    if (!par.data) return
    asignar.mutate(parId, {
      onSuccess: (resultado) => {
        const estado: EstadoTrasAsignar = {
          envio: {
            parId,
            nombre: par.data?.nombre ?? '',
            destinatario: resultado.correo.destinatario,
            estado: resultado.correo.estado,
          },
        }
        navigate(fichaPares, { state: estado })
      },
    })
  }

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-titulo-24">Asignar par evaluador</h1>
        <p className="text-cuerpo-13 text-texto-secundario">
          {articulo.data ? `${articulo.data.numeroOjs} · ${articulo.data.titulo}` : articuloId}
        </p>
      </header>

      <EstadoConsulta
        cargando={cargando && !falloGrave}
        error={falloGrave}
        onReintentar={() => {
          void articulo.refetch()
          void par.refetch()
        }}
        descripcion="los datos de la asignación"
      >
        {vista.isError ? (
          <Alerta
            tipo="error"
            titulo="No se puede asignar este par"
            accion={
              <EnlaceBoton variante="secundario" tamano="sm" to={fichaPares}>
                Volver al artículo
              </EnlaceBoton>
            }
          >
            {mensajeDeApi(vista.error, 'No fue posible preparar la invitación.')}
          </Alerta>
        ) : (
          vista.data &&
          par.data && (
            <>
              <section
                aria-labelledby="titulo-par-elegido"
                className="rounded-lg border border-borde-base bg-superficie-tarjeta p-4 shadow-tarjeta"
              >
                <h2 id="titulo-par-elegido" className="text-titulo-16">
                  {par.data.nombre}
                </h2>
                <p className="text-cuerpo-13 text-texto-secundario">
                  {par.data.universidad} · {par.data.area}
                </p>
              </section>

              {vista.data.conflicto && (
                <Alerta tipo="advertencia" titulo="Posible conflicto de interés">
                  {vista.data.conflicto.mensaje}
                </Alerta>
              )}

              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Orden</dt>
                  <dd className="text-cuerpo-15">
                    {vista.data.orden} ·{' '}
                    {vista.data.esDesempate ? 'par de desempate' : ordinal(vista.data.orden)}
                  </dd>
                </div>
                <div>
                  <dt className="text-micro-11 uppercase text-texto-secundario">Plantilla</dt>
                  <dd className="text-cuerpo-15">Invitación a evaluar</dd>
                </div>
              </dl>

              <VistaPreviaCorreo vista={vista.data} />

              {asignar.isError && (
                <Alerta tipo="error">
                  {mensajeDeApi(
                    asignar.error,
                    'No fue posible guardar la asignación. Intente de nuevo.',
                  )}
                </Alerta>
              )}

              <div className="flex justify-end gap-2">
                <EnlaceBoton variante="neutro" to={fichaPares}>
                  Cancelar
                </EnlaceBoton>
                <Boton onClick={confirmar} cargando={asignar.isPending}>
                  Asignar y enviar
                </Boton>
              </div>
            </>
          )
        )}
      </EstadoConsulta>
    </section>
  )
}
