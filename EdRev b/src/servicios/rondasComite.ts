/*
 * rondasComite (servicio) — a round of the initial committee review with the anti-plagiarism report
 * (RF-05, RF-06). The committee chooses the result of the round (Aprobado, Requiere ajustes or
 * Rechazado); the page suggests one from the report and the observations, but the decision is the
 * committee's. No result closes the process by itself: the article stays in review, another round can
 * be registered (no limit), and only an Aprobado round lets the peers be assigned. Closing the
 * process is the «Cerrar proceso» action (RF-08).
 */
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

export interface DatosRonda {
  coincidencias: number
  atribuidoIa: number | null
  resultado: ResultadoRonda
  observacion: string
}

export async function registrarRonda(revista: number, idArticulo: number, datos: DatosRonda, actor: number): Promise<void> {
  await enTransaccion(async (c) => {
    const a = await articuloDeRevista(c, revista, idArticulo)
    const pares = await c.query('SELECT 1 FROM evaluacion WHERE id_articulo = $1 LIMIT 1', [idArticulo])
    // An article taken up again («Postulado» with earlier peers) goes through the committee anew.
    if (!['postulado', 'en-revision'].includes(a.estado) || (pares.rows.length > 0 && a.estado !== 'postulado')) {
      throw new ErrorHttp(409, 'La revisión del comité ya terminó para este artículo')
    }
    // The article stays in review whatever the result: a round does not close the process.
    await c.query(
      `UPDATE articulo SET porcentaje_coincidencias = $1, porcentaje_ia = $2, estado = 'en-revision'
        WHERE id_articulo = $3`,
      [datos.coincidencias, datos.atribuidoIa, idArticulo],
    )
    await c.query(
      `INSERT INTO revision_inicial_comite (id_articulo, id_usuario, resultado, observacion)
       VALUES ($1, $2, $3, NULLIF($4, ''))`,
      [idArticulo, actor, datos.resultado, datos.observacion.trim()],
    )
    await auditar(c, {
      usuario: actor,
      tabla: 'articulo',
      idRegistro: idArticulo,
      accion: 'revision',
      texto: `Registró una ronda de la revisión del comité: ${ETIQUETA_RONDA[datos.resultado]}`,
      revista,
      articulo: idArticulo,
    })
  })
}
