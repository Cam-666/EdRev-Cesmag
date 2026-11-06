/*
 * RecuperarPage — Recuperar contraseña (/acceso/recuperar).
 * Covers: RNF-11. No RF/HU yet: password recovery is a pending requirement to incorporate.
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
        onEnviado={(correo) => navigate('/acceso/recuperar/enviado', { state: { correo } })}
      />
    </TarjetaAcceso>
  )
}
