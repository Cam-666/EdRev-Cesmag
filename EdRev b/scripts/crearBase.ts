/*
 * npm run db:crear — crea la base de datos que nombra DATABASE_URL (si no existe), conectándose a la base de
 * mantenimiento de DATABASE_ADMIN_URL. Es lo mismo que «Create › Database» en pgAdmin.
 */
import pg from 'pg'

const destino = new URL(process.env.DATABASE_URL ?? '')
const nombre = destino.pathname.replace(/^\//, '')
const admin = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL })
await admin.connect()
const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre])
if (existe.rows.length > 0) {
  console.log(`La base «${nombre}» ya existe.`)
} else {
  await admin.query(`CREATE DATABASE "${nombre.replace(/"/g, '')}" ENCODING 'UTF8'`)
  console.log(`Base «${nombre}» creada.`)
}
await admin.end()
