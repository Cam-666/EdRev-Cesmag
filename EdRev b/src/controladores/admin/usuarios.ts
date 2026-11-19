/*
 * usuarios (controlador) — receives and validates the requests about the user accounts (RF-40)
 * and answers; the rules are in servicios/administracion/usuarios.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico } from '../../lib/http.js'
import { usuarioDe } from '../../middlewares/autenticacion.js'
import * as usuarios from '../../servicios/administracion/usuarios.js'

const institucional = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@unicesmag\.edu\.co$/, 'Use un correo institucional @unicesmag.edu.co')

const perfil = z.enum(['administrador', 'auxiliar'])

const nuevo = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre'),
  correo: institucional,
  perfil,
})

const cambios = z.object({
  nombre: z.string().trim().min(1).optional(),
  correo: institucional.optional(),
  perfil: perfil.optional(),
  estado: z.enum(['activo', 'inhabilitado']).optional(),
})

export async function listar(_req: Request, res: Response): Promise<void> {
  res.json(await usuarios.listarUsuarios())
}

export async function crear(req: Request, res: Response): Promise<void> {
  const datos = nuevo.parse(req.body)
  res.status(201).json(await usuarios.crearUsuario(datos, usuarioDe(req).id))
}

export async function editar(req: Request, res: Response): Promise<void> {
  const id = idNumerico(req.params.id, 'Usuario')
  res.json(await usuarios.editarUsuario(id, cambios.parse(req.body), usuarioDe(req).id))
}

export async function eliminar(req: Request, res: Response): Promise<void> {
  await usuarios.eliminarUsuario(idNumerico(req.params.id, 'Usuario'), usuarioDe(req).id)
  res.status(204).end()
}

export async function reenviarEnlace(req: Request, res: Response): Promise<void> {
  res.status(202).json(await usuarios.reenviarEnlace(idNumerico(req.params.id, 'Usuario')))
}
