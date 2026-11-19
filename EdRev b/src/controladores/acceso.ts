/*
 * acceso (controlador) — receives the login, the recovery request and the password links, and
 * answers with the statuses the screens expect (423 locked, 403 disabled, 401 wrong credentials);
 * the rules are in servicios/acceso.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import * as acceso from '../servicios/acceso.js'

const credenciales = z.object({ correo: z.string(), contrasena: z.string() })

export async function iniciarSesion(req: Request, res: Response): Promise<void> {
  const { correo, contrasena } = credenciales.parse(req.body)
  const r = await acceso.iniciarSesion(correo, contrasena)
  switch (r.tipo) {
    case 'ok':
      res.json({ usuario: r.usuario, token: r.token })
      return
    case 'bloqueada':
      res.status(423).json({ motivo: 'bloqueada', bloqueadoHasta: r.bloqueadoHasta })
      return
    case 'inhabilitada':
      res.status(403).json({ motivo: 'inhabilitada' })
      return
    case 'credenciales':
      res.status(401).json({ motivo: 'credenciales', intento: r.intento, maximo: r.maximo })
  }
}

export async function recuperar(req: Request, res: Response): Promise<void> {
  const { correo } = z.object({ correo: z.string() }).parse(req.body)
  res.status(202).json(await acceso.solicitarRecuperacion(correo))
}

export async function leerEnlace(req: Request, res: Response): Promise<void> {
  res.json(await acceso.datosDelEnlace(String(req.params.token)))
}

export async function definirContrasena(req: Request, res: Response): Promise<void> {
  const { contrasena } = z.object({ contrasena: z.string() }).parse(req.body)
  await acceso.definirContrasena(String(req.params.token), contrasena)
  res.status(204).end()
}
