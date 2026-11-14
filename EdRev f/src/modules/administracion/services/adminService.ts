/*
 * adminService — HTTP calls of Administración: user accounts, templates with the sender accounts,
 * and the cross-journal audit log. Covers: RF-40, RF-41, RNF-19, HU-29, HU-30.
 */
import { solicitar, solicitarArchivo } from '@/lib/api/cliente'
import type { RespuestaEnvioEnlace } from '@/types/acceso'
import type { Configuracion, DatosRevista } from '@/types/configuracion'
import type { EntradaAuditoria, TipoAuditoria } from '@/types/historial'
import type { DatosNuevaPlantilla, DatosPlantillas, ParteImagen, Plantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'
import type { DatosUsuario, Usuario } from '@/types/usuario'

export interface FiltrosAuditoria {
  revista?: Revista
  usuario?: string
  tipo?: TipoAuditoria
  pagina: number
  porPagina: number
}

export interface EntradaAuditoriaGlobal extends EntradaAuditoria {
  revista: Revista
}

export interface RespuestaAuditoria {
  items: EntradaAuditoriaGlobal[]
  total: number
}

function json(cuerpo: unknown): { body: string } {
  return { body: JSON.stringify(cuerpo) }
}

export function listarUsuarios(): Promise<Usuario[]> {
  return solicitar<Usuario[]>('/usuarios')
}

/** RF-40: the account is created and its owner receives a link to define the password. */
export function crearUsuario(datos: DatosUsuario): Promise<Usuario & RespuestaEnvioEnlace> {
  return solicitar<Usuario & RespuestaEnvioEnlace>('/usuarios', { method: 'POST', ...json(datos) })
}

/** Sends again the link to define the password of an account that has not entered yet. */
export function reenviarEnlaceUsuario(id: string): Promise<RespuestaEnvioEnlace> {
  return solicitar<RespuestaEnvioEnlace>(`/usuarios/${encodeURIComponent(id)}/enlace`, {
    method: 'POST',
  })
}

export function editarUsuario(
  id: string,
  cambios: Partial<DatosUsuario & Pick<Usuario, 'estado'>>,
): Promise<Usuario> {
  return solicitar<Usuario>(`/usuarios/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    ...json(cambios),
  })
}

export function obtenerPlantillas(): Promise<DatosPlantillas> {
  return solicitar<DatosPlantillas>('/plantillas')
}

export function crearPlantilla(datos: DatosNuevaPlantilla): Promise<Plantilla> {
  return solicitar<Plantilla>('/plantillas', { method: 'POST', ...json(datos) })
}

/** Uploads the header, the footer or the signature image of a file template (RF-45). */
export function subirImagen(id: string, parte: ParteImagen, archivo: File): Promise<Plantilla> {
  const datos = new FormData()
  datos.append('archivo', archivo)
  return solicitar<Plantilla>(`/plantillas/${encodeURIComponent(id)}/imagen/${parte}`, {
    method: 'POST',
    body: datos,
  })
}

export function quitarImagen(id: string, parte: ParteImagen): Promise<Plantilla> {
  return solicitar<Plantilla>(`/plantillas/${encodeURIComponent(id)}/imagen/${parte}`, {
    method: 'DELETE',
  })
}

/** The constancia template as a PDF with sample data. */
export function vistaPreviaPlantilla(id: string): Promise<Blob> {
  return solicitarArchivo(`/plantillas/${encodeURIComponent(id)}/vista-previa`)
}

/** Makes this template the one its journal sends for its use. */
export function usarPlantilla(id: string): Promise<Plantilla> {
  return solicitar<Plantilla>(`/plantillas/${encodeURIComponent(id)}/usar`, { method: 'POST' })
}

export function guardarPlantilla(
  id: string,
  datos: { asunto: string | null; cuerpo: string },
): Promise<Plantilla> {
  return solicitar<Plantilla>(`/plantillas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    ...json(datos),
  })
}

export function listarAuditoria(f: FiltrosAuditoria): Promise<RespuestaAuditoria> {
  const q = new URLSearchParams({ pagina: String(f.pagina), porPagina: String(f.porPagina) })
  if (f.revista) q.set('revista', f.revista)
  if (f.usuario) q.set('usuario', f.usuario)
  if (f.tipo) q.set('tipo', f.tipo)
  return solicitar<RespuestaAuditoria>(`/auditoria?${q.toString()}`)
}

export function obtenerConfiguracion(): Promise<Configuracion> {
  return solicitar<Configuracion>('/configuracion')
}

export function guardarConfiguracion(datos: Pick<Configuracion, 'diasEspera'>): Promise<Configuracion> {
  return solicitar<Configuracion>('/configuracion', { method: 'PUT', ...json(datos) })
}

export function guardarDatosRevista(revista: Revista, datos: DatosRevista): Promise<DatosRevista> {
  return solicitar<DatosRevista>(`/configuracion/revistas/${revista}`, { method: 'PUT', ...json(datos) })
}
