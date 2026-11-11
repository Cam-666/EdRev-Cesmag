/*
 * CuentaRemitente — the address the mails of one journal leave from (invitations, thank-you mails
 * and constancias). The credentials of the mail service are never shown (RNF-07).
 * Covers: RF-25, HU-17, RNF-07.
 */
import { useState } from 'react'
import { useGuardarCuenta } from '../hooks/useAdmin'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { CuentaRemitente as Cuenta } from '@/types/plantilla'

export interface CuentaRemitenteProps {
  cuenta: Cuenta
}

export function CuentaRemitente({ cuenta }: CuentaRemitenteProps) {
  const [remitente, setRemitente] = useState(cuenta.remitente)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarCuenta()
  const nombre = REVISTAS[cuenta.revista].nombreCorto

  return (
    <div className="flex flex-col gap-2">
      <CampoTexto
        etiqueta={nombre}
        type="email"
        value={remitente}
        error={
          mutacion.isError
            ? mensajeDeApi(mutacion.error, 'No fue posible guardar la cuenta.')
            : undefined
        }
        onChange={(e) => {
          setGuardada(false)
          setRemitente(e.target.value)
        }}
      />
      <div className="flex items-center gap-3">
        <Boton
          variante="secundario"
          tamano="sm"
          cargando={mutacion.isPending}
          disabled={remitente.trim() === cuenta.remitente}
          onClick={() =>
            mutacion.mutate(
              { revista: cuenta.revista, remitente },
              { onSuccess: () => setGuardada(true) },
            )
          }
        >
          Guardar<span className="sr-only"> la cuenta remitente de {nombre}</span>
        </Boton>
        <span role="status" className="text-cuerpo-13 text-estado-exito">
          {guardada ? 'Cuenta guardada.' : ''}
        </span>
      </div>
    </div>
  )
}
