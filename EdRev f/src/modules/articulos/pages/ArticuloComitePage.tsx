/*
 * ArticuloComitePage — pestaña «Revisión del comité» (/:revista/articulos/:id/comite): las rondas de la revisión
 * inicial del comité y el formulario para registrar una nueva con el reporte antiplagio. El comité elige el
 * resultado (el formulario sugiere uno): Aprobado lleva al usuario directo a la asignación de pares; Rechazado y
 * Requiere ajustes no cierran el proceso: el artículo sigue en revisión y espera otra ronda (sin límite).
 * Al registrar un artículo, la persona llega aquí con el formulario abierto (?registrar=1).
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FormularioRonda } from '../components/FormularioRonda'
import { ListaRondas } from '../components/ListaRondas'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { puedeRegistrarRonda } from '@/lib/dominio/comite'
import { useRevista } from '@/lib/revista/useRevista'
import type { ResultadoRonda } from '@/types/articulo'

export function ArticuloComitePage() {
  const articulo = useArticuloActual()
  const { revista } = useRevista()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [aviso, setAviso] = useState<ResultadoRonda | null>(null)
  const puedeRegistrar =
    usePermiso('registrar-revision') &&
    puedeRegistrarRonda(articulo, articulo.asignaciones.length > 0)
  const abierto = puedeRegistrar && params.get('registrar') === '1'
  const base = `/${revista}/articulos/${encodeURIComponent(articulo.id)}`

  function abrir(valor: boolean) {
    const siguiente = new URLSearchParams(params)
    if (valor) siguiente.set('registrar', '1')
    else siguiente.delete('registrar')
    setParams(siguiente, { replace: true })
  }

  function guardada(resultado: ResultadoRonda) {
    if (resultado === 'aprobado') {
      navigate(`${base}/pares?asignar=1`)
      return
    }
    abrir(false)
    setAviso(resultado)
  }

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        nivel="h2"
        titulo="Revisión del comité"
        acciones={
          puedeRegistrar &&
          !abierto && (
            <Boton
              tamano="sm"
              onClick={() => {
                setAviso(null)
                abrir(true)
              }}
            >
              Registrar ronda
            </Boton>
          )
        }
      />
      <div role="status" aria-live="polite">
        {aviso && (
          <Alerta tipo="advertencia">
            {aviso === 'rechazado'
              ? 'Ronda registrada: Rechazado. El artículo sigue en revisión y no recibirá pares hasta que una ronda quede Aprobada: registre otra cuando el autor corrija.'
              : 'Ronda registrada: Requiere ajustes. Cuando el autor corrija, registre otra ronda.'}
          </Alerta>
        )}
      </div>
      {abierto && (
        <FormularioRonda
          articulo={articulo}
          onGuardada={guardada}
          onCancelar={() => abrir(false)}
        />
      )}
      <ListaRondas rondas={articulo.rondasComite} />
    </section>
  )
}
