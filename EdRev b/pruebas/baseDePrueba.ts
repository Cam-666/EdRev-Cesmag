/*
 * baseDePrueba — global setup of the backend tests: (re)creates the database «edrev_prueba» with
 * db/01_esquema.sql and db/02_datos_iniciales.sql, so the tests never touch the real «edrev».
 * Uses DATABASE_ADMIN_URL of .env to create it.
 */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

export const NOMBRE = 'edrev_prueba'

export function urlDePrueba(): string {
  const url = new URL(process.env.DATABASE_URL ?? '')
  url.pathname = `/${NOMBRE}`
  return url.toString()
}

export default async function prepararBase(): Promise<void> {
  process.loadEnvFile('.env')
  const admin = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${NOMBRE} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${NOMBRE} ENCODING 'UTF8'`)
  await admin.end()

  const cliente = new pg.Client({ connectionString: urlDePrueba() })
  await cliente.connect()
  for (const archivo of ['01_esquema.sql', '02_datos_iniciales.sql']) {
    await cliente.query(await readFile(new URL(`../db/${archivo}`, import.meta.url), 'utf8'))
  }
  await cliente.end()
}
