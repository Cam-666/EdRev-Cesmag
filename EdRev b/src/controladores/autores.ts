/*
 * autores (controlador) — recibe y valida las peticiones sobre el directorio de autores y responde. Las
 * reglas están en servicios/autores.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { enteroDe, idNumerico, idRevista } from '../lib/http.js'
import * as autores from '../servicios/autores.js'

const datosAutor = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre'),
  correo: z.string().trim(),
  orcid: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])?$/, 'Use el formato 0000-0000-0000-0000'),
  filiacion: z.string().trim().optional(),
  pais: z.string().trim().optional(),
})

const revistaDe = (req: Request) => idRevista(req.params.revista)
const autorDe = (req: Request) => idNumerico(req.params.id, 'Autor')

export async function filtros(req: Request, res: Response): Promise<void> {
  revistaDe(req)
  res.json(await autores.filtrosDelDirectorio())
}

export async function buscar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const q = req.query
  res.json(
    await autores.buscarAutores(revista, {
      q: String(q.q ?? ''),
      limite: enteroDe(q.limite, 50, 1, 200),
      en: q.en === 'reep' ? 1 : q.en === 'ire' ? 2 : null,
      pais: String(q.pais ?? ''),
      filiacion: String(q.filiacion ?? ''),
      orcid: q.orcid === 'con' || q.orcid === 'sin' ? q.orcid : '',
      articulos: q.articulos === 'uno' || q.articulos === 'varios' ? q.articulos : '',
    }),
  )
}

export async function ficha(req: Request, res: Response): Promise<void> {
  res.json(await autores.fichaDeAutor(revistaDe(req), autorDe(req)))
}

export async function articulos(req: Request, res: Response): Promise<void> {
  revistaDe(req)
  res.json(await autores.articulosDelAutor(autorDe(req)))
}

export async function registrar(req: Request, res: Response): Promise<void> {
  res.status(201).json(await autores.registrarAutor(revistaDe(req), datosAutor.parse(req.body)))
}

export async function editar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = autorDe(req)
  res.json(await autores.editarAutor(revista, id, datosAutor.partial().parse(req.body)))
}
