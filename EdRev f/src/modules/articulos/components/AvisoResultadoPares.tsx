/*
 * AvisoResultadoPares — el aviso de la ficha cuando los pares ya calificaron el artículo, según el proceso de la
 * dependencia (en todos los casos se emite la constancia de cada par al marcar su entrega):
 * - «Publicable»: se pueden asignar el volumen y el número para cerrar el proceso como aprobado.
 * - «Publicable con modificaciones sustanciales»: el artículo pasa a la siguiente ronda del comité.
 * - «No publicable»: pregunta si se abre una ronda del comité. «Sí» lo devuelve al comité (como con
 *   modificaciones); «No», después de confirmar, cierra el proceso y el artículo queda rechazado definitivamente.
 * Después de decidir, el aviso dice qué se hizo. En la nueva revisión del comité, las rondas siguen hasta que una lo
 * apruebe; entonces se asignan el volumen y el número (los pares ya evaluaron: no se buscan más).
 */
import { useState } from 'react'
import { useDecidirNoPublicable } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { ModalConfirmacion } from '@/components/common/ModalConfirmacion'
import { mensajeDeApi } from '@/lib/api/errores'
import { aprobadoPorComite } from '@/lib/dominio/comite'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { useRevista } from '@/lib/revista/useRevista'
import type { ArticuloDetalle } from '@/types/articulo'

const CONSTANCIAS = ' Emita la constancia de cada par desde la pestaña «Pares y evaluación».'

export function AvisoResultadoPares({
  articulo,
  onAsignarPublicacion,
}: {
  articulo: ArticuloDetalle
  /** Abre «Cerrar proceso» para registrar el volumen y el número. */
  onAsignarPublicacion: () => void
}) {
  const { revista } = useRevista()
  const puedeCerrar = usePermiso('cerrar-articulo')
  const decidir = useDecidirNoPublicable(articulo.id)
  const [confirmando, setConfirmando] = useState(false)
  const resultado = articulo.resultadoPares
  const estado = articulo.estado
  const irAlComite = (
    <EnlaceBoton
      variante="secundario"
      tamano="sm"
      to={`/${revista}/articulos/${encodeURIComponent(articulo.id)}/comite`}
    >
      Ir a la revisión del comité
    </EnlaceBoton>
  )

  if (resultado === 'publicable') {
    if (!['en-revision', 'en-evaluacion', 'aprobado'].includes(estado)) return null
    const abierto = estado !== 'aprobado'
    return (
      <Alerta
        tipo="exito"
        titulo="Resultado de la evaluación por pares"
        accion={
          abierto && puedeCerrar ? (
            <Boton variante="secundario" tamano="sm" onClick={onAsignarPublicacion}>
              Asignar volumen y número
            </Boton>
          ) : undefined
        }
      >
        {abierto
          ? 'Los pares evaluadores calificaron el artículo como publicable. Ya puede asignarle el volumen y el número para cerrar el proceso como aprobado.'
          : 'Los pares evaluadores calificaron el artículo como publicable y el proceso se cerró como aprobado.'}
        {CONSTANCIAS}
      </Alerta>
    )
  }

  // Después de los pares, el comité revisa de nuevo: ronda tras ronda hasta aprobarlo; luego, volumen y número.
  if (
    (resultado === 'publicable-con-modificaciones' || resultado === 'no-publicable') &&
    estado === 'en-revision'
  ) {
    const aprobado = aprobadoPorComite(articulo)
    return (
      <Alerta
        tipo={aprobado ? 'exito' : 'informacion'}
        titulo="Nueva revisión del comité"
        accion={
          aprobado && puedeCerrar ? (
            <Boton variante="secundario" tamano="sm" onClick={onAsignarPublicacion}>
              Asignar volumen y número
            </Boton>
          ) : aprobado ? undefined : (
            irAlComite
          )
        }
      >
        {aprobado
          ? 'El comité editorial aprobó el artículo después de la evaluación de los pares. Ya puede asignarle el volumen y el número para cerrar el proceso como aprobado.'
          : 'El comité editorial está revisando de nuevo el artículo después de la evaluación de los pares. Registre otra ronda cuando los autores lo corrijan; cuando una ronda lo apruebe, podrá asignarle el volumen y el número.'}
      </Alerta>
    )
  }

  if (resultado === 'publicable-con-modificaciones') {
    if (estado !== 'postulado') return null
    return (
      <Alerta tipo="informacion" titulo="Resultado de la evaluación por pares" accion={irAlComite}>
        Los pares evaluadores calificaron el artículo como publicable con modificaciones
        sustanciales. Con su constancia termina la participación de los pares; el artículo pasa a la
        siguiente ronda del comité editorial, que verificará si los autores lo corrigieron y
        decidirá si se aprueba su publicación.{CONSTANCIAS}
      </Alerta>
    )
  }

  if (resultado !== 'no-publicable') return null

  // Pendiente de decisión: la pregunta, con «Sí» y «No».
  if (estado === 'en-evaluacion') {
    const entregaron = articulo.asignaciones.filter((a) => a.estado === 'entrego').length
    const quienes =
      entregaron > 2 ? 'la mayoría de los pares evaluadores' : 'ambos pares evaluadores'
    return (
      <>
        <Alerta
          tipo="advertencia"
          titulo="Resultado de la evaluación por pares"
          accion={
            puedeCerrar ? (
              <div className="flex flex-wrap gap-2">
                <Boton
                  tamano="sm"
                  cargando={decidir.isPending && decidir.variables === true}
                  onClick={() => decidir.mutate(true)}
                >
                  Sí
                </Boton>
                <Boton variante="secundario" tamano="sm" onClick={() => setConfirmando(true)}>
                  No
                </Boton>
              </div>
            ) : undefined
          }
        >
          Este artículo acaba de ser calificado como «No publicable» por {quienes}. ¿Desea abrir una
          ronda de revisión de comité?
          {decidir.isError && !confirmando && (
            <span className="mt-1 block text-estado-error">
              {mensajeDeApi(
                decidir.error,
                'No fue posible registrar la decisión. Intente de nuevo.',
              )}
            </span>
          )}
        </Alerta>
        <ModalConfirmacion
          abierto={confirmando}
          onCerrar={() => setConfirmando(false)}
          onConfirmar={() => decidir.mutate(false, { onSuccess: () => setConfirmando(false) })}
          titulo="Rechazar el artículo"
          descripcion="El proceso se cerrará y el artículo quedará rechazado definitivamente. ¿Desea continuar?"
          etiquetaConfirmar="Sí, rechazar el artículo"
          cargando={decidir.isPending && decidir.variables === false}
          error={
            decidir.isError
              ? mensajeDeApi(decidir.error, 'No fue posible cerrar el proceso. Intente de nuevo.')
              : null
          }
        />
      </>
    )
  }

  if (estado === 'postulado') {
    return (
      <Alerta tipo="informacion" titulo="Resultado de la evaluación por pares" accion={irAlComite}>
        Los pares evaluadores calificaron el artículo como no publicable y se abrió una nueva ronda
        de revisión del comité, que decidirá el destino del artículo.{CONSTANCIAS}
      </Alerta>
    )
  }

  if (estado === 'rechazado') {
    return (
      <Alerta tipo="informacion" titulo="Resultado de la evaluación por pares">
        Los pares evaluadores calificaron el artículo como no publicable y se decidió no abrir otra
        ronda del comité: el proceso se cerró y el artículo quedó rechazado.{CONSTANCIAS}
      </Alerta>
    )
  }
  return null
}
