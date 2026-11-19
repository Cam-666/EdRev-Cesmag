/*
 * imagenCorreo — the signature image of a mail template (the block of whoever sends it) is
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

/** The signature of a mail as HTML (the image closes the mail, below the data notice). */
export function firmaHtml(origen: string): string {
  return `<img src="${origen}" alt="Firma" width="608" style="display:block;width:100%;max-width:608px;height:auto;border:0">`
}

/** The signature of a real mail: through the public address of the API. */
export function pieHtml(idPlantilla: number): string {
  return firmaHtml(enlaceImagenPie(idPlantilla))
}
