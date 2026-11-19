/*
 * ArticuloComitePage — «Revisión del comité» tab (/:revista/articulos/:id/comite): the rounds of
 * the initial committee review and the form to register a new one with the anti-plagiarism report.
 * The result is decided by the system from the report and the observations: Aprobado (publicable)
 * takes the user straight to the assignment of peers; Rechazado (no publicable, matches above the
 * limit) does not close the process: the article stays in review and waits for another round (no
 * limit), like Requiere ajustes (publicable con observaciones); the committee can also approve a
 * round that is not publishable and move on to the peers.
 * After registering an article the user lands here with the form open (?registrar=1).
 * Covers: RF-05, RF-06, RF-07, HU-01 (criterion 5), HU-02, HU-03, HU-04.
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
              ? 'Ronda registrada: no publicable. El artículo sigue en revisión: registre otra ronda cuando el autor corrija, o apruebe una ronda si el comité decide continuar.'
              : 'Ronda registrada: publicable con observaciones (Requiere ajustes). Cuando el autor corrija, registre otra ronda.'}
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
