/*
 * npm run db:crear — creates the database named in DATABASE_URL (if it does not exist), connecting
 * to the maintenance database of DATABASE_ADMIN_URL. Same as «Create › Database» in pgAdmin.
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
