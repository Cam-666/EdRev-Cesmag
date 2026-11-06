/*
 * PanelAntiplagio — "Antiplagio y comité editorial" card of the Resumen tab: both percentages
 * (matches and AI, reported separately), the committee reviews and the warning above 15 %.
 * The warning never blocks and the AI percentage never triggers it.
 * Covers: RF-05, RF-06, HU-02, HU-03.
 */
import { ETIQUETA_RESULTADO } from '../config/listas'
import { superaUmbral } from '../config/reglas'
import { UMBRAL_COINCIDENCIAS } from '../config/listas'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { useRevista } from '@/lib/revista/useRevista'
import type { ArticuloDetalle } from '@/types/articulo'

export interface PanelAntiplagioProps {
  articulo: ArticuloDetalle
}

export function PanelAntiplagio({ articulo }: PanelAntiplagioProps) {
  const { revista } = useRevista()
  const puedeEditar = usePermiso('registrar-revision')
  const { antiplagio, revisionInicial, revisionFinal } = articulo

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
            {antiplagio ? `${antiplagio.coincidencias} %` : 'Sin registrar'}
          </dd>
        </div>
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Atribuido a IA</dt>
          <dd className="text-cuerpo-15 text-texto-principal">
            {antiplagio ? `${antiplagio.atribuidoIa} %` : 'Sin registrar'}
          </dd>
        </div>
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Revisión inicial</dt>
          <dd className="text-cuerpo-15 text-texto-principal">
            {revisionInicial ? ETIQUETA_RESULTADO[revisionInicial.resultado] : 'Sin registrar'}
          </dd>
        </div>
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Revisión final</dt>
          <dd className="text-cuerpo-15 text-texto-principal">
            {revisionFinal ? ETIQUETA_RESULTADO[revisionFinal.resultado] : 'Sin registrar'}
          </dd>
        </div>
      </dl>

      {antiplagio &&
        (superaUmbral(antiplagio.coincidencias) ? (
          <Alerta tipo="advertencia">
            Supera el {UMBRAL_COINCIDENCIAS} % aceptado. No bloquea el proceso.
          </Alerta>
        ) : (
          <Alerta tipo="exito">
            Dentro del {UMBRAL_COINCIDENCIAS} % aceptado por la dependencia.
          </Alerta>
        ))}

      {puedeEditar && (
        <div>
          <EnlaceBoton
            variante="secundario"
            tamano="sm"
            to={`/${revista}/articulos/${encodeURIComponent(articulo.id)}/antiplagio`}
          >
            Editar antiplagio y revisión
          </EnlaceBoton>
        </div>
      )}
    </section>
  )
}
