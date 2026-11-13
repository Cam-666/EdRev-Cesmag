/*
 * auditoria — who did what and when (RF-41). The readable sentence and the journal / article of
 * context go in `detalle`, so the article history and Administración › Auditoría can filter.
 */
import type { Cliente } from '../db.js'

export type AccionAuditoria =
  | 'registro'
  | 'edicion'
  | 'revision'
  | 'asignacion'
  | 'respuesta'
  | 'entrega'
  | 'constancia'
  | 'envio'
  | 'fallo'
  | 'bloqueo'
  | 'desbloqueo'
  | 'traslado'
  | 'cierre'
  | 'reapertura'
  | 'migracion'
  | 'eliminacion'

export interface Registro {
  usuario: number | null
  tabla: string
  idRegistro: number | string
  accion: AccionAuditoria
  texto: string
  revista?: number
  articulo?: number
}

export async function auditar(cliente: Cliente, r: Registro): Promise<void> {
  await cliente.query(
    `INSERT INTO auditoria (id_usuario, tabla_afectada, id_registro, accion, detalle)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      r.usuario,
      r.tabla,
      String(r.idRegistro),
      r.accion,
      JSON.stringify({ texto: r.texto, revista: r.revista, articulo: r.articulo }),
    ],
  )
}
