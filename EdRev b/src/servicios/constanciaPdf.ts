/*
 * constanciaPdf — the constancia in PDF (RF-30): the text of the journal's constancia template in
 * use, with its alignment and bold, between the template's header and footer images, and with the
 * signature image where the {{firma}} marker is. Besides the peer and the article, the text can use
 * the journal's ISSN and indexations (set in Configuración), the date and the year. No sequence
 * number. Regenerated every time it is sent or downloaded, so it always carries the current
 * indexations (RF-32).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import type { Cliente } from '../db.js'
import { analizar, type Alineacion } from '../lib/formato.js'

export interface DatosConstancia {
  par: string
  articulo: string
  idRevista: number
}

export interface PlantillaArchivo {
  cuerpo: string
  encabezado: Buffer | null
  pie: Buffer | null
  firma: Buffer | null
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** «14 de noviembre de 2026» */
export function fechaLarga(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

/** «A, B, C y D» is written by the Administradora as one text; it goes in as it is. */
export interface ValoresConstancia {
  revista: string
  par: string
  articulo: string
  issn: string
  indexaciones: string
}

export function valoresDe(v: ValoresConstancia, fecha = new Date()): Record<string, string> {
  // REVISTA and PAR are the same texts in capitals, for headings.
  return { ...v, REVISTA: v.revista.toUpperCase(), PAR: v.par.toUpperCase(), fecha: fechaLarga(fecha), anio: String(fecha.getFullYear()) }
}

const A4: [number, number] = [595, 842]
const MARGEN_LATERAL = 70
const TAMANO = 11.5
const INTERLINEADO = 1.4
const ENTRE_PARRAFOS = 12

async function incrustar(doc: PDFDocument, datos: Buffer | null): Promise<PDFImage | null> {
  if (!datos || datos.length < 8) return null
  try {
    return datos[0] === 0x89 ? await doc.embedPng(datos) : await doc.embedJpg(datos)
  } catch {
    return null // a damaged image must not stop the constancia
  }
}

/** A word: its pieces (a bold piece stuck to a normal one, like «título», stays one word). */
interface Palabra {
  partes: Array<{ texto: string; negrita: boolean; ancho: number }>
  ancho: number
}

export async function dibujarConstancia(p: PlantillaArchivo, valores: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold)
  const encabezado = await incrustar(doc, p.encabezado)
  const pie = await incrustar(doc, p.pie)
  const firma = await incrustar(doc, p.firma)
  const [ancho, alto] = A4
  const anchoTexto = ancho - MARGEN_LATERAL * 2

  /** Fits an image in a box keeping its proportion. */
  const ajustar = (img: PDFImage, maxAncho: number, maxAlto: number) => {
    const k = Math.min(maxAncho / img.width, maxAlto / img.height, 1)
    return { w: img.width * k, h: img.height * k }
  }
  const medidaEnc = encabezado ? ajustar(encabezado, ancho - 80, 110) : { w: 0, h: 0 }
  const medidaPie = pie ? ajustar(pie, ancho - 80, 80) : { w: 0, h: 0 }
  const arriba = alto - (encabezado ? 28 + medidaEnc.h + 24 : 72)
  const abajo = pie ? 22 + medidaPie.h + 18 : 72

  let pagina!: PDFPage
  let y = 0
  const nuevaPagina = () => {
    pagina = doc.addPage(A4)
    if (encabezado) {
      pagina.drawImage(encabezado, { x: (ancho - medidaEnc.w) / 2, y: alto - 28 - medidaEnc.h, width: medidaEnc.w, height: medidaEnc.h })
    }
    if (pie) pagina.drawImage(pie, { x: (ancho - medidaPie.w) / 2, y: 22, width: medidaPie.w, height: medidaPie.h })
    y = arriba
  }
  nuevaPagina()

  const segura = (f: PDFFont, s: string) => {
    const permitidos = new Set(f.getCharacterSet())
    return [...s.replace(/[​ ]/g, ' ')].map((c) => (permitidos.has(c.codePointAt(0) ?? 0) ? c : '?')).join('')
  }
  const fuente = (b: boolean) => (b ? negrita : normal)
  const medir = (t: string, b: boolean) => fuente(b).widthOfTextAtSize(t, TAMANO)
  const espacio = medir(' ', false)

  /** Draws one line at the current y, aligned; `ultima` lines are never stretched. */
  const dibujarLinea = (palabras: Palabra[], alineacion: Alineacion, ultima: boolean) => {
    if (y - TAMANO < abajo) nuevaPagina()
    const suma = palabras.reduce((s, w) => s + w.ancho, 0)
    const huecos = Math.max(palabras.length - 1, 1)
    const natural = suma + espacio * (palabras.length - 1)
    const estirar = alineacion === 'justificado' && !ultima && palabras.length > 1
    const sep = estirar ? (anchoTexto - suma) / huecos : espacio
    const total = estirar ? anchoTexto : natural
    let x =
      alineacion === 'centro' ? MARGEN_LATERAL + (anchoTexto - total) / 2
      : alineacion === 'derecha' ? MARGEN_LATERAL + anchoTexto - total
      : MARGEN_LATERAL
    for (const w of palabras) {
      let xp = x
      for (const parte of w.partes) {
        pagina.drawText(segura(fuente(parte.negrita), parte.texto), { x: xp, y: y - TAMANO, size: TAMANO, font: fuente(parte.negrita), color: rgb(0.05, 0.05, 0.08) })
        xp += parte.ancho
      }
      x += w.ancho + sep
    }
    y -= TAMANO * INTERLINEADO
  }

  for (const parrafo of analizar(rellenarTexto(p.cuerpo, valores))) {
    if (parrafo.firma) {
      if (firma) {
        const m = ajustar(firma, 170, 60)
        if (y - m.h < abajo) nuevaPagina()
        const x =
          parrafo.alineacion === 'centro' ? (ancho - m.w) / 2
          : parrafo.alineacion === 'derecha' ? ancho - MARGEN_LATERAL - m.w
          : MARGEN_LATERAL
        pagina.drawImage(firma, { x, y: y - m.h, width: m.w, height: m.h })
        y -= m.h + 2
      }
      continue
    }
    for (const linea of parrafo.lineas) {
      // Words of the line with their bold, then wrapped to the width of the text.
      const palabras: Palabra[] = []
      let abierta: Palabra | null = null
      for (const t of linea) {
        for (const trozo of t.texto.split(/(\s+)/)) {
          if (trozo === '') continue
          if (/^\s+$/.test(trozo)) {
            abierta = null
            continue
          }
          const ancho = medir(segura(fuente(t.negrita), trozo), t.negrita)
          if (!abierta) {
            abierta = { partes: [], ancho: 0 }
            palabras.push(abierta)
          }
          abierta.partes.push({ texto: trozo, negrita: t.negrita, ancho })
          abierta.ancho += ancho
        }
      }
      if (palabras.length === 0) {
        y -= TAMANO * INTERLINEADO
        continue
      }
      let actual: Palabra[] = []
      let usado = 0
      for (const w of palabras) {
        const nuevo = usado + (actual.length ? espacio : 0) + w.ancho
        if (nuevo > anchoTexto && actual.length) {
          dibujarLinea(actual, parrafo.alineacion, false)
          actual = [w]
          usado = w.ancho
        } else {
          actual.push(w)
          usado = nuevo
        }
      }
      dibujarLinea(actual, parrafo.alineacion, true)
    }
    y -= ENTRE_PARRAFOS
  }
  return doc.save()
}

