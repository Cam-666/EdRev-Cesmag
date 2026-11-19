/*
 * PanelAntiplagio — "Antiplagio y comité editorial" card of the Resumen tab: both percentages
 * (matches and AI, reported separately), the result of the most recent committee round and the
 * warning above 15 %. The warning never blocks and the AI percentage never triggers it.
 * Covers: RF-05, RF-36, HU-02, HU-04 (criterion 2).
 */
import { UMBRAL_COINCIDENCIAS } from '../config/listas'
import { superaUmbral } from '../config/reglas'
import { Alerta } from '@/components/common/Alerta'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { ultimaRonda } from '@/lib/dominio/comite'
import { useRevista } from '@/lib/revista/useRevista'
import type { ArticuloDetalle } from '@/types/articulo'

export interface PanelAntiplagioProps {
  articulo: ArticuloDetalle
}

export function PanelAntiplagio({ articulo }: PanelAntiplagioProps) {
  const { revista } = useRevista()
  const { coincidencias, atribuidoIa } = articulo
  const ronda = ultimaRonda(articulo)

  return (
    <section
      aria-labelledby="titulo-antiplagio"
      className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h2 id="titulo-antiplagio" className="text-titulo-16">
        Antiplagio y comité editorial
      </h2>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Coincidencias</dt>
          <dd className="text-cuerpo-15 text-texto-principal">
            {coincidencias === null ? 'Sin registrar' : `${coincidencias} %`}
          </dd>
        </div>
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Atribuido a IA</dt>
          <dd className="text-cuerpo-15 text-texto-principal">
            {atribuidoIa === null ? 'Sin registrar' : `${atribuidoIa} %`}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-micro-11 uppercase text-texto-secundario">Revisión del comité</dt>
          <dd className="mt-1 text-cuerpo-15 text-texto-principal">
            {ronda ? (
              <span className="flex flex-wrap items-center gap-2">
                Ronda {ronda.numero} <DistintivoEstado estado={ronda.resultado} />
              </span>
            ) : (
              'Sin registrar'
            )}
          </dd>
        </div>
      </dl>

      {coincidencias !== null && superaUmbral(coincidencias) && (
        <Alerta tipo="advertencia">
          Supera el {UMBRAL_COINCIDENCIAS} % aceptado. No bloquea el proceso.
        </Alerta>
      )}

      <div>
        <EnlaceBoton
          variante="secundario"
          tamano="sm"
          to={`/${revista}/articulos/${encodeURIComponent(articulo.id)}/comite`}
        >
          Ver la revisión del comité
        </EnlaceBoton>
      </div>
    </section>
  )
}
