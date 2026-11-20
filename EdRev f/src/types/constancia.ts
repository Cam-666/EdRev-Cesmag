import type { EstadoCorreo } from './historial'
import type { Revista } from './revista'

export type OrigenConstancia = 'sistema' | 'migrado'

/** Fila de la pantalla de constancias: una evaluación entregada con el estado de su constancia. */
export interface FilaConstancia {
  id: string
  asignacionId: string
  estado: 'pendiente' | 'emitida'
  origen: OrigenConstancia
  par: { id: string; nombre: string; correo: string }
  articulo: { id: string; numeroOjs: string; titulo: string }
  /** Fecha y hora ISO 8601 de la entrega. */
  fechaEntrega: string
  /** Fecha y hora ISO 8601; null mientras esté pendiente. */
  fechaEmision: string | null
}

export interface RespuestaConstancias {
  pendientes: FilaConstancia[]
  emitidas: FilaConstancia[]
}

/**
 * La constancia armada con la plantilla institucional: solo cambian el nombre del par y el título del artículo;
 * el membrete y la firma son fijos. No lleva consecutivo.
 */
export interface VistaConstancia {
  universidad: string
  revista: string
  cuerpo: string
  firma: string
  /** Descripción de las imágenes de la plantilla de la revista sobre las que se escribe el texto. */
  fondo: string | null
}

export interface ResultadoEmision {
  constancia: FilaConstancia
  /** El correo de agradecimiento que lleva la constancia. */
  correo: { estado: EstadoCorreo; destinatario: string }
}

export interface ResultadoEmisionMasiva {
  emitidas: number
  fallidos: number
  resultados: ResultadoEmision[]
}

export type { Revista }
