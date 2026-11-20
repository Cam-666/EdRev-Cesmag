/*
 * articulos (controlador) — recibe y valida las peticiones sobre los artículos y responde. Las reglas están
 * en servicios/gestionArticulos, servicios/autoresArticulo y servicios/rondasComite.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { enteroDe, idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import { detalleArticulo } from '../servicios/articulos.js'
import { agregarAutor } from '../servicios/autoresArticulo.js'
import * as articulos from '../servicios/gestionArticulos.js'
import { registrarRonda } from '../servicios/rondasComite.js'

const TIPOS = ['investigacion', 'reflexion', 'revision'] as const
const ESTADOS = ['postulado', 'en-revision', 'en-evaluacion', 'aprobado', 'rechazado', 'archivado'] as const

const publicacion = z.object({ volumen: z.number().int().positive(), numero: z.number().int().positive() })

const autorNuevo = z.object({
  nombre: z.string().trim().min(1),
  correo: z.string().trim(),
  orcid: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])?$/, 'Use el formato 0000-0000-0000-0000'),
  filiacion: z.string().trim(),
  pais: z.string().trim(),
})
const autorEntrada = z.union([z.object({ autorId: z.string() }), z.object({ nuevo: autorNuevo })])

const nuevoArticulo = z.object({
  numeroOjs: z.string().trim().min(1, 'Escriba el número de OJS'),
  titulo: z.string().trim().min(1, 'Escriba el título'),
  tipo: z.enum(TIPOS),
  fechaPostulacion: z.string().min(1),
  autores: z.array(autorEntrada).min(1, 'Agregue al menos un autor').max(7, 'El artículo admite hasta siete autores'),
})

const edicion = z.object({
  titulo: z.string().trim().min(1).optional(),
  tipo: z.enum(TIPOS).optional(),
  publicacion: publicacion.nullable().optional(),
})

// El resultado de la ronda lo elige el comité; la página solo sugiere uno.
const ronda = z.object({
  coincidencias: z
    .number({ error: 'Registre el porcentaje de coincidencias del reporte antiplagio' })
    .min(0)
    .max(100),
  atribuidoIa: z.number().min(0).max(100).nullable(),
  resultado: z.enum(['aprobado', 'rechazado', 'ajustes'], { error: 'Seleccione el resultado del comité' }),
  observacion: z.string(),
})

const cierre = z.object({
  estado: z.enum(['aprobado', 'rechazado', 'archivado']),
  motivo: z.string().trim().min(1, 'Escriba el motivo del cierre'),
  publicacion: publicacion.nullable(),
})

const reapertura = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la reapertura'),
  estado: z.enum(ESTADOS),
})

const revistaDe = (req: Request) => idRevista(req.params.revista)
const articuloDe = (req: Request) => idNumerico(req.params.id, 'Artículo')
const textoDe = (v: unknown) => (typeof v === 'string' ? v : undefined)

export async function anios(req: Request, res: Response): Promise<void> {
  res.json(await articulos.aniosDeGestion(revistaDe(req)))
}

export async function listar(req: Request, res: Response): Promise<void> {
  const q = req.query
  res.json(
    await articulos.listarArticulos(revistaDe(req), {
      q: textoDe(q.q),
      estado: textoDe(q.estado),
      anio: textoDe(q.anio),
      publicacion: textoDe(q.publicacion),
      desde: textoDe(q.desde),
      hasta: textoDe(q.hasta),
      sinResponder: q.sinResponder === '1',
      pagina: enteroDe(q.pagina, 1, 1),
      porPagina: enteroDe(q.porPagina, 6, 1, 100),
    }),
  )
}

export async function existeOjs(req: Request, res: Response): Promise<void> {
  res.json(await articulos.existeNumeroOjs(revistaDe(req), String(req.query.numeroOjs ?? '').trim()))
}

export async function publicaciones(req: Request, res: Response): Promise<void> {
  res.json(await articulos.publicaciones(revistaDe(req)))
}

export async function ficha(req: Request, res: Response): Promise<void> {
  res.json(await detalleArticulo(pool, revistaDe(req), articuloDe(req)))
}

export async function registrar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = await articulos.registrarArticulo(revista, nuevoArticulo.parse(req.body), usuarioDe(req).id)
  res.status(201).json(await detalleArticulo(pool, revista, id))
}

export async function agregarAutorAlArticulo(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = articuloDe(req)
  await agregarAutor(revista, id, autorEntrada.parse(req.body), usuarioDe(req).id)
  res.status(201).json(await detalleArticulo(pool, revista, id))
}

export async function editar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = articuloDe(req)
  await articulos.editarArticulo(revista, id, edicion.parse(req.body), usuarioDe(req).id)
  res.json(await detalleArticulo(pool, revista, id))
}

export async function registrarRondaDelComite(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = articuloDe(req)
  await registrarRonda(revista, id, ronda.parse(req.body), usuarioDe(req).id)
  res.status(201).json(await detalleArticulo(pool, revista, id))
}

export async function trasladar(req: Request, res: Response): Promise<void> {
  const id = articuloDe(req)
  const destino = await articulos.trasladarArticulo(revistaDe(req), id, usuarioDe(req).id)
  res.json(await detalleArticulo(pool, destino, id))
}

export async function cerrar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = articuloDe(req)
  await articulos.cerrarArticulo(revista, id, cierre.parse(req.body), usuarioDe(req).id)
  res.json(await detalleArticulo(pool, revista, id))
}

export async function reabrir(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = articuloDe(req)
  await articulos.reabrirArticulo(revista, id, reapertura.parse(req.body), usuarioDe(req).id)
  res.json(await detalleArticulo(pool, revista, id))
}

export async function historial(req: Request, res: Response): Promise<void> {
  res.json(await articulos.historialArticulo(revistaDe(req), articuloDe(req)))
}
