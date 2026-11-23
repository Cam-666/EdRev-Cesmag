/*
 * adminService — llamadas HTTP de Administración: cuentas de usuario, plantillas con las cuentas remitentes y el
 * registro de auditoría de las dos revistas.
 */
import { solicitar, solicitarArchivo } from '@/lib/api/cliente'
import type { RespuestaEnvioEnlace } from '@/types/acceso'
import type { Configuracion, DatosRevista } from '@/types/configuracion'
import type { EntradaAuditoria, TipoAuditoria } from '@/types/historial'
import type {
  DatosNuevaPlantilla,
  DatosPlantillas,
  ParteImagen,
  Plantilla,
} from '@/types/plantilla'
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

/** Se crea la cuenta y su dueño recibe un enlace para definir la contraseña. */
export function crearUsuario(datos: DatosUsuario): Promise<Usuario & RespuestaEnvioEnlace> {
  return solicitar<Usuario & RespuestaEnvioEnlace>('/usuarios', { method: 'POST', ...json(datos) })
}

/** Envía de nuevo el enlace para definir la contraseña de una cuenta que aún no ha ingresado. */
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

/** Elimina una cuenta; falla cuando la cuenta ya tiene actividad en el historial. */
export function eliminarUsuario(id: string): Promise<void> {
  return solicitar<undefined>(`/usuarios/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function obtenerPlantillas(): Promise<DatosPlantillas> {
  return solicitar<DatosPlantillas>('/plantillas')
}

export function crearPlantilla(datos: DatosNuevaPlantilla): Promise<Plantilla> {
  return solicitar<Plantilla>('/plantillas', { method: 'POST', ...json(datos) })
}

/** Sube la imagen de encabezado, de pie de página o de firma de una plantilla de archivo. */
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

/** La plantilla de constancia como PDF con datos de ejemplo. */
export function vistaPreviaPlantilla(id: string): Promise<Blob> {
  return solicitarArchivo(`/plantillas/${encodeURIComponent(id)}/vista-previa`)
}

/** El correo completo (con el marco institucional) con datos de ejemplo, para el texto que se está editando. */
export function vistaCorreoPlantilla(datos: {
  revista: Revista
  uso: 'invitacion' | 'agradecimiento' | 'mensaje'
  cuerpo: string
}): Promise<{ html: string }> {
  return solicitar<{ html: string }>('/plantillas/vista-correo', { method: 'POST', ...json(datos) })
}

/** La constancia como PDF con datos de ejemplo, armada con el texto que se está editando. */
export function vistaPdfConstancia(id: string, cuerpo: string): Promise<Blob> {
  return solicitarArchivo(`/plantillas/${encodeURIComponent(id)}/vista-previa`, {
    method: 'POST',
    ...json({ cuerpo }),
  })
}

/** Deja la plantilla como la habitual de su revista: la que sale elegida al asignar un par o emitir una constancia. */
export function marcarPredeterminada(id: string): Promise<Plantilla> {
  return solicitar<Plantilla>(`/plantillas/${encodeURIComponent(id)}/predeterminada`, {
    method: 'POST',
  })
}

/** Elimina una plantilla que no es la habitual de su revista. */
export function eliminarPlantilla(id: string): Promise<void> {
  return solicitar<undefined>(`/plantillas/${encodeURIComponent(id)}`, { method: 'DELETE' })
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

export function guardarConfiguracion(
  datos: Pick<Configuracion, 'diasEspera'>,
): Promise<Configuracion> {
  return solicitar<Configuracion>('/configuracion', { method: 'PUT', ...json(datos) })
}

export function guardarDatosRevista(revista: Revista, datos: DatosRevista): Promise<DatosRevista> {
  return solicitar<DatosRevista>(`/configuracion/revistas/${revista}`, {
    method: 'PUT',
    ...json(datos),
  })
}
