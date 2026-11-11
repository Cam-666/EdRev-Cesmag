/*
 * ArticuloParesPage — Pares y evaluación tab (/:revista/articulos/:id/pares): assigned peers in
 * order with status, concept, delivery date and their actions; "Asignar par" (and "Asignar
 * desempate" when the first two concepts contradict) lead to the assignment screen. Right after an
 * assignment it confirms the invitation, or warns that it bounced (the assignment is kept).
 * Covers: RF-19..RF-23, RF-24, RF-27, RF-28, HU-13..HU-19.
 */
import { useLocation } from 'react-router-dom'
import { ListaParesAsignados } from '../components/ListaParesAsignados'
import { MAX_PARES } from '../config/listas'
import { conceptosContradictorios, paresVigentes } from '../config/reglas'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { esEstadoTrasAsignar } from '@/modules/pares/config/navegacion'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { useRevista } from '@/lib/revista/useRevista'

export function ArticuloParesPage() {
  const { revista } = useRevista()
  const articulo = useArticuloActual()
  const { state } = useLocation()
  const puedeAsignar = usePermiso('asignar-pares')
  const envio = esEstadoTrasAsignar(state) ? state.envio : null

  const vigentes = paresVigentes(articulo.asignaciones)
  const [primero, segundo] = vigentes
  const hayLugar = vigentes.length < MAX_PARES
  const divergen = conceptosContradictorios(primero?.concepto ?? null, segundo?.concepto ?? null)
  const hacia = `/${revista}/pares?articulo=${encodeURIComponent(articulo.id)}`

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        nivel="h2"
        titulo="Pares y evaluación"
        acciones={
          puedeAsignar &&
          hayLugar &&
          articulo.estado !== 'archivado' && (
            <>
              <EnlaceBoton tamano="sm" to={hacia}>
                Asignar par
              </EnlaceBoton>
              {divergen && (
                <EnlaceBoton variante="secundario" tamano="sm" to={hacia}>
                  Asignar desempate
                </EnlaceBoton>
              )}
            </>
          )
        }
      />

      {envio?.estado === 'entregado' && (
        <Alerta tipo="exito" titulo="Par asignado e invitación enviada">
          Se envió la invitación a {envio.nombre} ({envio.destinatario}). Quedó registrada en el
          historial del artículo y en Correos enviados.
        </Alerta>
      )}
      {envio?.estado === 'en-cola' && (
        <Alerta tipo="informacion" titulo="Par asignado">
          La invitación a {envio.nombre} quedó en cola de envío.
        </Alerta>
      )}
      {envio?.estado === 'rebotado' && (
        <Alerta
          tipo="error"
          titulo="La invitación no se pudo entregar"
          accion={
            <EnlaceBoton
              variante="secundario"
              tamano="sm"
              to={`/${revista}/pares/${encodeURIComponent(envio.parId)}`}
            >
              Corregir correo
            </EnlaceBoton>
          }
        >
          La dirección {envio.destinatario} rebotó. La asignación de {envio.nombre} se conservó:
          corrija el correo del par y reenvíe la invitación.
        </Alerta>
      )}

      <ListaParesAsignados asignaciones={articulo.asignaciones} />
    </section>
  )
}
