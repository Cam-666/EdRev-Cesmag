/*
 * invitaciones (controlador) — las respuestas públicas de un par desde los botones del correo. Las reglas
 * están en servicios/invitacionesPar.
 */
import type { Request, Response } from 'express'
import * as invitaciones from '../servicios/invitacionesPar.js'

export async function ver(req: Request, res: Response): Promise<void> {
  res.json(await invitaciones.datosDeLaInvitacion(String(req.params.token)))
}

export async function responder(req: Request, res: Response): Promise<void> {
  res.json(await invitaciones.responderDesdeCorreo(String(req.params.token)))
}
