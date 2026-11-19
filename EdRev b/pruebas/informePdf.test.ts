/*
 * Pruebas del informe de gestión en PDF (RF-38, HU-27): un documento propio, no una captura.
 */
import { writeFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { generarInformePdf, redactarResumen, type DatosRevista } from '../src/servicios/informePdf.js'
import { como } from './api.js'

const reep: DatosRevista = {
  sigla: 'reep', nombre: 'Revista Electrónica en Educación y Pedagogía', postulados: 12, aprobados: 4, rechazados: 2,
  entregadas: 9, constancias: 5, dias: 57, sumaDias: 513,
  conceptos: { publicable: 5, conModificaciones: 3, noPublicable: 1, pendienteFormato: 0 },
}
const ire: DatosRevista = {
  sigla: 'ire', nombre: 'Revista Investigium IRE Ciencias Sociales y Humanas', postulados: 10, aprobados: 3, rechazados: 1,
  entregadas: 8, constancias: 4, dias: 72, sumaDias: 576,
  conceptos: { publicable: 7, conModificaciones: 1, noPublicable: 0, pendienteFormato: 0 },
}

describe('informe de gestión en PDF', () => {
  it('con las dos revistas: portada, resumen, una sección por revista, comparativo y notas', async () => {
    const bytes = await generarInformePdf({ etiquetaPeriodo: 'Segundo semestre de 2026', revistas: [reep, ire], fecha: new Date(2026, 10, 18) })
    if (process.env.GUARDAR_INFORME) writeFileSync(process.env.GUARDAR_INFORME, bytes)
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4)
    expect(pdf.getTitle()).toBe('Informe de gestión editorial')
  })

  it('con una sola revista no lleva comparativo', async () => {
    const dos = await PDFDocument.load(await generarInformePdf({ etiquetaPeriodo: 'Primer semestre de 2026', revistas: [reep, ire] }))
    const una = await PDFDocument.load(await generarInformePdf({ etiquetaPeriodo: 'Primer semestre de 2026', revistas: [ire] }))
    expect(una.getPageCount()).toBeLessThan(dos.getPageCount())
  })

  it('el resumen se redacta como un informe y sin actividad lo dice', () => {
    expect(redactarResumen('Segundo semestre de 2026', [reep, ire])[0]).toContain('22 artículos postulados')
    expect(redactarResumen('Segundo semestre de 2026', [reep, ire]).at(-1)).toContain('«Publicable»')
    const vacia = { ...ire, postulados: 0, aprobados: 0, rechazados: 0, entregadas: 0, constancias: 0 }
    expect(redactarResumen('Primer semestre de 2026', [vacia])[0]).toContain('no hay actividad registrada')
  })

  it('la ruta entrega el PDF del periodo y de la revista pedidos', async () => {
    const api = await como()
    const r = await api.get('/informes/pdf?revista=ambas&periodo=2026-2').buffer(true).parse((res, cb) => {
      const trozos: Buffer[] = []
      res.on('data', (t: Buffer) => trozos.push(t))
      res.on('end', () => cb(null, Buffer.concat(trozos)))
    })
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toContain('application/pdf')
    expect(r.headers['content-disposition']).toContain('informe-de-gestion-2026-2-ambas.pdf')
    expect((r.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-')
    expect((await api.get('/informes/pdf?revista=otra')).status).toBe(422)
  })
})
