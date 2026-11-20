/*
 * RecuperarEnviadoPage — Revise su correo (/acceso/recuperar/enviado): confirmación con la dirección enmascarada,
 * la vigencia del enlace y una cuenta regresiva para reenviar. Con la API simulada un enlace «Demostración» abre
 * la página que abriría el correo.
 */
import { Link, Navigate, useLocation } from 'react-router-dom'
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { ReenvioEnlace } from '../components/ReenvioEnlace'
import { TarjetaAcceso } from '../components/TarjetaAcceso'
import { Alerta } from '@/components/common/Alerta'
import { enmascararCorreo } from '@/lib/format'

interface EstadoNavegacion {
  correo?: string
  enlaceDemo?: string
}

export function RecuperarEnviadoPage() {
  const ubicacion = useLocation()
  const estado = ubicacion.state as EstadoNavegacion | null
  const correo = estado?.correo
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
      {estado?.enlaceDemo && (
        <Link to={estado.enlaceDemo} className="text-center text-etiqueta-13 text-texto-enlace">
          Demostración: abrir el enlace del correo
        </Link>
      )}
      <Link to="/acceso" className="text-center text-etiqueta-13 text-texto-enlace">
        Volver al inicio de sesión
      </Link>
      <ReenvioEnlace correo={correo} />
    </TarjetaAcceso>
  )
}
