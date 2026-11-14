/*
 * respaldo — copy of the database (RNF-08): runs pg_dump on DATABASE_URL and saves the file in
 * `respaldos/` as edrev-AAAAMMDD-HHMM.sql, keeping only the last RESPALDOS_A_CONSERVAR (14).
 *
 *   npm run respaldo
 *
 * Needs pg_dump: on the PATH or in PG_DUMP_RUTA (Windows example:
 * C:\Program Files\PostgreSQL\18\bin\pg_dump.exe). To restore: psql -d edrev -f respaldos/<archivo>.sql
 * Schedule it with the Windows Task Scheduler or cron (see the README).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL (vea .env.example)')
  process.exit(1)
}
const carpeta = process.env.RESPALDOS_CARPETA ?? 'respaldos'
const conservar = Number(process.env.RESPALDOS_A_CONSERVAR ?? 14)
const pgDump = process.env.PG_DUMP_RUTA ?? 'pg_dump'

const ahora = new Date()
const dos = (n: number) => String(n).padStart(2, '0')
const nombre = `edrev-${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}.sql`

mkdirSync(carpeta, { recursive: true })
const destino = join(carpeta, nombre)
try {
  execFileSync(pgDump, ['--dbname', url, '--no-owner', '--file', destino], { stdio: ['ignore', 'inherit', 'inherit'] })
} catch (e) {
  rmSync(destino, { force: true })
  console.error(`No se pudo crear el respaldo (${(e as Error).message}). ¿Está pg_dump en el PATH o en PG_DUMP_RUTA?`)
  process.exit(1)
}
console.log(`Respaldo creado: ${destino}`)

const viejos = readdirSync(carpeta)
  .filter((f) => /^edrev-\d{8}-\d{4}\.sql$/.test(f))
  .sort()
  .slice(0, -conservar)
for (const f of viejos) rmSync(join(carpeta, f))
if (viejos.length > 0) console.log(`Se borraron ${viejos.length} respaldos antiguos (se conservan ${conservar}).`)
