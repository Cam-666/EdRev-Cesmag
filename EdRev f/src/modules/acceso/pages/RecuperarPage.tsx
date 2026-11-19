/*
 * RecuperarPage — Recuperar contraseña (/acceso/recuperar).
 * Covers: RF-46, HU-28 (criterion 2), RNF-11.
 */
import { useNavigate } from 'react-router-dom'
import { FormularioRecuperar } from '../components/FormularioRecuperar'
import { TarjetaAcceso } from '../components/TarjetaAcceso'

export function RecuperarPage() {
  const navigate = useNavigate()
  return (
    <TarjetaAcceso
      titulo="Recuperar contraseña"
      subtitulo="Le enviaremos un enlace para crear una contraseña nueva"
    >
      <FormularioRecuperar
        onEnviado={(correo, enlaceDemo) =>
          navigate('/acceso/recuperar/enviado', { state: { correo, enlaceDemo } })
        }
      />
    </TarjetaAcceso>
  )
}
