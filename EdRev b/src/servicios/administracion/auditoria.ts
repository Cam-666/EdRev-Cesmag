/*
 * auditoria (servicio) — the audit log of both journals with its filters and pagination (RF-41).
 */
import { pool } from '../../db.js'
import { siglaDe } from '../../lib/http.js'
import { iso } from '../../lib/mapeo.js'

export interface FiltrosAuditoria {
  revista: 1 | 2 | null
  usuario: string
  tipo: string | null
  pagina: number
  porPagina: number
}

export async function listarAuditoria(f: FiltrosAuditoria) {
  const donde = `WHERE ($1::int IS NULL OR (a.detalle->>'revista')::int = $1)
                   AND ($2 = '' OR coalesce(u.nombre, 'Sistema') ILIKE '%' || $2 || '%')
                   AND ($3::text IS NULL OR a.accion = $3)`
  const desde = `FROM auditoria a LEFT JOIN usuario u ON u.id_usuario = a.id_usuario ${donde}`
  const valores = [f.revista, f.usuario, f.tipo]
  const total = await pool.query<{ n: number }>(`SELECT count(*)::int AS n ${desde}`, valores)
  const { rows } = await pool.query(
    `SELECT a.*, u.nombre AS usuario ${desde} ORDER BY a.fecha DESC
      LIMIT ${f.porPagina} OFFSET ${(f.pagina - 1) * f.porPagina}`,
    valores,
  )
  return {
    total: total.rows[0]?.n ?? 0,
    items: rows.map((a) => ({
      id: String(a.id_auditoria),
      revista: a.detalle?.revista ? siglaDe(Number(a.detalle.revista)) : 'reep',
      articuloId: a.detalle?.articulo ? String(a.detalle.articulo) : null,
      tipo: a.accion,
      accion: a.detalle?.texto ?? a.accion,
      fecha: iso(a.fecha),
      usuario: a.usuario ?? 'Sistema',
    })),
  }
}
