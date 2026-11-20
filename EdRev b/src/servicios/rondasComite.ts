/*
 * rondasComite (servicio) — una ronda de la revisión inicial del comité con el reporte antiplagio. El comité
 * elige el resultado de la ronda (Aprobado, Requiere ajustes o Rechazado); la página sugiere uno a partir del
 * reporte y las observaciones, pero decide el comité. Ningún resultado cierra el proceso por sí solo: el artículo
 * sigue en revisión, se puede registrar otra ronda (sin límite) y solo una ronda Aprobado permite asignar
 * pares. Cerrar el proceso es la acción aparte «Cerrar proceso».
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
    // Un artículo retomado («Postulado» con pares anteriores) pasa de nuevo por el comité.
    if (!['postulado', 'en-revision'].includes(a.estado) || (pares.rows.length > 0 && a.estado !== 'postulado')) {
      throw new ErrorHttp(409, 'La revisión del comité ya terminó para este artículo')
    }
    // El artículo sigue en revisión sea cual sea el resultado: una ronda no cierra el proceso.
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
