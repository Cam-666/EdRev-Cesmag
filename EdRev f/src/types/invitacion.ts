/*
 * Invitation answered from the mail — the three buttons of the invitation: accept, do not accept
 * this invitation, do not want to participate any more. Covers: RF-22, RF-15.
 */
import type { Revista } from './revista'

export type AccionCorreo = 'acepto' | 'no-acepto' | 'no-desea'

/** What the confirmation page shows for the link the peer opened. */
export interface InvitacionCorreo {
  accion: AccionCorreo
  /** Name of the journal. */
  revista: string
  sigla: Revista
  articulo: string
  par: string
  /** The invitation already has an answer: the link no longer applies. */
  respondida: boolean
}
