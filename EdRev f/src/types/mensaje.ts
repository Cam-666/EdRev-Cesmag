/**
 * Un mensaje que la dependencia escribe a mano a un par evaluador o a un autor, eligiendo una plantilla de tipo
 * «mensaje». Sale desde una revista (su remitente) y queda en el registro de correos enviados de esa revista.
 */
export interface DestinoMensaje {
  tipo: 'par' | 'autor'
  id: string
}

/** Una plantilla de mensaje que se puede elegir al enviar un correo. */
export interface PlantillaDeMensaje {
  id: string
  nombre: string
}

/** El correo tal como lo recibirá la persona, sin enviarlo todavía. */
export interface VistaPreviaMensaje {
  para: { nombre: string; correo: string | null }
  de: string
  asunto: string
  html: string
}

export interface MensajeEnviado {
  id: string
  estado: 'en-cola'
  destinatario: string
  nombre: string
}
