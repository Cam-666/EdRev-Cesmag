/*
 * informes (controlador) — lee la revista y el periodo del informe de gestión y responde. Las cifras están
 * en servicios/informeGestion.
 */
import type { Request, Response } from 'express'
import * as informes from '../servicios/informeGestion.js'

const filtroDe = (req: Request) => String(req.query.revista ?? 'ambas')
const periodoDe = (req: Request) => (req.query.periodo === undefined ? undefined : String(req.query.periodo))

export function periodos(_req: Request, res: Response): void {
  res.json(informes.periodos())
}

export async function informe(req: Request, res: Response): Promise<void> {
  res.json(await informes.informeDeGestion(filtroDe(req), periodoDe(req)))
}

export async function pdf(req: Request, res: Response): Promise<void> {
  const { pdf: archivo, nombre } = await informes.informeEnPdf(filtroDe(req), periodoDe(req))
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`)
  res.send(Buffer.from(archivo))
}
