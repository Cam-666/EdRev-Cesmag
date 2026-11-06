/*
 * RecuperarEnviadoPage — Revise su correo (/acceso/recuperar/enviado): confirmation with the
 * masked address, link validity and a resend countdown.
 * Covers: RNF-11. No RF/HU yet: password recovery is a pending requirement to incorporate.
 */
import { Link, Navigate, useLocation } from 'react-router-dom'
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { ReenvioEnlace } from '../components/ReenvioEnlace'
import { TarjetaAcceso } from '../components/TarjetaAcceso'
import { Alerta } from '@/components/common/Alerta'
import { enmascararCorreo } from '@/lib/format'

interface EstadoNavegacion {
  correo?: string
}

export function RecuperarEnviadoPage() {
  const ubicacion = useLocation()
  const correo = (ubicacion.state as EstadoNavegacion | null)?.correo
  if (!correo) return <Navigate to="/acceso/recuperar" replace />

  return (
    <TarjetaAcceso
      titulo="Revise su correo"
      subtitulo="Si la cuenta existe, recibirá un enlace en los próximos minutos"
    >
      <Alerta tipo="exito">
        Enlace enviado a {enmascararCorreo(correo)}. Caduca en {POLITICA_ACCESO.enlaceCaducaMinutos}{' '}
        minutos y solo puede usarse una vez.
      </Alerta>
      <Link to="/acceso" className="text-center text-etiqueta-13 text-texto-enlace">
        Volver al inicio de sesión
      </Link>
      <ReenvioEnlace correo={correo} />
    </TarjetaAcceso>
  )
}
