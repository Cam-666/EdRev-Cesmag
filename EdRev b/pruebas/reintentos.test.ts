/*
 * Pruebas del reintento automático de los correos fallidos — RF-27, RF-28.
 */
import { describe, expect, it } from 'vitest'
import { pool } from '../src/db.js'
import { reencolarFallidos, registrarFallo } from '../src/servicios/envioCorreos.js'
import { articuloAprobado, candidato } from './api.js'

async function correoDe(asignacion: string) {
  const { rows } = await pool.query<{ id_correo: number; id_articulo: number }>(
    `SELECT c.id_correo, e.id_articulo FROM correo c JOIN evaluacion e USING (id_evaluacion)
      WHERE c.id_evaluacion = $1 ORDER BY c.id_correo DESC LIMIT 1`,
    [Number(asignacion)],
  )
  const fila = rows[0]
  if (!fila) throw new Error('sin correo')
  return fila
}

const estado = async (id: number) =>
  (await pool.query<{ resultado: string }>('SELECT resultado FROM correo WHERE id_correo = $1', [id])).rows[0]?.resultado

async function fallar(id: number) {
  await pool.query("UPDATE correo SET resultado = 'fallido', fecha_envio = now() - interval '1 hour' WHERE id_correo = $1", [id])
}

describe('reintento automático de correos fallidos (RF-27)', () => {
  it('vuelve a poner en cola el correo fallido y deja de insistir tras el máximo de fallos', async () => {
    const { id } = await articuloAprobado()
    const p = await candidato(id, 1)
    const { id_correo: correo, id_articulo: articulo } = await correoDe(p.asignacion.id)

    await fallar(correo)
    await registrarFallo(pool, correo, 1, articulo)
    expect(await reencolarFallidos(pool, 10, 3)).toBeGreaterThanOrEqual(1)
    expect(await estado(correo)).toBe('en-cola')

    // Tres fallos seguidos: ya no se reintenta solo (queda para el reintento manual).
    await fallar(correo)
    await registrarFallo(pool, correo, 1, articulo)
    await registrarFallo(pool, correo, 1, articulo)
    await reencolarFallidos(pool, 10, 3)
    expect(await estado(correo)).toBe('fallido')
  })

  it('no reenvía un fallido que ya fue reemplazado por el reenvío con la dirección corregida', async () => {
    const { id } = await articuloAprobado()
    const p = await candidato(id, 2)
    const { id_correo: viejo } = await correoDe(p.asignacion.id)
    await fallar(viejo)
    await pool.query(
      "INSERT INTO correo (id_evaluacion, tipo, destinatario, resultado) VALUES ($1, 'invitacion', 'corregida@x.co', 'enviado')",
      [Number(p.asignacion.id)],
    )
    await reencolarFallidos(pool, 10, 3)
    expect(await estado(viejo)).toBe('fallido')
  })

  it('espera los minutos indicados antes de reintentar', async () => {
    const { id } = await articuloAprobado()
    const p = await candidato(id, 3)
    const { id_correo: correo } = await correoDe(p.asignacion.id)
    await pool.query("UPDATE correo SET resultado = 'fallido', fecha_envio = now() WHERE id_correo = $1", [correo])
    await reencolarFallidos(pool, 10, 3)
    expect(await estado(correo)).toBe('fallido')
  })
})
