/*
 * migrarExcel — carga el Excel (.xlsx) o CSV de una revista en la base de datos.
 *
 * npm run migrar -- reep ruta/al/archivo.xlsx            (carga)
 * npm run migrar -- ire ruta/al/archivo.csv --simular    (prueba: no guarda nada)
 * npm run migrar -- todas ruta/al/archivo.xlsx           (ambas revistas mezcladas: usa la columna «Revista»)
 *
 * Lee la primera hoja; la primera fila son los encabezados (ver servicios/migracion.ts).
 */
import ExcelJS from 'exceljs'
import { enTransaccion, pool } from '../src/db.js'
import { REVISTAS, type Sigla } from '../src/lib/http.js'
import { migrarFilas, repartirPorRevista, type FilaCruda } from '../src/servicios/migracion.js'

const [sigla, ruta, ...opciones] = process.argv.slice(2)
if (!sigla || !(sigla in REVISTAS || sigla === 'todas') || !ruta) {
  console.error('Uso: npm run migrar -- <reep|ire|todas> <archivo.xlsx|archivo.csv> [--simular]')
  process.exit(1)
}

function valor(celda: ExcelJS.CellValue): unknown {
  if (celda && typeof celda === 'object' && !(celda instanceof Date)) {
    if ('result' in celda) return celda.result
    if ('richText' in celda) return celda.richText.map((t) => t.text).join('')
    if ('text' in celda) return celda.text
  }
  return celda
}

const libro = new ExcelJS.Workbook()
if (ruta.toLowerCase().endsWith('.csv')) await libro.csv.readFile(ruta)
else await libro.xlsx.readFile(ruta)
const hoja = libro.worksheets[0]
if (!hoja) throw new Error('El archivo no tiene hojas')

const titulos: string[] = []
hoja.getRow(1).eachCell((celda, n) => {
  titulos[n] = String(valor(celda.value) ?? '')
})
const filas: FilaCruda[] = []
hoja.eachRow((fila, n) => {
  if (n === 1) return
  const registro: FilaCruda = {}
  titulos.forEach((t, i) => {
    if (t) registro[t] = valor(fila.getCell(i).value)
  })
  filas.push(registro)
})

const simular = opciones.includes('--simular')
const trabajos: Array<{ nombre: string; id: number; filas: FilaCruda[] }> = []
let sinRevista = 0
if (sigla === 'todas') {
  const reparto = repartirPorRevista(filas)
  sinRevista = reparto.sinRevista
  for (const [nombre, id] of Object.entries(REVISTAS)) trabajos.push({ nombre, id, filas: reparto.porRevista.get(id) ?? [] })
} else {
  trabajos.push({ nombre: sigla, id: REVISTAS[sigla as Sigla], filas })
}

const resumen = await enTransaccion(async (c) => {
  const salida: Record<string, unknown> = {}
  for (const t of trabajos) salida[t.nombre] = await migrarFilas(c, t.id, t.filas)
  if (sinRevista > 0) salida.filasSinRevistaClara = sinRevista
  if (simular) throw Object.assign(new Error('simulacion'), { resumen: salida })
  return salida
}).catch((e: Error & { resumen?: unknown }) => {
  if (e.message === 'simulacion') return e.resumen
  throw e
})

console.log(simular ? 'SIMULACIÓN (no se guardó nada):' : 'Migración terminada:')
console.log(JSON.stringify(resumen, null, 2))
await pool.end()
