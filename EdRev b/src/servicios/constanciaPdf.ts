/*
 * constanciaPdf — la constancia en PDF: el texto de la plantilla de constancia en uso de la revista, con su
 * alineación y su negrita, entre las imágenes de encabezado y de pie de página de la plantilla, y con la imagen
 * de la firma donde está la marca {{firma}}. Además del par y el artículo, el texto puede usar el ISSN y las
 * indexaciones de la revista (se registran en Configuración), la fecha y el año. No lleva consecutivo.
 * Se genera de nuevo cada vez que se envía o se descarga, así siempre lleva las indexaciones actuales.
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

/** «A, B, C y D» lo escribe la Administradora como un solo texto; entra tal cual. */
export interface ValoresConstancia {
  revista: string
  par: string
  articulo: string
  issn: string
  indexaciones: string
}

export function valoresDe(v: ValoresConstancia, fecha = new Date()): Record<string, string> {
  // REVISTA y PAR son los mismos textos en mayúsculas, para los títulos.
  return { ...v, REVISTA: v.revista.toUpperCase(), PAR: v.par.toUpperCase(), fecha: fechaLarga(fecha), anio: String(fecha.getFullYear()) }
}

// Diseño de la constancia, tal como la entrega la dependencia (hoja Carta): el texto y el membrete ocupan el mismo
// ancho, el cuerpo va en 12 pt con interlineado sencillo y los títulos centrados en negrita de una sola línea
// («CERTIFICA QUE») se dibujan un poco más grandes.
const CARTA: [number, number] = [612, 792]
const MARGEN_LATERAL = 81
const MARGEN_SUPERIOR = 36
const SEPARACION_MEMBRETE = 55
const MARGEN_INFERIOR = 20
const TAMANO = 12
const TAMANO_TITULO = 14.5
const INTERLINEADO = 1.15
const ENTRE_PARRAFOS = 12

async function incrustar(doc: PDFDocument, datos: Buffer | null): Promise<PDFImage | null> {
  if (!datos || datos.length < 8) return null
  try {
    return datos[0] === 0x89 ? await doc.embedPng(datos) : await doc.embedJpg(datos)
  } catch {
    return null // una imagen dañada no debe impedir que se genere la constancia
  }
}

