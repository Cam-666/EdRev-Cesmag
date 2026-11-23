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

// Diseño de la constancia, medido sobre la que entrega la dependencia («constancias pares.pdf», hoja Carta de
// 612 × 792 pt): el texto en Arial (Helvetica, con las mismas medidas) de 11 pt, renglones cada 13,5 pt y 12 pt
// entre párrafos; el texto empieza a 85 pt del borde izquierdo y ocupa 445 pt; el encabezado y el pie de página
// ocupan 441,75 pt de ancho, a 36,9 pt del borde superior y a 38,4 pt del inferior; el cuerpo empieza a 142,6 pt
// del borde superior; los títulos centrados en negrita de una sola línea («CERTIFICA QUE») van en 13 pt; la firma
// mide hasta 183 pt de ancho, va centrada y el nombre de quien firma se sobrepone a su parte baja.
const CARTA: [number, number] = [612, 792]
const MARGEN_IZQUIERDO = 85
const ANCHO_TEXTO = 445
const MARGEN_MEMBRETE = 86.55
const ANCHO_MEMBRETE = 441.75
const MARGEN_SUPERIOR = 36.9
const INICIO_TEXTO = 142.6
const MARGEN_INFERIOR = 38.4
const TAMANO = 11
const TAMANO_TITULO = 13
const RENGLON = 13.5
const ENTRE_PARRAFOS = 12
const ANCHO_FIRMA = 183
const ALTO_FIRMA = 60
/** Espacio antes de la firma y cuánto se sobrepone el nombre a su parte baja. */
const ANTES_FIRMA = 14.3
const SOBRE_FIRMA = 14.5
/** Aire adicional antes de un título como «CERTIFICA QUE». */
const ANTES_TITULO = 2

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
  partes: Array<{ texto: string; negrita: boolean; cursiva: boolean; ancho: number }>
  ancho: number
}

