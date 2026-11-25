/**
 * Un mensaje que la dependencia escribe a mano a un par evaluador o a un autor, eligiendo una plantilla de tipo
 * «mensaje». Sale desde una revista (su remitente) y queda en el registro de correos enviados de esa revista.
 */
export interface DestinoMensaje {
  tipo: 'par' | 'autor'
  id: string
}

/** Una plantilla de mensaje que se puede elegir al enviar un correo (su texto sirve de punto de partida al escribir). */
export interface PlantillaDeMensaje {
  id: string
  nombre: string
  asunto: string
  cuerpo: string
}

/** Lo que se envía: una plantilla de mensaje, o un texto escrito al enviar que no se guarda como plantilla. */
export type ContenidoMensaje =
  { plantillaId: string } | { texto: { asunto: string; cuerpo: string } }

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
