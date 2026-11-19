/*
 * resultadoPares — what happens to an article when its peers have delivered their concepts
 * (RF-20, RF-21, RF-30):
 * - «No publicable» from the peers: the process is closed (the article is «Rechazado») and the
 *   constancias of the peers are issued from their evaluations.
 * - «Publicable con modificaciones»: the article goes back to the committee for a new round of
 *   review («Postulado», which is how an article taken up again is handled).
 * - «Publicable»: the article is approved for publication; if it already has volume and number it is
 *   closed as «Aprobado», otherwise the page asks for them (the volume and number are not invented).
 * The registration of the concept calls this after saving it; the history keeps what was done.
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
