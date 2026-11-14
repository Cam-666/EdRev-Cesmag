/*
 * Panel — the dashboard of each journal and the home summary of both (RF-37, HU-25): peers that
 * have not answered, evaluations delivered without constancia, articles in evaluation and approved.
 */
import { Router } from 'express'
import { pool } from '../db.js'
import { idRevista, siglaDe } from '../lib/http.js'

export const rutasPanel = Router()

async function sinResponder(revista: number) {
  const { rows } = await pool.query(
    `SELECT e.id_evaluacion, a.id_articulo, a.numero_ojs, a.titulo, p.nombre,
            (SELECT count(*)::int FROM correo c WHERE c.id_evaluacion = e.id_evaluacion AND c.tipo = 'invitacion') AS intentos
       FROM evaluacion e JOIN articulo a ON a.id_articulo = e.id_articulo JOIN par_evaluador p ON p.id_par = e.id_par
      WHERE a.id_revista = $1 AND e.estado_par = 'invitado' ORDER BY e.fecha_asignacion`,
    [revista],
  )
  return rows.map((r) => ({
    asignacionId: String(r.id_evaluacion),
    articuloId: String(r.id_articulo),
    numeroOjs: r.numero_ojs,
    titulo: r.titulo,
    par: r.nombre,
    estado: r.intentos >= 2 ? 'segundo-intento' : 'invitado',
  }))
}

async function constanciasPendientes(revista: number) {
  const { rows } = await pool.query(
    `SELECT e.id_evaluacion, a.id_articulo, a.numero_ojs, a.titulo, p.nombre, e.fecha_evaluacion
       FROM evaluacion e JOIN articulo a ON a.id_articulo = e.id_articulo JOIN par_evaluador p ON p.id_par = e.id_par
      WHERE a.id_revista = $1 AND e.estado_par = 'entrego' AND NOT e.constancia_emitida
      ORDER BY e.fecha_evaluacion`,
    [revista],
  )
  return rows.map((r) => ({
    constanciaId: String(r.id_evaluacion),
    par: r.nombre,
    articuloId: String(r.id_articulo),
    numeroOjs: r.numero_ojs,
    titulo: r.titulo,
    fechaEntrega: r.fecha_evaluacion ?? '',
  }))
}

async function contar(revista: number, estado: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM articulo WHERE id_revista = $1 AND estado = $2',
    [revista, estado],
  )
  return rows[0]?.n ?? 0
}

async function porCorregir(revista: number): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM por_corregir WHERE id_revista = $1',
    [revista],
  )
  return rows[0]?.n ?? 0
}

rutasPanel.get('/:revista/tablero', async (req, res) => {
  const revista = idRevista(req.params.revista)
  res.json({
    fecha: new Date().toISOString().slice(0, 10),
    enEvaluacion: await contar(revista, 'en-evaluacion'),
    aprobados: await contar(revista, 'aprobado'),
    sinResponder: await sinResponder(revista),
    constanciasPendientes: await constanciasPendientes(revista),
    porCorregir: await porCorregir(revista),
  })
})

rutasPanel.get('/resumen', async (_req, res) => {
  const revistas = await Promise.all(
    [1, 2].map(async (id) => {
      const { rows } = await pool.query<{ articulos: number; pares: number }>(
        `SELECT (SELECT count(*)::int FROM articulo WHERE id_revista = $1) AS articulos,
                (SELECT count(*)::int FROM par_evaluador) AS pares`,
        [id],
      )
      return {
        revista: siglaDe(id),
        articulos: rows[0]?.articulos ?? 0,
        pares: rows[0]?.pares ?? 0,
        sinResponder: (await sinResponder(id)).length,
        constanciasPendientes: (await constanciasPendientes(id)).length,
        porCorregir: await porCorregir(id),
      }
    }),
  )
  res.json({ fecha: new Date().toISOString().slice(0, 10), revistas })
})
