/*
 * ArticuloParesPage — pestaña Pares y evaluación (/:revista/articulos/:id/pares): los pares asignados en orden,
 * con su estado, concepto, fecha de entrega y acciones. «Asignar par» está siempre en la página para quien puede
 * asignar; se bloquea, con el motivo al lado, mientras el comité no haya aprobado el artículo o cuando el artículo
 * ya tiene sus dos pares. Cuando el comité aprobó el artículo abre el panel de asignación (elegir un par
 * disponible o registrar un candidato nuevo); la revisión del comité llega aquí con el panel abierto (?asignar=1).
 * Un artículo tiene dos pares: con dos (invitados, que aceptaron o que entregaron) no se buscan más, y un
 * tercero se permite solo cuando sus conceptos no coinciden. Cada asignación informa la invitación, un rebote o
 * una advertencia.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListaParesAsignados } from '../components/ListaParesAsignados'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { AsignarParPanel } from '@/modules/pares/components/AsignarParPanel'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { puedeAsignarPares, requiereNuevaRevision } from '@/lib/dominio/comite'
import { PARES_BASE, reglaPares } from '@/lib/dominio/pares'
import type { ResultadoAsignacion } from '@/types/par'

export function ArticuloParesPage() {
  const articulo = useArticuloActual()
  const [params, setParams] = useSearchParams()
  const [envio, setEnvio] = useState<ResultadoAsignacion | null>(null)
  const permiso = usePermiso('asignar-pares')

  const regla = reglaPares(articulo.asignaciones)
  const desempate = regla.desempate
  const aprobado = puedeAsignarPares(articulo)
  const puedeAsignar = permiso && aprobado && regla.puede
  const abierto = puedeAsignar && params.get('asignar') === '1'
  // Por qué está bloqueado el botón, mostrado a su lado (un botón bloqueado solo no se explica solo).
  const motivoBloqueo =
    requiereNuevaRevision(articulo) && articulo.resultadoPares === 'publicable-con-modificaciones'
      ? 'Los pares ya evaluaron el artículo; el comité editorial debe revisar si los autores lo corrigieron.'
      : requiereNuevaRevision(articulo)
        ? 'El proceso fue retomado y el comité editorial debe revisar de nuevo el artículo.'
        : !aprobado
          ? 'El comité editorial aún no ha aprobado el artículo.'
          : !regla.puede
            ? regla.motivo
            : null

  function abrir(valor: boolean) {
    const siguiente = new URLSearchParams(params)
    if (valor) siguiente.set('asignar', '1')
    else siguiente.delete('asignar')
    setParams(siguiente, { replace: true })
  }

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        nivel="h2"
        titulo="Pares y evaluación"
        acciones={
          permiso &&
          !abierto && (
            <Boton
              tamano="sm"
              disabled={!puedeAsignar}
              aria-describedby={motivoBloqueo ? 'motivo-asignar-par' : undefined}
              onClick={() => {
                setEnvio(null)
                abrir(true)
              }}
            >
              {desempate ? 'Asignar par de desempate' : 'Asignar par'}
            </Boton>
          )
        }
      >
        <p className="text-cuerpo-13 text-texto-secundario">
          {puedeAsignarPares(articulo) || articulo.asignaciones.length > 0
            ? `${Math.min(regla.lugares, PARES_BASE)} de ${PARES_BASE} pares evaluadores`
            : 'El comité editorial aún no ha aprobado el artículo.'}
        </p>
        {permiso && !abierto && motivoBloqueo && (
          <p id="motivo-asignar-par" className="text-cuerpo-13 text-texto-secundario">
            Asignar par no está disponible: {motivoBloqueo}
          </p>
        )}
      </EncabezadoPagina>

      <div role="status" aria-live="polite" className="flex flex-col gap-3">
        {aprobado && !regla.puede && (
          <Alerta tipo="informacion" titulo="El artículo ya tiene sus pares evaluadores">
            {regla.motivo}
          </Alerta>
        )}
        {envio && envio.correo.estado !== 'rebotado' && (
          <Alerta tipo="exito" titulo="Par asignado e invitación enviada">
            Se envió la invitación a {envio.par.nombre} ({envio.correo.destinatario}).
          </Alerta>
        )}
        {envio?.correo.estado === 'rebotado' && (
          <Alerta
            tipo="error"
            titulo="La invitación no se pudo entregar"
            accion={
              <EnlaceBoton
                variante="secundario"
                tamano="sm"
                to={`/pares/${encodeURIComponent(envio.par.id)}`}
              >
                Corregir correo
              </EnlaceBoton>
            }
          >
            La dirección {envio.correo.destinatario} rebotó. La asignación de {envio.par.nombre} se
            conservó.
          </Alerta>
        )}
      </div>

      {abierto && (
        <AsignarParPanel
          articuloId={articulo.id}
          esDesempate={desempate}
          onAsignado={setEnvio}
          onCerrar={() => abrir(false)}
        />
      )}

      <ListaParesAsignados asignaciones={articulo.asignaciones} />
    </section>
  )
}
