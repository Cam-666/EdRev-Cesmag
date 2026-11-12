/*
 * articulosService — HTTP calls of the articles module. Every call carries the journal in the
 * URL: there is no way to ask for data without saying which journal. Covers: RF-01..RF-08,
 * RF-26, RF-35, RF-36.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  ArticuloDetalle,
  EdicionArticulo,
  FiltrosArticulos,
  NuevoArticulo,
  NuevaRonda,
  RespuestaListado,
  EstadoArticulo,
} from '@/types/articulo'
import type { DatosAutor } from '@/types/autor'
import type { HistorialArticulo, Observacion } from '@/types/historial'
import type { Revista } from '@/types/revista'

function json(cuerpo: unknown): { body: string } {
  return { body: JSON.stringify(cuerpo) }
}

export function listarArticulos(revista: Revista, f: FiltrosArticulos): Promise<RespuestaListado> {
  const q = new URLSearchParams({ pagina: String(f.pagina), porPagina: String(f.porPagina) })
  if (f.q) q.set('q', f.q)
  if (f.estado) q.set('estado', f.estado)
  if (f.publicacion) q.set('publicacion', f.publicacion)
  if (f.desde) q.set('desde', f.desde)
  if (f.hasta) q.set('hasta', f.hasta)
  if (f.sinResponder) q.set('sinResponder', '1')
  return solicitar<RespuestaListado>(`/${revista}/articulos?${q.toString()}`)
}

export function listarPublicaciones(revista: Revista): Promise<string[]> {
  return solicitar<string[]>(`/${revista}/publicaciones`)
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

/** Moves the article to the other journal while it is in the committee review (RF-07). */
export function trasladarArticulo(revista: Revista, id: string): Promise<ArticuloDetalle> {
  return solicitar<ArticuloDetalle>(`/${revista}/articulos/${encodeURIComponent(id)}/trasladar`, {
    method: 'POST',
  })
}

export function listarObservaciones(revista: Revista, id: string): Promise<Observacion[]> {
  return solicitar<Observacion[]>(`/${revista}/articulos/${encodeURIComponent(id)}/observaciones`)
}

export function agregarObservacion(
  revista: Revista,
  id: string,
  texto: string,
): Promise<Observacion> {
  return solicitar<Observacion>(`/${revista}/articulos/${encodeURIComponent(id)}/observaciones`, {
    method: 'POST',
    ...json({ texto }),
  })
}

export function obtenerHistorial(revista: Revista, id: string): Promise<HistorialArticulo> {
  return solicitar<HistorialArticulo>(`/${revista}/articulos/${encodeURIComponent(id)}/historial`)
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
