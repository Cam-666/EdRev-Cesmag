/*
 * resultadoPares — qué le pasa a un artículo cuando sus pares entregaron sus conceptos (las constancias de los pares
 * se emiten en todos los casos):
 * - «No publicable»: el artículo queda «En evaluación» a la espera de la decisión de la dependencia, que la ficha
 *   pregunta: abrir una nueva ronda del comité (vuelve a «Postulado», como con modificaciones) o rechazarlo
 *   definitivamente (se cierra como «Rechazado»). Ver `decidirNoPublicable`.
 * - «Publicable con modificaciones»: el artículo vuelve al comité para una nueva ronda de revisión («Postulado»,
 *   que es como se maneja un artículo retomado).
 * - «Publicable»: el artículo se aprueba para publicación; si ya tiene volumen y número se cierra como
 *   «Aprobado», y si no, la página los pide (no se inventan).
 * El registro del concepto llama a esta función después de guardarlo; el historial conserva lo que se hizo.
 */
import { enTransaccion, type Cliente } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { ErrorHttp } from '../lib/http.js'
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
  // «No publicable» no cambia nada todavía: la dependencia decide en la ficha (decidirNoPublicable).
  if (resultado === 'con-modificaciones') {
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

/**
 * La decisión sobre un artículo que los pares calificaron como no publicable: abrir una nueva ronda del comité
 * (vuelve a «Postulado», y la ronda sigue la numeración de las anteriores) o rechazarlo definitivamente.
 */
export async function decidirNoPublicable(revista: number, idArticulo: number, abrirRonda: boolean, usuario: number) {
  await enTransaccion(async (c) => {
    const articulo = await articuloDeRevista(c, revista, idArticulo)
    const resultado = await resultadoDeLosPares(c, idArticulo)
    if (resultado !== 'no-publicable' || articulo.estado !== 'en-evaluacion') {
      throw new ErrorHttp(409, 'Este artículo no tiene una calificación de «No publicable» pendiente de decisión')
    }
    const [estado, accion, texto] = abrirRonda
      ? (['postulado', 'revision', 'Abrió una nueva ronda de revisión del comité: los pares evaluadores calificaron el artículo como no publicable'] as const)
      : (['rechazado', 'cierre', 'Cerró el proceso como rechazado definitivamente: los pares evaluadores calificaron el artículo como no publicable'] as const)
    await c.query('UPDATE articulo SET estado = $1 WHERE id_articulo = $2', [estado, idArticulo])
    await auditar(c, { usuario, tabla: 'articulo', idRegistro: idArticulo, accion, texto, revista, articulo: idArticulo })
  })
}
