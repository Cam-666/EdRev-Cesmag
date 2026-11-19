/*
 * AccesoPage — Iniciar sesión (/acceso), with its two Figma variants: wrong credentials /
 * lockout (alert inside the form) and "Su sesión expiró" after 30 minutes of inactivity.
 * Covers: RF-39, HU-28, RNF-04, RNF-05, RNF-11.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { FormularioIngreso } from '../components/FormularioIngreso'
import { TarjetaAcceso } from '../components/TarjetaAcceso'
import { useSesion } from '../hooks/useSesion'
import { Alerta } from '@/components/common/Alerta'

interface EstadoNavegacion {
  desde?: string
  /** Set by «Definir contraseña» right after saving the new password. */
  correo?: string
  contrasenaDefinida?: boolean
}

export function AccesoPage() {
  const { usuario, ultimoCierre } = useSesion()
  const ubicacion = useLocation()
  const estado = ubicacion.state as EstadoNavegacion | null
  const desde = estado?.desde

  if (usuario) return <Navigate to={desde ?? '/inicio'} replace />

  const expirada = ultimoCierre?.motivo === 'inactividad'
  return (
    <TarjetaAcceso
      titulo={expirada ? 'Su sesión expiró' : 'Sistema de Gestión Editorial'}
      subtitulo={
        expirada
          ? 'Vuelva a ingresar para continuar donde quedó'
          : 'Ingrese con su correo institucional'
      }
    >
      {expirada && (
        <Alerta tipo="informacion">
          Sesión cerrada por {POLITICA_ACCESO.inactividadMinutos} minutos de inactividad. El trabajo
          guardado se conserva.
        </Alerta>
      )}
      {estado?.contrasenaDefinida && (
        <Alerta tipo="exito">Contraseña guardada. Ya puede ingresar.</Alerta>
      )}
      <FormularioIngreso
        reanudar={expirada}
        correoInicial={estado?.correo ?? ultimoCierre?.correo}
      />
    </TarjetaAcceso>
  )
}
