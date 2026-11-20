/*
 * respaldo — copia de seguridad de la base de datos: ejecuta pg_dump sobre DATABASE_URL y guarda el archivo en
 * `respaldos/` como edrev-AAAAMMDD-HHMM.sql, conservando solo los últimos RESPALDOS_A_CONSERVAR (14).
 *
 * npm run respaldo
 *
 * Necesita pg_dump: en el PATH o en PG_DUMP_RUTA (ejemplo en Windows:
 * C:\Program Files\PostgreSQL\18\bin\pg_dump.exe). Para restaurar: psql -d edrev -f respaldos/<archivo>.sql
 * Se programa con el Programador de tareas de Windows o con cron (ver el README).
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
