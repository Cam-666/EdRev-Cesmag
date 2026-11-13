/*
 * npm run db:init — runs db/01_esquema.sql and db/02_datos_iniciales.sql on the empty database of
 * DATABASE_URL, in one transaction. Same as running both files in pgAdmin's Query Tool.
 */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL })
await cliente.connect()
const ya = await cliente.query("SELECT to_regclass('public.articulo') AS tabla")
if (ya.rows[0]?.tabla) {
  console.log('La base ya tiene las tablas: no se hizo nada.')
  await cliente.end()
  process.exit(0)
}
try {
  await cliente.query('BEGIN')
  for (const archivo of ['01_esquema.sql', '02_datos_iniciales.sql']) {
    await cliente.query(await readFile(new URL(`../db/${archivo}`, import.meta.url), 'utf8'))
    console.log(`✓ ${archivo}`)
  }
  await cliente.query('COMMIT')
  console.log('Base lista. Ingreso: maria.mendoza@unicesmag.edu.co / Editorial2026*')
} catch (e) {
  await cliente.query('ROLLBACK')
  console.error('No se pudo crear la base:', (e as Error).message)
  process.exitCode = 1
} finally {
  await cliente.end()
}
