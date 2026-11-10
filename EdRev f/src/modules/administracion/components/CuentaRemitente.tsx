/*
 * CuentaRemitente — the sender account of one journal: the provisional account used now (editable)
 * and the institutional one foreseen ("Pendiente de TI"). The credentials are never shown: they are
 * stored encrypted and outside the code (RNF-07). Covers: RF-25, HU-17, RNF-07.
 */
import { useState } from 'react'
import { useGuardarCuenta } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { CuentaRemitente as Cuenta } from '@/types/plantilla'

export interface CuentaRemitenteProps {
  cuenta: Cuenta
}

export function CuentaRemitente({ cuenta }: CuentaRemitenteProps) {
  const [provisional, setProvisional] = useState(cuenta.provisional)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarCuenta()
  const nombre = REVISTAS[cuenta.revista].nombreCorto

  return (
    <div className="flex flex-col gap-3 rounded-md border border-borde-base p-4">
      <p className="flex items-center justify-between text-cuerpo-15-enfasis">
        {nombre}
        <span className="text-cuerpo-13 text-texto-secundario">Provisional</span>
      </p>
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible guardar la cuenta.')}
        </Alerta>
      )}
      <CampoTexto
        etiqueta={`Cuenta remitente de ${nombre}`}
        type="email"
        value={provisional}
        onChange={(e) => {
          setGuardada(false)
          setProvisional(e.target.value)
        }}
      />
      <div className="flex items-center gap-3">
        <Boton
          variante="secundario"
          tamano="sm"
          cargando={mutacion.isPending}
          onClick={() =>
            mutacion.mutate(
              { revista: cuenta.revista, provisional },
              { onSuccess: () => setGuardada(true) },
            )
          }
        >
          Guardar cuenta<span className="sr-only"> de {nombre}</span>
        </Boton>
        <span role="status" className="text-cuerpo-13 text-estado-exito">
          {guardada ? 'Cuenta guardada.' : ''}
        </span>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-cuerpo-13 text-texto-secundario">
        Institucional prevista: {cuenta.institucionalPrevista}
        <DistintivoEstado
          estado={cuenta.estadoInstitucional === 'autorizada' ? 'aprobado' : 'pendiente'}
        />
        {cuenta.estadoInstitucional === 'pendiente-ti' && <span>Pendiente de TI</span>}
      </p>
    </div>
  )
}
