/*
 * panel (controlador) — responde el tablero de una revista y el resumen de Inicio. Las cifras están en
 * servicios/panel.
 */
import type { Request, Response } from 'express'
import { idRevista } from '../lib/http.js'
import * as panel from '../servicios/panel.js'

export async function tablero(req: Request, res: Response): Promise<void> {
  res.json(await panel.tableroDeRevista(idRevista(req.params.revista)))
}

export async function resumen(_req: Request, res: Response): Promise<void> {
  res.json(await panel.resumenDeInicio())
}
