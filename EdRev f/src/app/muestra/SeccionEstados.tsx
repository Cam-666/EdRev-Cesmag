/*
 * SeccionEstados — part of the design-system showcase (development only).
 * Covers: RNF-11, RNF-12.
 */
import { Seccion } from './Seccion'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { DistintivoEstado, DEFINICIONES_ESTADO } from '@/components/common/DistintivoEstado'
import type { EstadoDistintivo } from '@/components/common/DistintivoEstado'

export function SeccionEstados() {
  return (
    <>
      <Seccion titulo="DistintivoEstado (símbolo + texto)">
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(DEFINICIONES_ESTADO) as EstadoDistintivo[]).map((e) => (
            <li key={e}>
              <DistintivoEstado estado={e} />
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Alerta">
        <div className="flex flex-col gap-3">
          <Alerta tipo="informacion">
            Si la cuenta existe, recibirá un enlace en los próximos minutos.
          </Alerta>
          <Alerta tipo="advertencia" titulo="Antiplagio por encima del 15 %">
            Supera el 15 % aceptado. No bloquea el proceso.
          </Alerta>
          <Alerta
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm">
                Corregir y reenviar
              </Boton>
            }
          >
            La dirección j.rosero@umariana.edu.co rebotó.
          </Alerta>
          <Alerta tipo="exito">Invitación enviada a Óscar Iván Benavides.</Alerta>
        </div>
      </Seccion>
    </>
  )
}