export async function dibujarConstancia(p: PlantillaArchivo, valores: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fuentes = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    cursiva: await doc.embedFont(StandardFonts.HelveticaOblique),
    negritaCursiva: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  }
  const encabezado = await incrustar(doc, p.encabezado)
  const pie = await incrustar(doc, p.pie)
  const firma = await incrustar(doc, p.firma)
  const alto = CARTA[1]
  const anchoTexto = ANCHO_TEXTO

  /** Ajusta una imagen a una caja conservando su proporción (las imágenes grandes se reducen, nunca se agrandan de más). */
  const ajustar = (img: PDFImage, maxAncho: number, maxAlto: number) => {
    const k = Math.min(maxAncho / img.width, maxAlto / img.height)
    return { w: img.width * k, h: img.height * k }
  }
  // El membrete ocupa el ancho de la hoja de referencia; una imagen muy alta se limita para no comerse la hoja.
  const medidaEnc = encabezado ? ajustar(encabezado, ANCHO_MEMBRETE, 90) : { w: 0, h: 0 }
  const medidaPie = pie ? ajustar(pie, ANCHO_MEMBRETE, 90) : { w: 0, h: 0 }
  const xMembrete = (m: { w: number }) => MARGEN_MEMBRETE + (ANCHO_MEMBRETE - m.w) / 2
  // El cuerpo empieza donde en la constancia de referencia; si el encabezado es más alto, un poco más abajo de él.
  const arriba = alto - (encabezado ? Math.max(INICIO_TEXTO, MARGEN_SUPERIOR + medidaEnc.h + 20) : 72)
  const abajo = pie ? MARGEN_INFERIOR + medidaPie.h + 14 : 60

  let pagina!: PDFPage
  let y = 0
  const nuevaPagina = () => {
    pagina = doc.addPage(CARTA)
    if (encabezado) {
      pagina.drawImage(encabezado, { x: xMembrete(medidaEnc), y: alto - MARGEN_SUPERIOR - medidaEnc.h, width: medidaEnc.w, height: medidaEnc.h })
    }
    if (pie) pagina.drawImage(pie, { x: xMembrete(medidaPie), y: MARGEN_INFERIOR, width: medidaPie.w, height: medidaPie.h })
    y = arriba
  }
  nuevaPagina()

  const segura = (f: PDFFont, s: string) => {
    const permitidos = new Set(f.getCharacterSet())
    return [...s.replace(/[​ ]/g, ' ')].map((c) => (permitidos.has(c.codePointAt(0) ?? 0) ? c : '?')).join('')
  }
  const fuente = (b: boolean, c: boolean) =>
    b && c ? fuentes.negritaCursiva : b ? fuentes.negrita : c ? fuentes.cursiva : fuentes.normal
  // El tamaño de la letra del párrafo que se está dibujando (los títulos son más grandes).
  let tam = TAMANO
  const renglon = () => (tam === TAMANO ? RENGLON : tam * (RENGLON / TAMANO))
  const medir = (t: string, b: boolean, c: boolean) => fuente(b, c).widthOfTextAtSize(t, tam)
  const espacio = () => medir(' ', false, false)

  /**
   * Dibuja una línea en la altura actual, alineada; las líneas `ultima` (final de párrafo) nunca se estiran al
   * justificar. `sangria` es el espacio en blanco con que la persona empezó la línea (por ejemplo, bajo «Proyectó:»).
   */
  const dibujarLinea = (palabras: Palabra[], alineacion: Alineacion, ultima: boolean, sangria = 0) => {
    if (y - tam < abajo) nuevaPagina()
    const disponible = anchoTexto - sangria
    const suma = palabras.reduce((s, w) => s + w.ancho, 0)
    const huecos = Math.max(palabras.length - 1, 1)
    const natural = suma + espacio() * (palabras.length - 1)
    const estirar = alineacion === 'justificado' && !ultima && palabras.length > 1
    const sep = estirar ? (disponible - suma) / huecos : espacio()
    const total = estirar ? disponible : natural
    let x =
      alineacion === 'centro' ? MARGEN_IZQUIERDO + (anchoTexto - total) / 2
      : alineacion === 'derecha' ? MARGEN_IZQUIERDO + anchoTexto - total
      : MARGEN_IZQUIERDO + sangria
    for (const w of palabras) {
      let xp = x
      for (const parte of w.partes) {
        const f = fuente(parte.negrita, parte.cursiva)
        pagina.drawText(segura(f, parte.texto), { x: xp, y: y - tam, size: tam, font: f, color: rgb(0, 0, 0) })
        xp += parte.ancho
      }
      x += w.ancho + sep
    }
    y -= renglon()
  }

  let firmaPuesta = false
  for (const parrafo of analizar(rellenarTexto(p.cuerpo, valores))) {
    // Un renglón en blanco que la persona dejó entre dos párrafos.
    if (parrafo.vacio) {
      tam = TAMANO
      y -= RENGLON
      continue
    }
    // Un título: centrado, todo en negrita, de una sola línea corta.
    const unica = parrafo.lineas.length === 1 ? parrafo.lineas[0] : undefined
    const esTitulo =
      parrafo.alineacion === 'centro' &&
      unica !== undefined &&
      unica.length > 0 &&
      unica.every((x) => x.negrita) &&
      unica.map((x) => x.texto).join('').length <= 40
    tam = esTitulo ? TAMANO_TITULO : TAMANO
    if (esTitulo) y -= ANTES_TITULO
    if (parrafo.firma) {
      if (firma) {
        firmaPuesta = true
        const m = ajustar(firma, ANCHO_FIRMA, ALTO_FIRMA)
        if (y - ANTES_FIRMA - m.h < abajo) nuevaPagina()
        y -= ANTES_FIRMA
        const x =
          parrafo.alineacion === 'centro' ? MARGEN_IZQUIERDO + (anchoTexto - m.w) / 2
          : parrafo.alineacion === 'derecha' ? MARGEN_IZQUIERDO + anchoTexto - m.w
          : MARGEN_IZQUIERDO
        pagina.drawImage(firma, { x, y: y - m.h, width: m.w, height: m.h })
        // El nombre de quien firma queda sobre la parte baja de la firma, como en la constancia de la dependencia.
        y -= m.h - SOBRE_FIRMA
      }
      continue
    }
    for (const linea of parrafo.lineas) {
      // La sangría: los espacios con que empieza la línea (solo en las alineadas a la izquierda o justificadas).
      const inicial = /^[ \t]+/.exec(linea.map((t) => t.texto).join(''))?.[0] ?? ''
      let sangria =
        inicial && (parrafo.alineacion === 'izquierda' || parrafo.alineacion === 'justificado')
          ? Math.min(medir(inicial.replace(/\t/g, '    '), false, false), anchoTexto / 2)
          : 0
      // Palabras de la línea con su negrita y su cursiva, y luego se parten al ancho del texto.
      const palabras: Palabra[] = []
      let abierta: Palabra | null = null
      for (const t of linea) {
        for (const trozo of t.texto.split(/(\s+)/)) {
          if (trozo === '') continue
          if (/^\s+$/.test(trozo)) {
            abierta = null
            continue
          }
          const ancho = medir(segura(fuente(t.negrita, t.cursiva), trozo), t.negrita, t.cursiva)
          if (!abierta) {
            abierta = { partes: [], ancho: 0 }
            palabras.push(abierta)
          }
          abierta.partes.push({ texto: trozo, negrita: t.negrita, cursiva: t.cursiva, ancho })
          abierta.ancho += ancho
        }
      }
      if (palabras.length === 0) {
        y -= renglon()
        continue
      }
      let actual: Palabra[] = []
      let usado = 0
      for (const w of palabras) {
        const nuevo = usado + (actual.length ? espacio() : 0) + w.ancho
        if (nuevo > anchoTexto - sangria && actual.length) {
          dibujarLinea(actual, parrafo.alineacion, false, sangria)
          sangria = 0
          actual = [w]
          usado = w.ancho
        } else {
          actual.push(w)
          usado = nuevo
        }
      }
      dibujarLinea(actual, parrafo.alineacion, true, sangria)
    }
    y -= ENTRE_PARRAFOS
  }
  // Sin la marca {{firma}} la imagen de la firma se muestra igual: al final del texto, centrada.
  if (firma && !firmaPuesta) {
    const m = ajustar(firma, ANCHO_FIRMA, ALTO_FIRMA)
    if (y - ANTES_FIRMA - m.h < abajo) nuevaPagina()
    pagina.drawImage(firma, { x: MARGEN_IZQUIERDO + (anchoTexto - m.w) / 2, y: y - ANTES_FIRMA - m.h, width: m.w, height: m.h })
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
