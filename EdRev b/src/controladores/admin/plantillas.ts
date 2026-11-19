/*
 * plantillas (controlador) — receives and validates the requests about the templates (RF-45) and
 * answers; the rules are in servicios/administracion/plantillas.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico } from '../../lib/http.js'
import * as plantillas from '../../servicios/administracion/plantillas.js'

const revista = z.enum(['reep', 'ire'])
const uso = z.enum(['invitacion', 'agradecimiento', 'constancia'])

const nueva = z
  .object({
    revista,
    nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla').max(80, 'Máximo 80 caracteres'),
    uso: uso.optional(),
    clase: z.enum(['correo', 'archivo']).optional(),
    usarAhora: z.boolean().optional(),
  })
  .refine((x) => x.uso || x.clase, { message: 'Elija para qué se usará la plantilla' })

const edicion = z.object({
  asunto: z.string().nullable(),
  cuerpo: z.string(),
  correoFirma: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, 'Escriba un correo válido')
    .optional(),
})

const idDe = (req: Request) => idNumerico(req.params.id, 'Plantilla')

export async function listar(_req: Request, res: Response): Promise<void> {
  res.json(await plantillas.listarPlantillas())
}

export async function crear(req: Request, res: Response): Promise<void> {
  res.status(201).json(await plantillas.crearPlantilla(nueva.parse(req.body)))
}

export async function asignar(req: Request, res: Response): Promise<void> {
  const { uso: elegido } = z.object({ uso }).parse(req.body)
  res.json(await plantillas.asignarUso(idDe(req), elegido))
}

export async function eliminar(req: Request, res: Response): Promise<void> {
  await plantillas.eliminarPlantilla(idDe(req))
  res.status(204).end()
}

export async function guardar(req: Request, res: Response): Promise<void> {
  res.json(await plantillas.guardarPlantilla(idDe(req), edicion.parse(req.body)))
}

export async function subirImagen(req: Request, res: Response): Promise<void> {
  const parte = plantillas.parteDe(req.params.parte)
  res.json(await plantillas.subirImagen(idDe(req), parte, req.file?.buffer))
}

export async function quitarImagen(req: Request, res: Response): Promise<void> {
  const parte = plantillas.parteDe(req.params.parte)
  res.json(await plantillas.quitarImagen(idDe(req), parte))
}

export async function vistaCorreo(req: Request, res: Response): Promise<void> {
  const datos = z
    .object({
      revista,
      uso: z.enum(['invitacion', 'agradecimiento']),
      cuerpo: z.string(),
      plantilla: z.coerce.number().int().positive().optional(),
    })
    .parse(req.body)
  res.json(await plantillas.vistaCorreo(datos))
}

async function enviarPdf(id: number, cuerpo: string | undefined, res: Response): Promise<void> {
  const pdf = await plantillas.vistaPdf(id, cuerpo)
  res.type('application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="vista-previa.pdf"')
  res.send(Buffer.from(pdf))
}

export async function vistaPdfGuardada(req: Request, res: Response): Promise<void> {
  await enviarPdf(idDe(req), undefined, res)
}

export async function vistaPdfBorrador(req: Request, res: Response): Promise<void> {
  const { cuerpo } = z.object({ cuerpo: z.string().optional() }).parse(req.body)
  await enviarPdf(idDe(req), cuerpo, res)
}
