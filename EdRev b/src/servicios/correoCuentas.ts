/*
 * correoCuentas — the mail with the link to define a password: the activation of a new account
 * (RF-40) and the recovery from «¿Olvidó su contraseña?» (RF-46). These mails are not part of an
 * evaluation, so they are not in the mail log of the model; they go straight to the mail service,
 * in the background (RNF-02), from the address in REMITENTE_CUENTAS or, if not set, from the
 * first journal's sender. The link is the app's address (FRONTEND_URL) plus the signed path.
 */
import { config } from '../config.js'
import { pool } from '../db.js'
import type { MotivoEnlace } from '../lib/enlaces.js'

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function textoEnlace(nombre: string, motivo: MotivoEnlace, url: string) {
  const activacion = motivo === 'activacion'
  return {
    asunto: activacion ? 'Active su cuenta · Editorial CESMAG' : 'Recupere su contraseña · Editorial CESMAG',
    texto:
      `Apreciado(a) ${nombre}:\n\n` +
      (activacion
        ? 'Se creó una cuenta a su nombre en el sistema editorial de la Universidad CESMAG. '
        : 'Recibimos una solicitud para definir una nueva contraseña de su cuenta. ') +
      `Defina su contraseña en este enlace:\n\n${url}\n\n` +
      'El enlace vence en 30 minutos y sirve una sola vez. Si usted no lo solicitó, ignore este mensaje.\n\n' +
      'Dependencia de Editorial',
  }
}

async function enviar(destinatario: string, nombre: string, motivo: MotivoEnlace, ruta: string): Promise<void> {
  const modo = process.env.CORREO_MODO
  if (modo !== 'brevo' && modo !== 'simulado') return
  const { asunto, texto } = textoEnlace(nombre, motivo, `${config.urlFrontend}${ruta}`)
  if (modo === 'simulado') {
    console.log(`[correo simulado] ${motivo} → ${destinatario}: ${asunto}`)
    return
  }
  const remitente =
    process.env.REMITENTE_CUENTAS ??
    (await pool.query<{ correo_remitente: string }>('SELECT correo_remitente FROM revista ORDER BY id_revista LIMIT 1')).rows[0]
      ?.correo_remitente
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY ?? '', 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: remitente, name: 'Editorial CESMAG' },
      to: [{ email: destinatario, name: nombre }],
      subject: asunto,
      htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px">${escapar(texto).replace(/\n/g, '<br>')}</div>`,
    }),
  })
  if (!respuesta.ok) console.error(`Brevo ${respuesta.status} al enviar el enlace de contraseña: ${await respuesta.text()}`)
}

/** Sends the link without making the request wait for the mail service; a failure is only logged. */
export function enviarEnlaceContrasena(destinatario: string, nombre: string, motivo: MotivoEnlace, ruta: string): void {
  enviar(destinatario, nombre, motivo, ruta).catch((e: unknown) =>
    console.error('Enlace de contraseña no enviado:', (e as Error).message),
  )
}
