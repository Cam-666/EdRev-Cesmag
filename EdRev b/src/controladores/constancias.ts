/*
 * constancias (controlador) — recibe y valida las peticiones sobre las constancias y responde. Las reglas
 * están en servicios/gestionConstancias.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as constancias from '../servicios/gestionConstancias.js'

/** Si el correo que lleva la constancia es el de agradecimiento (lo normal) o solo la constancia. */
const opciones = z.object({
  conAgradecimiento: z.boolean().default(true),
  // La plantilla de agradecimiento elegida.
  plantillaId: z.string().optional(),
})

const revistaDe = (req: Request) => idRevista(req.params.revista)
const constanciaDe = (req: Request) => idNumerico(req.params.id, 'Constancia')
/** Lo que pide la petición: si lleva agradecimiento y la elección de plantilla. */
function envioDe(req: Request) {
  const { conAgradecimiento, plantillaId } = opciones.parse(req.body ?? {})
  return { con: conAgradecimiento, eleccion: { plantillaId: plantillaId ? idNumerico(plantillaId, 'Plantilla') : undefined } }
}

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
  const { con, eleccion } = envioDe(req)
  res.json(await constancias.emitirPendientes(revistaDe(req), usuarioDe(req).id, con, eleccion))
}

export async function emitir(req: Request, res: Response): Promise<void> {
  const { con, eleccion } = envioDe(req)
  res.json(await constancias.emitirConstancia(revistaDe(req), constanciaDe(req), usuarioDe(req).id, con, eleccion))
}

export async function reenviar(req: Request, res: Response): Promise<void> {
  const { con, eleccion } = envioDe(req)
  res.json(await constancias.reenviarConstancia(revistaDe(req), constanciaDe(req), usuarioDe(req).id, con, eleccion))
}
