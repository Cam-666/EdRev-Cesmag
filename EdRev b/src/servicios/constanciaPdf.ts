/*
 * constanciaPdf — the constancia in PDF (RF-30): the text of the journal's constancia template in
 * use, written over its PDF background (letterhead, design and signature). If the background is not
 * a valid PDF yet, the text goes on a blank A4 page. No sequence number. Regenerated every time it
 * is sent or downloaded (RF-32).
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Cliente } from '../db.js'

export interface DatosConstancia {
  par: string
  articulo: string
  idRevista: number
}

export async function generarConstancia(c: Cliente, d: DatosConstancia): Promise<Uint8Array> {
  const { rows } = await c.query<{ revista: string; cuerpo: string; fondo_pdf: Buffer | null }>(
    `SELECT r.nombre AS revista, p.cuerpo, p.fondo_pdf FROM revista r
       JOIN plantilla p ON p.id_revista = r.id_revista AND p.tipo = 'constancia' AND p.en_uso
      WHERE r.id_revista = $1`,
    [d.idRevista],
  )
  const plantilla = rows[0]
  const valores: Record<string, string> = { par: d.par, articulo: d.articulo, revista: plantilla?.revista ?? '' }
  const texto = (plantilla?.cuerpo ?? 'HACE CONSTAR QUE {{par}} evaluó «{{articulo}}».').replace(
    /\{\{(\w+)\}\}/g,
    (_, k: string) => valores[k] ?? '',
  )

  let doc: PDFDocument
  try {
    if (!plantilla?.fondo_pdf) throw new Error('sin fondo')
    doc = await PDFDocument.load(plantilla.fondo_pdf)
    doc.getPageCount() // a placeholder that is not a real PDF fails here
  } catch {
    doc = await PDFDocument.create()
  }
  const pagina = doc.getPageCount() > 0 ? doc.getPage(0) : doc.addPage([595, 842])
  const { width, height } = pagina.getSize()
  const normal = await doc.embedFont(StandardFonts.TimesRoman)
  const negrita = await doc.embedFont(StandardFonts.TimesRomanBold)

  // Centered paragraphs, wrapped to the page width, from the upper third down.
  let y = height * 0.62
  const margen = 72
  for (const [i, parrafo] of texto.split(/\n\s*\n/).entries()) {
    const fuente = i === 1 ? negrita : normal
    const tamano = i === 1 ? 20 : 13
    const palabras = parrafo.replace(/\s+/g, ' ').trim().split(' ')
    let linea = ''
    const lineas: string[] = []
    for (const p of palabras) {
      const prueba = linea ? `${linea} ${p}` : p
      if (fuente.widthOfTextAtSize(prueba, tamano) > width - margen * 2 && linea) {
        lineas.push(linea)
        linea = p
      } else linea = prueba
    }
    if (linea) lineas.push(linea)
    for (const l of lineas) {
      const ancho = fuente.widthOfTextAtSize(l, tamano)
      pagina.drawText(l, { x: (width - ancho) / 2, y, size: tamano, font: fuente, color: rgb(0.1, 0.1, 0.15) })
      y -= tamano * 1.5
    }
    y -= 14
  }
  return doc.save()
}
