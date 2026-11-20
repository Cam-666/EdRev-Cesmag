/*
 * correoCuentas — el correo con el enlace para definir una contraseña: la activación de una cuenta nueva y la
 * recuperación de «¿Olvidó su contraseña?». Estos correos no son parte de una evaluación, así que no están en
 * el registro de correos del modelo; van directo al servicio de correo, en segundo plano, desde la dirección de
 * REMITENTE_CUENTAS o, si no se define, desde el remitente de la primera revista. El enlace es la dirección de
 * la aplicación (FRONTEND_URL) más la ruta firmada.
 * Salen con el mismo marco institucional que los demás correos (escudo, franja de la dependencia, contacto y
 * avisos legales; ver lib/marcoCorreo.ts), con un botón «Definir mi contraseña» y el enlace escrito debajo.
 * También viaja una versión de solo texto para los clientes que no muestran HTML.
 */
import { config } from '../config.js'
import { pool } from '../db.js'
import type { MotivoEnlace } from '../lib/enlaces.js'
import { marcoInstitucional } from '../lib/marcoCorreo.js'

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * El cuerpo del correo como HTML, para ir dentro del marco institucional: saludo, explicación, el botón que abre
 * el enlace (con el enlace escrito debajo por si el cliente de correo no muestra botones) y la vigencia.
 */
export function cuerpoHtml(nombre: string, motivo: MotivoEnlace, url: string): string {
  const activacion = motivo === 'activacion'
  const p = 'margin:0 0 14px'
  return (
    `<p style="${p}">Apreciado(a) <b>${escapar(nombre)}</b>:</p>` +
    `<p style="${p}">${
      activacion
        ? 'Se creó una cuenta a su nombre en el Sistema de Gestión Editorial de la Universidad CESMAG. Para empezar a usarla, defina su contraseña.'
        : 'Recibimos una solicitud para definir una nueva contraseña de su cuenta en el Sistema de Gestión Editorial de la Universidad CESMAG.'
    }</p>` +
    `<div style="margin:18px 0"><a href="${escapar(url)}" style="display:inline-block;background:#0f4a8a;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;padding:12px 26px;border-radius:6px">Definir mi contraseña</a></div>` +
    `<p style="${p};font-size:13px;color:#555555">Si el botón no funciona, copie y pegue este enlace en su navegador:<br><a href="${escapar(url)}" style="color:#1155cc;word-break:break-all">${escapar(url)}</a></p>` +
    `<p style="${p}"><b>El enlace vence en 30 minutos y sirve una sola vez.</b> Si usted no lo solicitó, ignore este mensaje: su contraseña actual no cambia.</p>` +
    `<p style="margin:0">Cordialmente,<br>Dependencia de Editorial</p>`
  )
}

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
  if (!remitente) {
    console.error('Enlace de contraseña no enviado: no hay remitente (defina REMITENTE_CUENTAS o el correo de la primera revista)')
    return
  }
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY ?? '', 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: remitente, name: 'Editorial CESMAG' },
      to: [{ email: destinatario, name: nombre }],
      subject: asunto,
      htmlContent: marcoInstitucional({
        tipo: motivo,
        revista: 'Sistema de Gestión Editorial',
        contacto: remitente,
        contenido: cuerpoHtml(nombre, motivo, `${config.urlFrontend}${ruta}`),
      }),
      // Versión de solo texto para los clientes que no muestran HTML.
      textContent: texto,
    }),
  })
  if (!respuesta.ok) console.error(`Brevo ${respuesta.status} al enviar el enlace de contraseña: ${await respuesta.text()}`)
}

/** Envía el enlace sin hacer esperar a la petición el servicio de correo; si falla, solo se escribe en el registro del servidor. */
export function enviarEnlaceContrasena(destinatario: string, nombre: string, motivo: MotivoEnlace, ruta: string): void {
  enviar(destinatario, nombre, motivo, ruta).catch((e: unknown) =>
    console.error('Enlace de contraseña no enviado:', (e as Error).message),
  )
}
