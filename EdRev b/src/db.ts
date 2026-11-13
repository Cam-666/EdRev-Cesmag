/*
 * db — PostgreSQL connection pool and a transaction helper. Queries are always parameterized.
 */
import pg from 'pg'
import { config } from './config.js'

// DATE columns come back as 'yyyy-MM-dd' strings, not as Date objects in local time.
pg.types.setTypeParser(1082, (valor) => valor)
// NUMERIC (percentages) as numbers
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
