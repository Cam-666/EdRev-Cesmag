/*
 * configuracion (controlador) — recibe y valida lo que ajusta la Administradora (días de espera, ISSN e
 * indexaciones) y responde. Las reglas están en servicios/administracion/configuracion.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idRevista } from '../../lib/http.js'
import { usuarioDe } from '../../middlewares/autenticacion.js'
import * as configuracion from '../../servicios/administracion/configuracion.js'

const dias = z.object({
  diasEspera: z.number().min(0.0001, 'Escriba los días de espera').max(60, 'Máximo 60 días'),
})

const datosRevista = z.object({
  issn: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{3}[\dXx])?$/, 'El ISSN tiene la forma 1234-567X'),
  indexaciones: z.string().trim().max(1500, 'Máximo 1500 caracteres'),
})

export async function obtener(_req: Request, res: Response): Promise<void> {
  res.json(await configuracion.obtenerConfiguracion())
}

export async function cambiarDias(req: Request, res: Response): Promise<void> {
  const { diasEspera } = dias.parse(req.body)
  res.json(await configuracion.cambiarDiasEspera(diasEspera, usuarioDe(req).id))
}

export async function cambiarRevista(req: Request, res: Response): Promise<void> {
  const id = idRevista(req.params.sigla)
  res.json(await configuracion.cambiarDatosRevista(id, datosRevista.parse(req.body), usuarioDe(req).id))
}
