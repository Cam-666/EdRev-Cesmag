/*
 * constancias (controlador) — receives and validates the requests about the constancias and
 * answers; the rules are in servicios/gestionConstancias.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as constancias from '../servicios/gestionConstancias.js'

/** Whether the mail that carries the constancia is the thank-you mail (default) or only the constancia. */
const opciones = z.object({ conAgradecimiento: z.boolean().default(true) })

const revistaDe = (req: Request) => idRevista(req.params.revista)
const constanciaDe = (req: Request) => idNumerico(req.params.id, 'Constancia')
const conAgradecimiento = (req: Request) => opciones.parse(req.body ?? {}).conAgradecimiento

export async function listar(req: Request, res: Response): Promise<void> {
  res.json(await constancias.listarConstancias(revistaDe(req)))
}

export async function vistaPrevia(req: Request, res: Response): Promise<void> {
  res.json(await constancias.vistaPreviaConstancia(revistaDe(req), constanciaDe(req)))
}

export async function pdf(req: Request, res: Response): Promise<void> {
  const { pdf: archivo, nombre } = await constancias.descargarConstancia(revistaDe(req), constanciaDe(req))
  res.type('application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`)
  res.send(Buffer.from(archivo))
}

export async function emitirPendientes(req: Request, res: Response): Promise<void> {
  res.json(await constancias.emitirPendientes(revistaDe(req), usuarioDe(req).id, conAgradecimiento(req)))
}

export async function emitir(req: Request, res: Response): Promise<void> {
  res.json(await constancias.emitirConstancia(revistaDe(req), constanciaDe(req), usuarioDe(req).id, conAgradecimiento(req)))
}

export async function reenviar(req: Request, res: Response): Promise<void> {
  res.json(await constancias.reenviarConstancia(revistaDe(req), constanciaDe(req), usuarioDe(req).id, conAgradecimiento(req)))
}
