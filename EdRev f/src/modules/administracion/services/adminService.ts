/*
 * adminService — HTTP calls of Administración: user accounts, templates with the sender accounts,
 * and the cross-journal audit log. Covers: RF-40, RF-41, RNF-19, HU-29, HU-30.
 */
import { solicitar } from '@/lib/api/cliente'
import type { EntradaAuditoria, TipoAuditoria } from '@/types/historial'
import type { CuentaRemitente, DatosPlantillas, Plantilla, PlantillaId } from '@/types/plantilla'
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

export function crearUsuario(datos: DatosUsuario): Promise<Usuario> {
  return solicitar<Usuario>('/usuarios', { method: 'POST', ...json(datos) })
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

export function guardarPlantilla(
  id: PlantillaId,
  datos: { asunto: string | null; cuerpo: string },
): Promise<Plantilla> {
  return solicitar<Plantilla>(`/plantillas/${id}`, { method: 'PUT', ...json(datos) })
}

export function guardarCuenta(revista: Revista, provisional: string): Promise<CuentaRemitente> {
  return solicitar<CuentaRemitente>(`/cuentas/${revista}`, {
    method: 'PUT',
    ...json({ provisional }),
  })
}

export function listarAuditoria(f: FiltrosAuditoria): Promise<RespuestaAuditoria> {
  const q = new URLSearchParams({ pagina: String(f.pagina), porPagina: String(f.porPagina) })
  if (f.revista) q.set('revista', f.revista)
  if (f.usuario) q.set('usuario', f.usuario)
  if (f.tipo) q.set('tipo', f.tipo)
  return solicitar<RespuestaAuditoria>(`/auditoria?${q.toString()}`)
}
