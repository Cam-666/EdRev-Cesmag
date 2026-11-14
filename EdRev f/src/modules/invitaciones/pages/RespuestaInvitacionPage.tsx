/*
 * RespuestaInvitacionPage — the page a button of the invitation mail opens (/invitacion?token=…).
 * The peer has no account: the page says what the button does and asks to confirm (so a mail
 * scanner that opens the link does not answer for the peer). «Acepto» accepts the article; «No acepto
 * esta invitación» only closes this invitation; «No deseo participar más» also stops future
 * invitations. An answered, expired or wrong link says so. Covers: RF-22, RF-15, RF-24, RNF-11.
 */
import { useSearchParams } from 'react-router-dom'
import { useConfirmarRespuesta, useInvitacion } from '../hooks/useInvitacion'
import { TarjetaAcceso } from '@/modules/acceso/components/TarjetaAcceso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ErrorApi } from '@/lib/api/cliente'
import { mensajeDeApi } from '@/lib/api/errores'
import type { AccionCorreo } from '@/types/invitacion'

const TEXTOS: Record<
  AccionCorreo,
  { titulo: string; pregunta: string; boton: string; gracias: string; variante: 'primario' | 'secundario' | 'peligro' }
> = {
  acepto: {
    titulo: 'Aceptar la invitación',
    pregunta: '¿Confirma que acepta evaluar este artículo?',
    boton: 'Sí, acepto evaluar este artículo',
    gracias: 'Registramos que aceptó. La dependencia de Editorial le enviará los documentos desde el OJS.',
    variante: 'primario',
  },
  'no-acepto': {
    titulo: 'No aceptar esta invitación',
    pregunta: '¿Confirma que no acepta evaluar este artículo? Podremos invitarlo(a) a otros.',
    boton: 'Confirmar: no acepto esta invitación',
    gracias: 'Registramos que no aceptó esta invitación. Gracias por responder.',
    variante: 'secundario',
  },
  'no-desea': {
    titulo: 'No participar más',
    pregunta:
      '¿Confirma que no desea participar más? No recibirá nuevas invitaciones de las revistas de la Universidad CESMAG.',
    boton: 'Confirmar: no deseo participar más',
    gracias: 'Registramos que no desea participar más. No recibirá nuevas invitaciones.',
    variante: 'peligro',
  },
}

const NO_VALIDO = {
  vencido: { titulo: 'El enlace venció', texto: 'Ya pasó el plazo de este enlace. Escriba a la dependencia de Editorial.' },
  invalido: { titulo: 'El enlace no es válido', texto: 'Revise que lo copió completo desde el correo.' },
}

function esVencido(error: unknown): boolean {
  return error instanceof ErrorApi && (error.cuerpo as { motivo?: string } | undefined)?.motivo === 'vencido'
}

export function RespuestaInvitacionPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const invitacion = useInvitacion(token)
  const confirmar = useConfirmarRespuesta(token)

  if (token === '' || invitacion.isError) {
    const { titulo, texto } = esVencido(invitacion.error) ? NO_VALIDO.vencido : NO_VALIDO.invalido
    return <TarjetaAcceso titulo={titulo} subtitulo={texto} />
  }
  if (invitacion.isPending) {
    return (
      <TarjetaAcceso titulo="Invitación a evaluar" subtitulo="Verificando el enlace…">
        <p role="status" className="text-center text-cuerpo-13 text-texto-secundario">
          Cargando…
        </p>
      </TarjetaAcceso>
    )
  }

  const datos = invitacion.data
  const texto = TEXTOS[datos.accion]

  if (confirmar.isSuccess) {
    return <TarjetaAcceso titulo="Gracias, ya registramos su respuesta" subtitulo={texto.gracias} />
  }
  if (datos.respondida) {
    return (
      <TarjetaAcceso
        titulo="Esta invitación ya fue respondida"
        subtitulo="El enlace ya no se puede usar. Si necesita cambiar su respuesta, escriba a la dependencia de Editorial."
      />
    )
  }

  return (
    <TarjetaAcceso titulo={texto.titulo} subtitulo={datos.revista}>
      <p className="text-cuerpo-15">
        Artículo: <strong>«{datos.articulo}»</strong>
      </p>
      <p className="text-cuerpo-15">{texto.pregunta}</p>
      {confirmar.isError && (
        <Alerta tipo="error">{mensajeDeApi(confirmar.error, 'No fue posible registrar su respuesta.')}</Alerta>
      )}
      <Boton variante={texto.variante} className="w-full" cargando={confirmar.isPending} onClick={() => confirmar.mutate()}>
        {texto.boton}
      </Boton>
    </TarjetaAcceso>
  )
}
