/*
 * articulosService — llamadas HTTP del módulo de artículos. Toda llamada lleva la revista en la URL: no hay forma
 * de pedir datos sin decir de qué revista.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  ArticuloDetalle,
  CierreArticulo,
  EdicionArticulo,
  FiltrosArticulos,
  NuevoArticulo,
  NuevaRonda,
  RespuestaListado,
  EstadoArticulo,
} from '@/types/articulo'
import type { DatosAutor } from '@/types/autor'
import type { HistorialArticulo } from '@/types/historial'
import type { Revista } from '@/types/revista'

function json(cuerpo: unknown): { body: string } {
  return { body: JSON.stringify(cuerpo) }
}

export function listarArticulos(revista: Revista, f: FiltrosArticulos): Promise<RespuestaListado> {
  const q = new URLSearchParams({ pagina: String(f.pagina), porPagina: String(f.porPagina) })
  if (f.q) q.set('q', f.q)
  if (f.estado) q.set('estado', f.estado)
  if (f.publicacion) q.set('publicacion', f.publicacion)
  if (f.anio) q.set('anio', String(f.anio))
  if (f.desde) q.set('desde', f.desde)
  if (f.hasta) q.set('hasta', f.hasta)
  if (f.sinResponder) q.set('sinResponder', '1')
  return solicitar<RespuestaListado>(`/${revista}/articulos?${q.toString()}`)
}

/** Ediciones que usan los artículos de la revista, la más reciente primero. */
export function listarPublicaciones(
  revista: Revista,
): Promise<Array<{ valor: string; etiqueta: string }>> {
  return solicitar<Array<{ valor: string; etiqueta: string }>>(`/${revista}/publicaciones`)
}

/** Años de gestión que tienen artículos, el más nuevo primero (siempre el actual). */
export function listarAnios(revista: Revista): Promise<number[]> {
  return solicitar<number[]>(`/${revista}/articulos/anios`)
}

export function obtenerArticulo(revista: Revista, id: string): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}`)
}

export function existeNumeroOjs(
  revista: Revista,
  numeroOjs: string,
): Promise<{ existe: boolean; id: string | null }> {
  return solicitar(`/${revista}/articulos/existe?numeroOjs=${encodeURIComponent(numeroOjs)}`)
}

export function crearArticulo(revista: Revista, datos: NuevoArticulo): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos`, { method: 'POST', ...json(datos) })
}

export function editarArticulo(
  revista: Revista,
  id: string,
  cambios: EdicionArticulo,
): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    ...json(cambios),
  })
}

export function agregarAutorAArticulo(
  revista: Revista,
  id: string,
  autor: { autorId: string } | { nuevo: DatosAutor },
): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}/autores`, {
    method: 'POST',
    ...json(autor),
  })
}

export function registrarRonda(
  revista: Revista,
  id: string,
  ronda: NuevaRonda,
): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}/rondas`, {
    method: 'POST',
    ...json(ronda),
  })
}

/** Pasa el artículo a la otra revista, en cualquier etapa. */
export function trasladarArticulo(revista: Revista, id: string): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}/trasladar`, {
    method: 'POST',
  })
}

export function obtenerHistorial(revista: Revista, id: string): Promise<HistorialArticulo> {
  return solicitar<HistorialArticulo>(`/${revista}/articulos/${encodeURIComponent(id)}/historial`)
}

/** Cierra el proceso como aprobado, rechazado o archivado, con su motivo. */
export function cerrarArticulo(
  revista: Revista,
  id: string,
  cierre: CierreArticulo,
): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}/cerrar`, {
    method: 'POST',
    ...json(cierre),
  })
}

export function reabrirArticulo(
  revista: Revista,
  id: string,
  datos: { motivo: string; estado: Extract<EstadoArticulo, 'en-revision' | 'postulado'> },
): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}/reabrir`, {
    method: 'POST',
    ...json(datos),
  })
}
