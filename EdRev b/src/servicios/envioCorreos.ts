/*
 * envioCorreos — envía los correos en cola, en segundo plano (nunca bloquea la página). Cada pocos segundos toma
 * los correos «en cola», los arma con la plantilla en uso de la revista (el de agradecimiento lleva la constancia
 * en PDF adjunta) y los envía por Brevo desde la dirección remitente de la revista. Se registra el resultado:
 * «enviado», «rebotado» (la dirección no existe) o «fallido» (falló el servicio). Un correo fallido vuelve solo
 * a la cola pasados unos minutos, hasta REINTENTOS_CORREO veces; después espera el reintento manual.
 *
 * Modos (variable CORREO_MODO):
 * - brevo     → envío real; necesita BREVO_API_KEY y remitentes verificados en Brevo.
 * - simulado  → no sale nada; los correos se marcan «enviado» (demostración sin cuenta de correo).
 * - apagado   → los correos quedan «en cola» (es lo que ocurre si no se configura nada).
 */
import { config } from '../config.js'
import { pool, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { aHtml } from '../lib/formato.js'
import { marcoInstitucional } from '../lib/marcoCorreo.js'
import { ACCIONES_CORREO, botonesHtml, enlaceRespuesta, MARCA_BOTONES } from '../lib/respuestas.js'
import { generarConstancia } from './constanciaPdf.js'

/** El correo que solo entrega la constancia (sin plantilla de agradecimiento): un texto fijo y corto. */
const TEXTO_SOLO_CONSTANCIA =
  'Apreciado(a) {{par}}:\n\nAdjuntamos su constancia como par evaluador del artículo «{{articulo}}».\n\nDependencia de Editorial'

type Modo = 'brevo' | 'simulado' | 'apagado'
const modo = (): Modo => {
  const m = process.env.CORREO_MODO
  return m === 'brevo' || m === 'simulado' ? m : 'apagado'
}

interface Pendiente {
  id_correo: number
  id_evaluacion: number
  tipo: 'invitacion' | 'agradecimiento' | 'constancia'
  destinatario: string
  id_revista: number
  id_articulo: number
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


async function enviarBrevo(p: Pendiente, asunto: string, html: string, adjunto?: Uint8Array) {
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
      htmlContent: html,
      attachment: adjunto
        ? [{ name: 'constancia.pdf', content: Buffer.from(adjunto).toString('base64') }]
        : undefined,
    }),
  })
  if (respuesta.ok) return 'enviado'
  const detalle = await respuesta.text()
  console.error(`Brevo ${respuesta.status}: ${detalle}`)
  // Una dirección mal escrita o inexistente es «rebotado» (hay que corregirla); cualquier otra falla es «fallido».
  return respuesta.status === 400 && /email/i.test(detalle) ? 'rebotado' : 'fallido'
}

