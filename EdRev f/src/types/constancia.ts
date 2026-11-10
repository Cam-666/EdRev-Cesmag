import type { EstadoCorreo } from './historial'
import type { Revista } from './revista'

export type OrigenConstancia = 'sistema' | 'migrado'

/** Row of the constancias screen: a delivered evaluation with its constancia status. */
export interface FilaConstancia {
  id: string
  asignacionId: string
  estado: 'pendiente' | 'emitida'
  origen: OrigenConstancia
  par: { id: string; nombre: string; correo: string }
  articulo: { id: string; numeroOjs: string; titulo: string }
  /** ISO 8601 date-time of the delivery. */
  fechaEntrega: string
  /** ISO 8601 date-time; null while pending. */
  fechaEmision: string | null
}

export interface RespuestaConstancias {
  pendientes: FilaConstancia[]
  emitidas: FilaConstancia[]
}

/**
 * The constancia rendered from the institutional template (RF-30): only the peer's name and the
 * article title change; the letterhead and the signature are fixed. It carries no sequence number.
 */
export interface VistaConstancia {
  universidad: string
  revista: string
  cuerpo: string
  firma: string
}

export interface ResultadoEmision {
  constancia: FilaConstancia
  /** The thank-you mail that carries the constancia (RF-31). */
  correo: { estado: EstadoCorreo; destinatario: string }
}

export interface ResultadoEmisionMasiva {
  emitidas: number
  fallidos: number
  resultados: ResultadoEmision[]
}

export type { Revista }