function rellenarTexto(texto: string, valores: Record<string, string>): string {
  // {{firma}} stays: it marks where the signature image goes.
  return texto.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k === 'firma' ? m : (valores[k] ?? '')))
}

interface FilaPlantilla extends PlantillaArchivo {
  revista: string
  issn: string | null
  indexaciones: string | null
}

const CARGA = `SELECT r.nombre AS revista, r.issn, r.indexaciones, p.cuerpo, p.encabezado, p.pie, p.firma
                 FROM plantilla p JOIN revista r ON r.id_revista = p.id_revista`

export async function generarConstancia(c: Cliente, d: DatosConstancia): Promise<Uint8Array> {
  const { rows } = await c.query<FilaPlantilla>(`${CARGA} WHERE p.id_revista = $1 AND p.tipo = 'constancia' AND p.en_uso`, [
    d.idRevista,
  ])
  const f = rows[0]
  const plantilla: PlantillaArchivo = f ?? {
    cuerpo: 'HACE CONSTAR QUE {{par}} evaluó «{{articulo}}».',
    encabezado: null,
    pie: null,
    firma: null,
  }
  return dibujarConstancia(
    plantilla,
    valoresDe({ revista: f?.revista ?? '', par: d.par, articulo: d.articulo, issn: f?.issn ?? '', indexaciones: f?.indexaciones ?? '' }),
  )
}

/** The template as it is now, with sample data: to see how the constancia will look. */
export async function vistaPrevia(c: Cliente, idPlantilla: number): Promise<Uint8Array | null> {
  const { rows } = await c.query<FilaPlantilla>(`${CARGA} WHERE p.id_plantilla = $1`, [idPlantilla])
  const f = rows[0]
  if (!f) return null
  return dibujarConstancia(
    f,
    valoresDe({
      revista: f.revista,
      par: 'DIANA MARCELA QUIRÁ ORDOÑEZ',
      articulo: 'Título del artículo de ejemplo',
      issn: f.issn ?? '',
      indexaciones: f.indexaciones ?? '',
    }),
  )
}