async function procesar(): Promise<void> {
  const { rows } = await pool.query<Pendiente>(
    `SELECT c.id_correo, c.id_evaluacion, c.tipo, c.destinatario, a.id_revista, a.id_articulo, r.nombre AS revista,
            r.correo_remitente AS remitente, a.numero_ojs, a.titulo, p.nombre AS par, p.profesion,
            p.universidad, pl.asunto, pl.cuerpo
       FROM correo c
       JOIN evaluacion e ON e.id_evaluacion = c.id_evaluacion
       JOIN articulo a ON a.id_articulo = e.id_articulo
       JOIN revista r ON r.id_revista = a.id_revista
       JOIN par_evaluador p ON p.id_par = e.id_par
       LEFT JOIN plantilla pl ON pl.id_revista = a.id_revista AND pl.tipo = c.tipo AND c.tipo <> 'constancia'
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
      botones: MARCA_BOTONES,
    }
    const solo = p.tipo === 'constancia'
    // Sin la plantilla de su uso el correo saldría vacío (y una invitación sin botones); se marca fallido y se avisa en el registro.
    if (!solo && !p.cuerpo) {
      console.error(`Sin plantilla en uso para ${p.tipo} de ${p.revista}: el correo ${p.id_correo} no se envía`)
      await pool.query("UPDATE correo SET resultado = 'fallido', fecha_envio = now() WHERE id_correo = $1", [p.id_correo])
      await registrarFallo(pool, p.id_correo, p.id_revista, p.id_articulo)
      continue
    }
    const asunto = rellenar(p.asunto ?? (solo ? 'Constancia de participación · {{revista}}' : 'Editorial · {{revista}}'), v)
    const texto = rellenar(p.cuerpo ?? (solo ? TEXTO_SOLO_CONSTANCIA : ''), v)
    // Los botones de la invitación (acepto / no acepto / no desea) reemplazan la marca {{botones}}.
    const botones = p.tipo === 'invitacion' ? botonesHtml(p.id_evaluacion) : ''
    const html = marcoInstitucional({
      tipo: p.tipo,
      revista: p.revista,
      contacto: p.remitente,
      contenido: aHtml(texto, { marca: MARCA_BOTONES, html: botones }),
    })
    let resultado: 'enviado' | 'rebotado' | 'fallido'
    try {
      if (modo() === 'simulado') {
        resultado = 'enviado'
        console.log(`[correo simulado] ${p.tipo} → ${p.destinatario}: ${asunto}`)
        if (botones) {
          for (const a of ACCIONES_CORREO) console.log(`  botón «${a}»: ${enlaceRespuesta(p.id_evaluacion, a)}`)
        }
      } else {
        const adjunto =
          p.tipo !== 'invitacion'
            ? await generarConstancia(pool, { par: p.par, articulo: p.titulo, idRevista: p.id_revista })
            : undefined
        resultado = await enviarBrevo(p, asunto, html, adjunto)
      }
    } catch (e) {
      console.error('Envío fallido:', (e as Error).message)
      resultado = 'fallido'
    }
    await pool.query('UPDATE correo SET resultado = $1, fecha_envio = now() WHERE id_correo = $2', [
      resultado,
      p.id_correo,
    ])
    if (resultado === 'fallido') await registrarFallo(pool, p.id_correo, p.id_revista, p.id_articulo)
  }
  await reencolarFallidos(pool)
}

/** Cada falla deja una huella «fallo» del correo; las huellas son los intentos ya hechos. */
export async function registrarFallo(c: Cliente, idCorreo: number, revista: number, articulo: number): Promise<void> {
  await auditar(c, {
    usuario: null,
    tabla: 'correo',
    idRegistro: idCorreo,
    accion: 'fallo',
    texto: 'Falló el servicio de correo al enviar',
    revista,
    articulo,
  })
}

/**
 * Los correos que falló el servicio vuelven a la cola pasados `minutos` minutos, salvo que ya hayan fallado
 * `maximo` veces (entonces esperan el reintento manual) o que un correo más nuevo del mismo tipo los haya
 * reemplazado (dirección corregida). Devuelve cuántos.
 */
export async function reencolarFallidos(
  c: Cliente,
  minutos = config.minutosReintento,
  maximo = config.reintentosCorreo,
): Promise<number> {
  const { rowCount } = await c.query(
    `UPDATE correo SET resultado = 'en-cola'
      WHERE resultado = 'fallido'
        AND fecha_envio < now() - make_interval(mins => $1)
        AND NOT EXISTS (SELECT 1 FROM correo c2 WHERE c2.id_evaluacion = correo.id_evaluacion
                AND c2.tipo = correo.tipo AND c2.id_correo > correo.id_correo)
        AND (SELECT count(*) FROM auditoria au WHERE au.tabla_afectada = 'correo'
                AND au.id_registro = correo.id_correo::text AND au.accion = 'fallo') < $2`,
    [minutos, maximo],
  )
  return rowCount ?? 0
}

/** Arranca el envío en segundo plano (no hace nada si CORREO_MODO es «apagado»). */
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
