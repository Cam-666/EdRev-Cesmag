/*
 * envioCorreos — sends the queued mails (RNF-02: in the background, never blocking the page).
 * Every few seconds it takes the mails «en cola», builds them with the journal's template in use
 * (RF-25, RF-31; the thank-you mail carries the constancia in PDF) and sends them through Brevo
 * from the journal's sender address. The result is recorded: «enviado», «rebotado» (the address does
 * not exist) or «fallido» (the service failed; it can be retried).
 *
 * Modes (env CORREO_MODO):
 *  - brevo     → real sending; needs BREVO_API_KEY and senders verified in Brevo.
 *  - simulado  → nothing leaves; the mails are marked «enviado» (demo without a mail account).
 *  - apagado   → the mails stay «en cola» (default if nothing is configured).
 */
import { pool } from '../db.js'
import { generarConstancia } from './constanciaPdf.js'

type Modo = 'brevo' | 'simulado' | 'apagado'
const modo = (): Modo => {
  const m = process.env.CORREO_MODO
  return m === 'brevo' || m === 'simulado' ? m : 'apagado'
}

interface Pendiente {
  id_correo: number
  tipo: 'invitacion' | 'agradecimiento'
  destinatario: string
  id_revista: number
  revista: string
  remitente: string
  numero_ojs: string
  titulo: string
  par: string
  profesion: string | null
  universidad: string | null
  asunto: string | null
  cuerpo: string | null
}

function rellenar(texto: string, v: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '')
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function enviarBrevo(p: Pendiente, asunto: string, texto: string, adjunto?: Uint8Array) {
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY ?? '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: p.remitente, name: p.revista },
      to: [{ email: p.destinatario, name: p.par }],
      subject: asunto,
      htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px">${escapar(texto).replace(/\n/g, '<br>')}</div>`,
      attachment: adjunto
        ? [{ name: 'constancia.pdf', content: Buffer.from(adjunto).toString('base64') }]
        : undefined,
    }),
  })
  if (respuesta.ok) return 'enviado'
  const detalle = await respuesta.text()
  console.error(`Brevo ${respuesta.status}: ${detalle}`)
  // A malformed or nonexistent address is «rebotado» (correct it); anything else, «fallido».
  return respuesta.status === 400 && /email/i.test(detalle) ? 'rebotado' : 'fallido'
}

async function procesar(): Promise<void> {
  const { rows } = await pool.query<Pendiente>(
    `SELECT c.id_correo, c.tipo, c.destinatario, a.id_revista, r.nombre AS revista,
            r.correo_remitente AS remitente, a.numero_ojs, a.titulo, p.nombre AS par, p.profesion,
            p.universidad, pl.asunto, pl.cuerpo
       FROM correo c
       JOIN evaluacion e ON e.id_evaluacion = c.id_evaluacion
       JOIN articulo a ON a.id_articulo = e.id_articulo
       JOIN revista r ON r.id_revista = a.id_revista
       JOIN par_evaluador p ON p.id_par = e.id_par
       LEFT JOIN plantilla pl ON pl.id_revista = a.id_revista AND pl.tipo = c.tipo AND pl.en_uso
      WHERE c.resultado = 'en-cola' ORDER BY c.fecha_envio LIMIT 20`,
  )
  for (const p of rows) {
    const v = {
      revista: p.revista,
      numero: p.numero_ojs,
      par: p.par,
      profesion: p.profesion ?? '',
      universidad: p.universidad ?? '',
      articulo: p.titulo,
    }
    const asunto = rellenar(p.asunto ?? 'Editorial · {{revista}}', v)
    const texto = rellenar(p.cuerpo ?? '', v)
    let resultado: 'enviado' | 'rebotado' | 'fallido'
    try {
      if (modo() === 'simulado') {
        resultado = 'enviado'
        console.log(`[correo simulado] ${p.tipo} → ${p.destinatario}: ${asunto}`)
      } else {
        const adjunto =
          p.tipo === 'agradecimiento'
            ? await generarConstancia(pool, { par: p.par, articulo: p.titulo, idRevista: p.id_revista })
            : undefined
        resultado = await enviarBrevo(p, asunto, texto, adjunto)
      }
    } catch (e) {
      console.error('Envío fallido:', (e as Error).message)
      resultado = 'fallido'
    }
    await pool.query('UPDATE correo SET resultado = $1, fecha_envio = now() WHERE id_correo = $2', [
      resultado,
      p.id_correo,
    ])
  }
}

/** Starts the background sender (no-op when CORREO_MODO is «apagado»). */
export function iniciarEnvioCorreos(): void {
  if (modo() === 'apagado') {
    console.log('Envío de correos apagado: quedan «En cola» (CORREO_MODO=brevo o simulado para enviarlos).')
    return
  }
  console.log(`Envío de correos: modo ${modo()}`)
  let ocupado = false
  setInterval(() => {
    if (ocupado) return
    ocupado = true
    procesar()
      .catch((e: unknown) => console.error('Cola de correos:', (e as Error).message))
      .finally(() => {
        ocupado = false
      })
  }, 5_000)
}
