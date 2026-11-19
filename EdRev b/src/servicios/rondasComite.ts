/*
 * rondasComite (servicio) — a round of the initial committee review with the anti-plagiarism report
 * (RF-05, RF-06). The result is not chosen: it follows from the report and the observations.
 */
import { config } from '../config.js'
import { enTransaccion } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'
import { articuloDeRevista } from './articulos.js'

export type ResultadoRonda = 'aprobado' | 'rechazado' | 'ajustes'

const ETIQUETA_RONDA: Record<ResultadoRonda, string> = {
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  ajustes: 'Requiere ajustes',
}

/** Matches above the limit: Rechazado; within it, Aprobado without observations, Requiere ajustes with them. */
export function resultadoDeRonda(coincidencias: number, observacion: string): ResultadoRonda {
  if (coincidencias > config.umbralCoincidencias) return 'rechazado'
  return observacion.trim() ? 'ajustes' : 'aprobado'
}

export interface DatosRonda {
  coincidencias: number
  atribuidoIa: number | null
  observacion: string
}

export async function registrarRonda(revista: number, idArticulo: number, datos: DatosRonda, actor: number): Promise<void> {
  const resultado = resultadoDeRonda(datos.coincidencias, datos.observacion)
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, idArticulo)
    const pares = await c.query('SELECT 1 FROM evaluacion WHERE id_articulo = $1 LIMIT 1', [idArticulo])
    // An article taken up again («Postulado» with earlier peers) goes through the committee anew.
    if (!['postulado', 'en-revision'].includes(a.estado) || (pares.rows.length > 0 && a.estado !== 'postulado')) {
      throw new ErrorHttp(409, 'La revisión del comité ya terminó para este artículo')
    }
    await c.query(
      `UPDATE articulo SET porcentaje_coincidencias = $1, porcentaje_ia = $2, estado = $3
        WHERE id_articulo = $4`,
      [datos.coincidencias, datos.atribuidoIa, resultado === 'rechazado' ? 'rechazado' : 'en-revision', idArticulo],
    )
    await c.query(
      `INSERT INTO revision_inicial_comite (id_articulo, id_usuario, resultado, observacion)
       VALUES ($1, $2, $3, NULLIF($4, ''))`,
      [idArticulo, actor, resultado, datos.observacion.trim()],
    )
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: idArticulo,
      accion: 'revision',
      texto: `Registró una ronda de la revisión del comité: ${ETIQUETA_RONDA[resultado]}`,
      revista,
      articulo: idArticulo,
    })
  })
}
