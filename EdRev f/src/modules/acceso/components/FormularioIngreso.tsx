/*
 * FormularioIngreso — formulario de ingreso (también «Reanudar sesión» después de un cierre por inactividad).
 * Muestra el contador de intentos fallidos y el bloqueo de 15 minutos que devuelve la API.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { esquemaIngreso } from '../config/esquemas'
import type { DatosIngreso } from '../config/esquemas'
import { useCuentaRegresiva } from '../hooks/useCuentaRegresiva'
import { useIniciarSesion } from '../hooks/useIniciarSesion'
import { useSesion } from '../hooks/useSesion'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoContrasena } from '@/components/common/CampoContrasena'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ErrorApi } from '@/lib/api/cliente'
import type { DetalleErrorIngreso } from '@/types/acceso'

export interface FormularioIngresoProps {
  /** Modo de reanudar después de un cierre por inactividad (cambia el texto del botón). */
  reanudar?: boolean
  correoInicial?: string
}

function detalleDeError(error: unknown): DetalleErrorIngreso | null {
  if (error instanceof ErrorApi && typeof error.cuerpo === 'object' && error.cuerpo !== null) {
    if ('motivo' in error.cuerpo) return error.cuerpo as DetalleErrorIngreso
  }
  return null
}

function mensajeDeError(error: unknown, hasta: string | null): string | null {
  if (!error) return null
  const detalle = detalleDeError(error)
  if (detalle?.motivo === 'credenciales') {
    return `Correo o contraseña incorrectos. Intento ${detalle.intento} de ${detalle.maximo}; al tercero la cuenta se bloquea ${POLITICA_ACCESO.bloqueoMinutos} minutos.`
  }
  if (detalle?.motivo === 'bloqueada') {
    const hora = hasta ? format(parseISO(hasta), 'HH:mm') : ''
    return `Cuenta bloqueada por ${POLITICA_ACCESO.bloqueoMinutos} minutos tras varios intentos fallidos. Podrá intentar de nuevo a las ${hora}.`
  }
  if (detalle?.motivo === 'inhabilitada') {
    return 'Su cuenta está inhabilitada. Comuníquese con la Administradora de la dependencia.'
  }
  return 'No fue posible iniciar sesión. Intente de nuevo en unos minutos.'
}

export function FormularioIngreso({
  reanudar = false,
  correoInicial = '',
}: FormularioIngresoProps) {
  const { iniciarSesion } = useSesion()
  const mutacion = useIniciarSesion()
  const bloqueo = useCuentaRegresiva(0)
  const [bloqueadoHasta, setBloqueadoHasta] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosIngreso>({
    resolver: zodResolver(esquemaIngreso),
    defaultValues: { correo: correoInicial, contrasena: '' },
  })

  const bloqueado = bloqueo.segundos > 0
  const mensaje = mensajeDeError(mutacion.error, bloqueadoHasta)

  function enviar(datos: DatosIngreso) {
    mutacion.mutate(
      { correo: datos.correo.trim().toLowerCase(), contrasena: datos.contrasena },
      {
        onSuccess: (respuesta) => iniciarSesion(respuesta),
        onError: (error) => {
          const detalle = detalleDeError(error)
          if (detalle?.motivo === 'bloqueada' && detalle.bloqueadoHasta) {
            setBloqueadoHasta(detalle.bloqueadoHasta)
            bloqueo.reiniciar((parseISO(detalle.bloqueadoHasta).getTime() - Date.now()) / 1000)
          }
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      {mensaje && <Alerta tipo="error">{mensaje}</Alerta>}
      <CampoTexto
        etiqueta="Correo institucional"
        type="email"
        autoComplete="username"
        placeholder={`nombre.apellido${POLITICA_ACCESO.dominioInstitucional}`}
        error={errors.correo?.message}
        {...register('correo')}
      />
      <CampoContrasena
        etiqueta="Contraseña"
        autoComplete="current-password"
        error={errors.contrasena?.message}
        {...register('contrasena')}
      />
      <Boton type="submit" className="w-full" cargando={mutacion.isPending} disabled={bloqueado}>
        {reanudar ? 'Reanudar sesión' : 'Ingresar'}
      </Boton>
      <Link to="/acceso/recuperar" className="text-center text-etiqueta-13 text-texto-enlace">
        ¿Olvidó su contraseña?
      </Link>
    </form>
  )
}
