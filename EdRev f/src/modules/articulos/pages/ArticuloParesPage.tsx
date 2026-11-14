/*
 * ArticuloParesPage — Pares y evaluación tab (/:revista/articulos/:id/pares): assigned peers in
 * order with status, concept, delivery date and their actions. Once the committee approved the
 * article, «Asignar par» opens the assignment panel (choose an available peer or register a new
 * candidate); the committee review lands here with it open (?asignar=1). An article has two
 * peers: with two (invited, accepted or delivered) no more are searched, and a third is allowed only
 * when their concepts do not coincide. Each assignment reports the invitation, a bounce or a warning.
 * Covers: RF-17, RF-19..RF-24, RF-27, RF-28, HU-13..HU-19.
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
import { puedeAsignarPares } from '@/lib/dominio/comite'
import { PARES_BASE, reglaPares } from '@/lib/dominio/pares'
import { useRevista } from '@/lib/revista/useRevista'
import type { ResultadoAsignacion } from '@/types/par'

export function ArticuloParesPage() {
  const { revista } = useRevista()
  const articulo = useArticuloActual()
  const [params, setParams] = useSearchParams()
  const [envio, setEnvio] = useState<ResultadoAsignacion | null>(null)
  const permiso = usePermiso('asignar-pares')

  const regla = reglaPares(articulo.asignaciones)
  const desempate = regla.desempate
  const aprobado = puedeAsignarPares(articulo)
  const puedeAsignar = permiso && aprobado && regla.puede
  const abierto = puedeAsignar && params.get('asignar') === '1'

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
          puedeAsignar &&
          !abierto && (
            <Boton
              tamano="sm"
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
            : 'El comité aún no aprueba el artículo.'}
        </p>
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
                to={`/${revista}/pares/${encodeURIComponent(envio.par.id)}`}
              >
                Corregir correo
              </EnlaceBoton>
            }
          >
            La dirección {envio.correo.destinatario} rebotó. La asignación de {envio.par.nombre} se
            conservó.
          </Alerta>
        )}
        {envio?.conflicto && (
          <Alerta tipo="advertencia" titulo="Conflicto posible">
            {envio.conflicto.mensaje}
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
