/*
 * resultadoPares — qué le pasa a un artículo cuando sus pares entregaron sus conceptos:
 * - «No publicable» de los pares: el proceso se cierra (el artículo queda «Rechazado») y se emiten las
 *   constancias de los pares a partir de sus evaluaciones.
 * - «Publicable con modificaciones»: el artículo vuelve al comité para una nueva ronda de revisión («Postulado»,
 *   que es como se maneja un artículo retomado).
 * - «Publicable»: el artículo se aprueba para publicación; si ya tiene volumen y número se cierra como
 *   «Aprobado», y si no, la página los pide (no se inventan).
 * El registro del concepto llama a esta función después de guardarlo; el historial conserva lo que se hizo.
 */
import type { Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { resultadoDePares, type ResultadoPares } from '../lib/paresArticulo.js'
import { articuloDeRevista } from './articulos.js'

export async function resultadoDeLosPares(c: Cliente, idArticulo: number) {
  const { rows } = await c.query<{ estado_par: string; concepto: string | null }>(
    'SELECT estado_par, concepto FROM evaluacion WHERE id_articulo = $1 ORDER BY fecha_asignacion, id_evaluacion',
    [idArticulo],
  )
  return resultadoDePares(rows)
}

export async function aplicarResultadoDePares(
  c: Cliente,
  revista: number,
  idArticulo: number,
  usuario: number | null,
): Promise<ResultadoPares | null> {
  const articulo = await articuloDeRevista(c, revista, idArticulo)
  if (!['en-revision', 'en-evaluacion'].includes(articulo.estado)) return null
  const resultado = await resultadoDeLosPares(c, idArticulo)
  if (!resultado) return null

  const cambiar = async (estado: string, accion: 'cierre' | 'revision', texto: string) => {
    await c.query('UPDATE articulo SET estado = $1 WHERE id_articulo = $2', [estado, idArticulo])
    await auditar(c, { usuario, tabla: 'articulo', idRegistro: idArticulo, accion, texto, revista, articulo: idArticulo })
  }
  if (resultado === 'no-publicable') {
    await cambiar('rechazado', 'cierre', 'Cerró el proceso como rechazado: los pares evaluadores calificaron el artículo como no publicable')
  } else if (resultado === 'con-modificaciones') {
    await cambiar(
      'postulado',
      'revision',
      'Devolvió el artículo al comité para una nueva ronda de revisión: los pares lo calificaron como publicable con modificaciones',
    )
  } else if (articulo.volumen !== null) {
    await cambiar(
      'aprobado',
      'cierre',
      `Cerró el proceso como aprobado: los pares lo calificaron como publicable; se publica en el Vol. ${articulo.volumen} n.º ${articulo.numero}`,
    )
  }
  return resultado
}
