/*
 * FormularioRecuperar — request a password-recovery link. The answer never reveals whether the
 * account exists. Covers: RNF-11. No RF/HU yet for recovery (pending to incorporate).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { esquemaRecuperacion } from '../config/esquemas'
import type { DatosRecuperacion } from '../config/esquemas'
import { useSolicitarRecuperacion } from '../hooks/useSolicitarRecuperacion'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'

export interface FormularioRecuperarProps {
  onEnviado: (correo: string) => void
}

export function FormularioRecuperar({ onEnviado }: FormularioRecuperarProps) {
  const mutacion = useSolicitarRecuperacion()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosRecuperacion>({ resolver: zodResolver(esquemaRecuperacion) })

  function enviar({ correo }: DatosRecuperacion) {
    const limpio = correo.trim().toLowerCase()
    mutacion.mutate(limpio, { onSuccess: () => onEnviado(limpio) })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      {mutacion.isError && (
        <Alerta tipo="error">
          No fue posible enviar el enlace. Intente de nuevo en unos minutos.
        </Alerta>
      )}
      <CampoTexto
        etiqueta="Correo institucional"
        type="email"
        autoComplete="username"
        placeholder={`nombre.apellido${POLITICA_ACCESO.dominioInstitucional}`}
        error={errors.correo?.message}
        {...register('correo')}
      />
      <Boton type="submit" className="w-full" cargando={mutacion.isPending}>
        Enviar enlace de recuperación
      </Boton>
      <Link to="/acceso" className="text-center text-etiqueta-13 text-texto-enlace">
        Volver al inicio de sesión
      </Link>
    </form>
  )
}
