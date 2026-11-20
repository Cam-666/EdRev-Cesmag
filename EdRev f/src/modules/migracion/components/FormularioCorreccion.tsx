/*
 * FormularioCorreccion — corrige un dato migrado: el valor se elige de su lista cerrada (tipo, estado, concepto)
 * o se escribe (el correo del par, que el Excel no trajo).
 */
import { useState } from 'react'
import { ETIQUETA_CAMPO, OPCIONES_CAMPO } from '../config/campos'
import { useCorregirRegistro } from '../hooks/usePorCorregir'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { mensajeDeApi } from '@/lib/api/errores'
import type { RegistroPorCorregir } from '@/types/migracion'

export interface FormularioCorreccionProps {
  registro: RegistroPorCorregir
  onCorregido: (registro: RegistroPorCorregir) => void
}

export function FormularioCorreccion({ registro, onCorregido }: FormularioCorreccionProps) {
  const [valor, setValor] = useState('')
  const [falta, setFalta] = useState(false)
  const corregir = useCorregirRegistro()
  const opciones = OPCIONES_CAMPO[registro.campo]
  const etiqueta = `${ETIQUETA_CAMPO[registro.campo]} de ${registro.descripcion}`
  const error = falta
    ? opciones
      ? 'Elija el valor correcto.'
      : 'Escriba el correo del par.'
    : corregir.isError
      ? mensajeDeApi(corregir.error, 'No fue posible guardar la corrección.')
      : undefined

  return (
    <form
      noValidate
      className="flex flex-wrap items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valor.trim()) {
          setFalta(true)
          return
        }
        setFalta(false)
        corregir.mutate({ id: registro.id, valor }, { onSuccess: () => onCorregido(registro) })
      }}
    >
      <div className="min-w-56 flex-1">
        {opciones ? (
          <ListaDesplegable
            etiqueta={etiqueta}
            etiquetaOculta
            opciones={opciones}
            valor={valor || undefined}
            onCambio={setValor}
            error={error}
          />
        ) : (
          <CampoTexto
            etiqueta={etiqueta}
            etiquetaOculta
            type="email"
            placeholder="nombre@universidad.edu.co"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            error={error}
          />
        )}
      </div>
      <Boton type="submit" variante="secundario" tamano="sm" cargando={corregir.isPending}>
        Guardar <span className="sr-only">la corrección de {registro.descripcion}</span>
      </Boton>
    </form>
  )
}
