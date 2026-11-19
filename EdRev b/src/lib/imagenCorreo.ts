/*
 * imagenCorreo — the footer image of a mail template (the signature block of whoever sends it) is
 * shown in the mail through a public address of the API: mail clients cannot read images from the
 * database. The address carries a signature of the template, so only the images of templates that
 * go out in mails can be requested. For the image to show, API_PUBLICA_URL must be reachable from
 * the Internet (the deployed server).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

const firma = (idPlantilla: number) =>
  createHmac('sha256', `${config.jwtSecreto}:imagenes`).update(String(idPlantilla)).digest('hex').slice(0, 24)

export function enlaceImagenPie(idPlantilla: number): string {
  return `${config.urlApiPublica}/api/imagenes/plantillas/${idPlantilla}/pie?f=${firma(idPlantilla)}`
}

export function firmaValida(idPlantilla: number, recibida: unknown): boolean {
  if (typeof recibida !== 'string') return false
  const esperada = Buffer.from(firma(idPlantilla))
  const dada = Buffer.from(recibida)
  return esperada.length === dada.length && timingSafeEqual(esperada, dada)
}

/** The footer of a mail as HTML: the image of the template, below the text. */
export function pieHtml(idPlantilla: number): string {
  return `<div style="margin-top:20px"><img src="${enlaceImagenPie(idPlantilla)}" alt="Firma" style="display:block;max-width:100%;height:auto;border:0"></div>`
}