/** Una palabra: sus trozos (un trozo en negrita pegado a uno normal, como «título», sigue siendo una palabra). */
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
  const [ancho, alto] = CARTA
  const anchoTexto = ancho - MARGEN_LATERAL * 2

  /** Ajusta una imagen a una caja conservando su proporción. */
  const ajustar = (img: PDFImage, maxAncho: number, maxAlto: number) => {
    const k = Math.min(maxAncho / img.width, maxAlto / img.height, 1)
    return { w: img.width * k, h: img.height * k }
  }
  const medidaEnc = encabezado ? ajustar(encabezado, anchoTexto, 80) : { w: 0, h: 0 }
  const medidaPie = pie ? ajustar(pie, anchoTexto, 80) : { w: 0, h: 0 }
  const arriba = alto - (encabezado ? MARGEN_SUPERIOR + medidaEnc.h + SEPARACION_MEMBRETE : 72)
  const abajo = pie ? MARGEN_INFERIOR + medidaPie.h + 14 : 60

  let pagina!: PDFPage
  let y = 0
  const nuevaPagina = () => {
    pagina = doc.addPage(CARTA)
    if (encabezado) {
      pagina.drawImage(encabezado, { x: (ancho - medidaEnc.w) / 2, y: alto - MARGEN_SUPERIOR - medidaEnc.h, width: medidaEnc.w, height: medidaEnc.h })
    }
    if (pie) pagina.drawImage(pie, { x: (ancho - medidaPie.w) / 2, y: MARGEN_INFERIOR, width: medidaPie.w, height: medidaPie.h })
    y = arriba
  }
  nuevaPagina()

  const segura = (f: PDFFont, s: string) => {
    const permitidos = new Set(f.getCharacterSet())
    return [...s.replace(/[​ ]/g, ' ')].map((c) => (permitidos.has(c.codePointAt(0) ?? 0) ? c : '?')).join('')
  }
  const fuente = (b: boolean) => (b ? negrita : normal)
  // El tamaño de la letra del párrafo que se está dibujando (los títulos son más grandes).
  let tam = TAMANO
  const medir = (t: string, b: boolean) => fuente(b).widthOfTextAtSize(t, tam)
  const espacio = () => medir(' ', false)

  /** Dibuja una línea en la altura actual, alineada; las líneas `ultima` (final de párrafo) nunca se estiran al justificar. */
  const dibujarLinea = (palabras: Palabra[], alineacion: Alineacion, ultima: boolean) => {
    if (y - tam < abajo) nuevaPagina()
    const suma = palabras.reduce((s, w) => s + w.ancho, 0)
    const huecos = Math.max(palabras.length - 1, 1)
    const natural = suma + espacio() * (palabras.length - 1)
    const estirar = alineacion === 'justificado' && !ultima && palabras.length > 1
    const sep = estirar ? (anchoTexto - suma) / huecos : espacio()
    const total = estirar ? anchoTexto : natural
    let x =
      alineacion === 'centro' ? MARGEN_LATERAL + (anchoTexto - total) / 2
      : alineacion === 'derecha' ? MARGEN_LATERAL + anchoTexto - total
      : MARGEN_LATERAL
    for (const w of palabras) {
      let xp = x
      for (const parte of w.partes) {
        pagina.drawText(segura(fuente(parte.negrita), parte.texto), { x: xp, y: y - tam, size: tam, font: fuente(parte.negrita), color: rgb(0.05, 0.05, 0.08) })
        xp += parte.ancho
      }
      x += w.ancho + sep
    }
    y -= tam * INTERLINEADO
  }

  let firmaPuesta = false
  for (const parrafo of analizar(rellenarTexto(p.cuerpo, valores))) {
    // Un título: centrado, todo en negrita, de una sola línea corta.
    const unica = parrafo.lineas.length === 1 ? parrafo.lineas[0] : undefined
    const esTitulo =
      parrafo.alineacion === 'centro' &&
      unica !== undefined &&
      unica.length > 0 &&
      unica.every((x) => x.negrita) &&
      unica.map((x) => x.texto).join('').length <= 40
    tam = esTitulo ? TAMANO_TITULO : TAMANO
    if (parrafo.firma) {
      if (firma) {
        firmaPuesta = true
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
      // Palabras de la línea con su negrita, y luego se parten al ancho del texto.
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
        y -= tam * INTERLINEADO
        continue
      }
      let actual: Palabra[] = []
      let usado = 0
      for (const w of palabras) {
        const nuevo = usado + (actual.length ? espacio() : 0) + w.ancho
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
  // Sin la marca {{firma}} la imagen de la firma se muestra igual: al final del texto, centrada.
  if (firma && !firmaPuesta) {
    const m = ajustar(firma, 170, 60)
    if (y - m.h < abajo) nuevaPagina()
    pagina.drawImage(firma, { x: (ancho - m.w) / 2, y: y - m.h, width: m.w, height: m.h })
  }
  return doc.save()
}

function rellenarTexto(texto: string, valores: Record<string, string>): string {
  // {{firma}} se conserva: marca dónde va la imagen de la firma.
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
  const { rows } = await c.query<FilaPlantilla>(`${CARGA} WHERE p.id_revista = $1 AND p.tipo = 'constancia'`, [
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

/** La plantilla como está ahora, con datos de ejemplo: para ver cómo quedará la constancia. */
export async function vistaPrevia(c: Cliente, idPlantilla: number, cuerpo?: string): Promise<Uint8Array | null> {
  const { rows } = await c.query<FilaPlantilla>(`${CARGA} WHERE p.id_plantilla = $1`, [idPlantilla])
  const f = rows[0]
  if (!f) return null
  return dibujarConstancia(
    cuerpo === undefined ? f : { ...f, cuerpo },
    valoresDe({
      revista: f.revista,
      par: 'DIANA MARCELA QUIRÁ ORDOÑEZ',
      articulo: 'Título del artículo de ejemplo',
      issn: f.issn ?? '',
      indexaciones: f.indexaciones ?? '',
    }),
  )
}
