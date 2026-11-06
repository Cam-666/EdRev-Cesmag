/*
 * listas — labels of the mail types, as the sent-mail log shows them. Covers: RF-26, HU-20
 * (the log distinguishes invitations, resends and thank-you mails).
 */
import type { TipoCorreo } from '@/types/historial'

export const ETIQUETA_TIPO_CORREO: Record<TipoCorreo, string> = {
  invitacion: 'Invitación a evaluar',
  reenvio: 'Reenvío de invitación',
  recordatorio: 'Recordatorio al par',
  agradecimiento: 'Agradecimiento con constancia',
}
