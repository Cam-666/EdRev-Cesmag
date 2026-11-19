/*
 * Registros migrados por corregir (RF-44, HU-32) — the records of the Excel whose free text did
 * not fit the closed lists are loaded with the datum empty and listed here; the correction writes
 * the chosen value, removes the record from the list and leaves a trace in the history.
 * Both profiles can correct (RNF-05).
 */
import { Router } from 'express'
import { z } from 'zod'
import { enTransaccion, pool } from '../../db.js'
import { auditar } from '../../lib/auditoria.js'
import { usuarioDe } from '../../middlewares/autenticacion.js'
import { CORREO_VALIDO, ErrorHttp, idNumerico, idRevista, siglaDe } from '../../lib/http.js'
import { conceptoDb } from '../../lib/mapeo.js'

export const rutasMigracion = Router()

const TIPOS = ['investigacion', 'reflexion', 'revision']
const ESTADOS = ['postulado', 'en-revision', 'en-evaluacion', 'aprobado', 'rechazado', 'archivado']
const CONCEPTOS = ['publicable', 'publicable-con-modificaciones', 'no-publicable', 'pendiente-formato']

interface Fila {
  id_registro: number
  campo: 'tipo-articulo' | 'estado-articulo' | 'concepto' | 'correo-par'
  valor_excel: string
  id_articulo: number | null
  id_evaluacion: number | null
  id_par: number | null
  articulo_ref: number | null
  numero_ojs: string | null
  titulo: string | null
  par: string | null
  orden: number | null
}

const SELECCION = `
  SELECT pc.*, COALESCE(pc.id_articulo, e.id_articulo) AS articulo_ref, COALESCE(a.numero_ojs, a2.numero_ojs) AS numero_ojs, COALESCE(a.titulo, a2.titulo) AS titulo,
         p.nombre AS par,
         (SELECT count(*)::int FROM evaluacion x WHERE x.id_articulo = e.id_articulo
            AND x.id_evaluacion <= e.id_evaluacion) AS orden
    FROM por_corregir pc
    LEFT JOIN articulo a ON a.id_articulo = pc.id_articulo
    LEFT JOIN evaluacion e ON e.id_evaluacion = pc.id_evaluacion
    LEFT JOIN articulo a2 ON a2.id_articulo = e.id_articulo
    LEFT JOIN par_evaluador p ON p.id_par = pc.id_par
   WHERE pc.id_revista = $1`

function registroApi(f: Fila, sigla: string) {
  const articulo = `${f.numero_ojs ?? ''} · ${f.titulo ?? ''}`
  return {
    id: String(f.id_registro),
    campo: f.campo,
    valorExcel: f.valor_excel,
    descripcion:
      f.campo === 'correo-par' ? (f.par ?? '') : f.campo === 'concepto' ? `${articulo} · par ${f.orden}` : articulo,
    enlace:
      f.campo === 'correo-par'
        ? `/${sigla}/pares/${f.id_par}`
        : `/${sigla}/articulos/${f.articulo_ref ?? ''}`,
  }
}

rutasMigracion.get('/:revista/por-corregir', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const { rows } = await pool.query<Fila>(`${SELECCION} ORDER BY pc.id_registro`, [revista])
  res.json(rows.map((f) => registroApi(f, siglaDe(revista))))
})

rutasMigracion.post('/:revista/por-corregir/:id', async (req, res) => {
  const revista = idRevista(req.params.revista)
  const id = idNumerico(req.params.id, 'Registro')
  const usuario = usuarioDe(req)
  const { valor } = z.object({ valor: z.string() }).parse(req.body)

  await enTransaccion(async (c) => {
    const { rows } = await c.query<Fila>(`${SELECCION} AND pc.id_registro = $2 FOR UPDATE OF pc`, [revista, id])
    const f = rows[0]
    if (!f) throw new ErrorHttp(404, 'El registro ya fue corregido')
    let articulo: number | undefined = f.articulo_ref ?? undefined

    if (f.campo === 'tipo-articulo') {
      if (!TIPOS.includes(valor)) throw new ErrorHttp(422, 'Elija un tipo de la lista')
      await c.query('UPDATE articulo SET tipo = $1 WHERE id_articulo = $2', [valor, f.id_articulo])
    } else if (f.campo === 'estado-articulo') {
      if (!ESTADOS.includes(valor)) throw new ErrorHttp(422, 'Elija un estado de la lista')
      await c.query('UPDATE articulo SET estado = $1 WHERE id_articulo = $2', [valor, f.id_articulo])
    } else if (f.campo === 'concepto') {
      if (!CONCEPTOS.includes(valor)) throw new ErrorHttp(422, 'Elija un concepto de la lista')
      const { rows: e } = await c.query<{ id_articulo: number }>(
        'UPDATE evaluacion SET concepto = $1 WHERE id_evaluacion = $2 RETURNING id_articulo',
        [conceptoDb(valor), f.id_evaluacion],
      )
      articulo = e[0]?.id_articulo
    } else {
      const correo = valor.trim().toLowerCase()
      if (!CORREO_VALIDO.test(correo)) throw new ErrorHttp(422, 'Escriba un correo válido')
      const { rows: otro } = await c.query(
        'SELECT 1 FROM par_evaluador WHERE correo = $1 AND id_par <> $2',
        [correo, f.id_par],
      )
      if (otro.length > 0) throw new ErrorHttp(409, 'Ya existe un par con ese correo en la base de pares')
      await c.query('UPDATE par_evaluador SET correo = $1 WHERE id_par = $2', [correo, f.id_par])
    }

    await c.query('DELETE FROM por_corregir WHERE id_registro = $1', [id])
    await auditar(c, {
      usuario: usuario.id,
      tabla: 'por_corregir',
      idRegistro: id,
      accion: 'edicion',
      texto: `Corrigió un dato migrado del Excel («${f.valor_excel || 'vacío'}»)`,
      revista,
      articulo,
    })
  })
  res.status(204).end()
})
