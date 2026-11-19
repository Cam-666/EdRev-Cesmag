/*
 * invitaciones (controlador) — the public answers of a peer from the buttons of the mail; the rules
 * are in servicios/invitacionesPar.
 */
import type { Request, Response } from 'express'
import * as invitaciones from '../servicios/invitacionesPar.js'

export async function ver(req: Request, res: Response): Promise<void> {
  res.json(await invitaciones.datosDeLaInvitacion(String(req.params.token)))
}

export async function responder(req: Request, res: Response): Promise<void> {
  res.json(await invitaciones.responderDesdeCorreo(String(req.params.token)))
}
