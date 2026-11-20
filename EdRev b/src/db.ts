/* db — conexión a PostgreSQL (pool) y ayuda para transacciones. Las consultas siempre van parametrizadas. */
import pg from 'pg'
import { config } from './config.js'

// Las columnas DATE llegan como texto 'aaaa-mm-dd', no como objetos Date en hora local (evita corrimientos de un día).
pg.types.setTypeParser(1082, (valor) => valor)
// Las columnas NUMERIC (porcentajes) llegan como números.
pg.types.setTypeParser(1700, (valor) => Number(valor))

export const pool = new pg.Pool({ connectionString: config.baseDatos, max: 10 })

export type Cliente = pg.PoolClient | pg.Pool

export async function enTransaccion<T>(trabajo: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const resultado = await trabajo(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (e) {
    await cliente.query('ROLLBACK')
    throw e
  } finally {
    cliente.release()
  }
}
