/*
 * informePdf — the management report as a PDF document (RF-38, HU-27): cover with the header of the
 * university, executive summary, key figures, a section with charts for each journal (the stages
 * of the process and the distribution of the concepts of the peers), a comparison when both
 * journals are included, and the notes on how each figure is counted. It is drawn here, not
 * captured from the screen: every journal keeps its own color and its own section.
 */
import { readFileSync } from 'node:fs'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'

export interface DatosRevista {
  sigla: 'reep' | 'ire'
  nombre: string
  postulados: number
  aprobados: number
  rechazados: number
  entregadas: number
  constancias: number
  /** Mean days from the assignment of the peer to the delivery of the evaluation. */
  dias: number
  /** Sum of those days, to weigh the mean of both journals by their evaluations. */
  sumaDias: number
  conceptos: { publicable: number; conModificaciones: number; noPublicable: number; pendienteFormato: number }
}

export interface DatosInforme {
  etiquetaPeriodo: string
  revistas: DatosRevista[]
  fecha?: Date
}

const AZUL = rgb(0.059, 0.29, 0.541)
const TEXTO = rgb(0.13, 0.13, 0.15)
const GRIS = rgb(0.4, 0.42, 0.46)
const LINEA = rgb(0.85, 0.86, 0.88)
const FONDO = rgb(0.945, 0.953, 0.965)
const SERIE = { reep: rgb(0.847, 0.106, 0.376), ire: rgb(0.165, 0.47, 0.839) }
const UNICA = rgb(0.059, 0.29, 0.541)

const ANCHO = 595.28
const ALTO = 841.89
const MARGEN = 52
const UTIL = ANCHO - MARGEN * 2
const PIE = 46

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const CONCEPTOS = [
  { clave: 'publicable', nombre: 'Publicable' },
  { clave: 'conModificaciones', nombre: 'Publicable con modificaciones' },
  { clave: 'noPublicable', nombre: 'No publicable' },
  { clave: 'pendienteFormato', nombre: 'Pendiente formato de evaluación' },
] as const

const cantidad = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

function totales(revistas: DatosRevista[]) {
  const suma = (f: (r: DatosRevista) => number) => revistas.reduce((s, r) => s + f(r), 0)
  const entregadas = suma((r) => r.entregadas)
  return {
    postulados: suma((r) => r.postulados),
    aprobados: suma((r) => r.aprobados),
    rechazados: suma((r) => r.rechazados),
    entregadas,
    constancias: suma((r) => r.constancias),
    dias: entregadas === 0 ? 0 : Math.round(suma((r) => r.sumaDias) / entregadas),
    conceptos: {
      publicable: suma((r) => r.conceptos.publicable),
      conModificaciones: suma((r) => r.conceptos.conModificaciones),
      noPublicable: suma((r) => r.conceptos.noPublicable),
      pendienteFormato: suma((r) => r.conceptos.pendienteFormato),
    },
  }
}

/** The executive summary of a set of journals, in formal Spanish. */
export function redactarResumen(etiquetaPeriodo: string, revistas: DatosRevista[]): string[] {
  const periodo = `el ${etiquetaPeriodo.charAt(0).toLowerCase()}${etiquetaPeriodo.slice(1)}`
  const unica = revistas.length === 1 ? revistas[0] : undefined
  const sujeto = unica ? `la ${unica.nombre}` : 'las dos revistas de la Universidad CESMAG'
  const verbo = unica ? 'registró' : 'registraron'
  const t = totales(revistas)
  if (t.postulados === 0 && t.entregadas === 0 && t.constancias === 0) {
    return [`Durante ${periodo} no hay actividad registrada para ${sujeto}.`]
  }
  const parrafos = [
    `Durante ${periodo}, ${sujeto} ${verbo} ${cantidad(t.postulados, 'artículo postulado', 'artículos postulados')}, ` +
      `de los cuales ${cantidad(t.aprobados, 'fue aprobado', 'fueron aprobados')} y ${cantidad(t.rechazados, 'fue rechazado', 'fueron rechazados')}.`,
  ]
  if (t.entregadas === 0) {
    parrafos.push(
      `No se registraron evaluaciones entregadas por los pares en el periodo, y se emitieron ${cantidad(t.constancias, 'constancia', 'constancias')}.`,
    )
    return parrafos
  }
  parrafos.push(
    `Los pares evaluadores entregaron ${cantidad(t.entregadas, 'evaluación', 'evaluaciones')} y se emitieron ` +
      `${cantidad(t.constancias, 'constancia', 'constancias')}. El tiempo promedio de evaluación fue de ${cantidad(t.dias, 'día', 'días')}.`,
  )
  const total = CONCEPTOS.reduce((s, c) => s + t.conceptos[c.clave], 0)
  if (total > 0) {
    const principal = CONCEPTOS.reduce((m, c) => (t.conceptos[c.clave] > t.conceptos[m.clave] ? c : m))
    const n = t.conceptos[principal.clave]
    parrafos.push(`El concepto más frecuente fue «${principal.nombre}», con ${n} de ${total} (${Math.round((n / total) * 100)} %).`)
  }
  return parrafos
}

class Lienzo {
  pagina!: PDFPage
  y = 0
  n = 0
  constructor(
    readonly doc: PDFDocument,
    readonly normal: PDFFont,
    readonly negrita: PDFFont,
    readonly cursiva: PDFFont,
    readonly escudo: PDFImage | null,
    readonly cabecera: string,
  ) {}

  nuevaPagina(): void {
    this.pagina = this.doc.addPage([ANCHO, ALTO])
    this.n += 1
    if (this.n === 1) {
      this.y = ALTO - MARGEN
      return
    }
    // Running header: what report this is, with a thin rule.
    this.pagina.drawText(this.cabecera, { x: MARGEN, y: ALTO - 34, size: 8.5, font: this.normal, color: GRIS })
    this.pagina.drawLine({ start: { x: MARGEN, y: ALTO - 42 }, end: { x: ANCHO - MARGEN, y: ALTO - 42 }, thickness: 0.6, color: LINEA })
    this.y = ALTO - 78
  }

  /** Makes sure `alto` points are free; otherwise starts a new page. */
  asegurar(alto: number): void {
    if (this.y - alto < PIE + 10) this.nuevaPagina()
  }

  espacio(p: number): void {
    this.y -= p
  }

  texto(t: string, o: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}): void {
    this.pagina.drawText(t, { x: o.x ?? MARGEN, y: this.y, size: o.size ?? 11, font: o.font ?? this.normal, color: o.color ?? TEXTO })
  }

  /** A paragraph wrapped to the width of the page; returns nothing, moves the cursor. */
  parrafo(t: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; ancho?: number; interlineado?: number } = {}): void {
    const size = o.size ?? 11
    const font = o.font ?? this.normal
    const ancho = o.ancho ?? UTIL
    const paso = size * (o.interlineado ?? 1.55)
    for (const linea of envolver(t, font, size, ancho)) {
      this.asegurar(paso)
      this.pagina.drawText(linea, { x: o.x ?? MARGEN, y: this.y - size, size, font, color: o.color ?? TEXTO })
      this.y -= paso
    }
  }

  /** A numbered section; without a number it is a part of the section above (rule and title). */
  seccion(numero: number | null, titulo: string, color = AZUL): void {
    this.asegurar(70)
    this.espacio(6)
    if (numero !== null) this.pagina.drawText(`${numero}.`, { x: MARGEN, y: this.y - 14, size: 14, font: this.negrita, color })
    this.pagina.drawText(titulo, { x: MARGEN + (numero !== null ? 24 : 0), y: this.y - 14, size: numero !== null ? 14 : 12.5, font: this.negrita, color: numero !== null ? TEXTO : color })
    this.y -= 22
    this.pagina.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: ANCHO - MARGEN, y: this.y }, thickness: 0.8, color: LINEA })
    this.y -= 12
  }

  subtitulo(t: string, color = TEXTO): void {
    this.asegurar(40)
    this.pagina.drawText(t, { x: MARGEN, y: this.y - 12, size: 12, font: this.negrita, color })
    this.y -= 26
  }

  /** Cards with a big figure and its label, in rows of three. */
  tarjetas(items: Array<{ valor: string; etiqueta: string }>, color = AZUL): void {
    const columnas = 3
    const gap = 10
    const ancho = (UTIL - gap * (columnas - 1)) / columnas
    const alto = 66
    for (let i = 0; i < items.length; i += columnas) {
      this.asegurar(alto + gap)
      items.slice(i, i + columnas).forEach((it, k) => {
        const x = MARGEN + k * (ancho + gap)
        this.pagina.drawRectangle({ x, y: this.y - alto, width: ancho, height: alto, color: FONDO, borderColor: LINEA, borderWidth: 0.8 })
        this.pagina.drawRectangle({ x, y: this.y - alto, width: 4, height: alto, color })
        this.pagina.drawText(it.valor, { x: x + 18, y: this.y - 36, size: 26, font: this.negrita, color: TEXTO })
        for (const [j, l] of envolver(it.etiqueta, this.normal, 9.5, ancho - 30).entries()) {
          this.pagina.drawText(l, { x: x + 18, y: this.y - 50 - j * 11, size: 9.5, font: this.normal, color: GRIS })
        }
      })
      this.y -= alto + gap
    }
  }

  /** Horizontal bars on a shared scale: one bar per series in every row. */
  barras(filas: Array<{ etiqueta: string; valores: Array<{ n: number; color: ReturnType<typeof rgb>; texto?: string }> }>, maximo: number): void {
    const etiqueta = 150
    const campo = UTIL - etiqueta - 70
    const alto = 11
    const sep = 4
    const max = Math.max(maximo, 1)
    for (const f of filas) {
      const bloque = f.valores.length * (alto + sep) + 7
      this.asegurar(bloque)
      this.pagina.drawText(f.etiqueta, { x: MARGEN, y: this.y - 10 - (f.valores.length - 1) * ((alto + sep) / 2), size: 10, font: this.normal, color: TEXTO })
      f.valores.forEach((v, i) => {
        const y = this.y - (i + 1) * (alto + sep) + sep
        this.pagina.drawRectangle({ x: MARGEN + etiqueta, y, width: campo, height: alto, color: FONDO })
        if (v.n > 0) this.pagina.drawRectangle({ x: MARGEN + etiqueta, y, width: Math.max(2, (v.n / max) * campo), height: alto, color: v.color })
        this.pagina.drawText(v.texto ?? String(v.n), { x: MARGEN + etiqueta + campo + 8, y: y + 2, size: 10, font: this.negrita, color: TEXTO })
      })
      this.y -= bloque
    }
  }

  leyenda(items: Array<{ nombre: string; color: ReturnType<typeof rgb> }>): void {
    let x = MARGEN
    this.asegurar(22)
    for (const it of items) {
      this.pagina.drawCircle({ x: x + 5, y: this.y - 8, size: 5, color: it.color })
      this.pagina.drawText(it.nombre, { x: x + 15, y: this.y - 11, size: 9.5, font: this.normal, color: GRIS })
      x += 28 + this.normal.widthOfTextAtSize(it.nombre, 9.5)
    }
    this.y -= 24
  }

  tabla(cabeceras: string[], filas: string[][], anchos: number[]): void {
    const alto = 26
    const dibujarFila = (celdas: string[], opciones: { fondo?: ReturnType<typeof rgb>; font: PDFFont; size: number; color: ReturnType<typeof rgb> }) => {
      this.asegurar(alto)
      if (opciones.fondo) this.pagina.drawRectangle({ x: MARGEN, y: this.y - alto, width: UTIL, height: alto, color: opciones.fondo })
      let x = MARGEN
      celdas.forEach((c, i) => {
        const w = anchos[i] ?? 80
        this.pagina.drawText(c, { x: x + 10, y: this.y - 17, size: opciones.size, font: opciones.font, color: opciones.color })
        x += w
      })
      this.pagina.drawLine({ start: { x: MARGEN, y: this.y - alto }, end: { x: MARGEN + UTIL, y: this.y - alto }, thickness: 0.5, color: LINEA })
      this.y -= alto
    }
    dibujarFila(cabeceras, { fondo: FONDO, font: this.negrita, size: 8.5, color: GRIS })
    for (const f of filas) dibujarFila(f, { font: this.normal, size: 10.5, color: TEXTO })
    this.y -= 8
  }
}

/** Splits a text into lines that fit `ancho`. */
function envolver(t: string, font: PDFFont, size: number, ancho: number): string[] {
  const lineas: string[] = []
  let actual = ''
  for (const palabra of t.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (font.widthOfTextAtSize(prueba, size) <= ancho) actual = prueba
    else {
      if (actual) lineas.push(actual)
      actual = palabra
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

const fechaLarga = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`

function etapas(r: DatosRevista) {
  return [
    { etiqueta: 'Postulaciones', n: r.postulados },
    { etiqueta: 'Aprobaciones', n: r.aprobados },
    { etiqueta: 'Rechazos', n: r.rechazados },
    { etiqueta: 'Evaluaciones entregadas', n: r.entregadas },
    { etiqueta: 'Constancias emitidas', n: r.constancias },
  ]
}

function conceptosDe(r: DatosRevista | ReturnType<typeof totales>) {
  const c = r.conceptos
  const total = c.publicable + c.conModificaciones + c.noPublicable + c.pendienteFormato
  return { total, filas: CONCEPTOS.map((k) => ({ nombre: k.nombre, n: c[k.clave] })) }
}

export async function generarInformePdf(datos: DatosInforme): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Informe de gestión editorial')
  doc.setAuthor('Universidad CESMAG · Dependencia de Editorial')
  const [normal, negrita, cursiva] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
  ])
  let escudo: PDFImage | null = null
  try {
    escudo = await doc.embedPng(readFileSync(new URL('../../assets/escudo-cesmag.png', import.meta.url)))
  } catch {
    escudo = null // the report does not depend on the image
  }
  const fecha = datos.fecha ?? new Date()
  const ambas = datos.revistas.length > 1
  const alcance = datos.revistas.map((r) => r.nombre).join(' · ')
  const l = new Lienzo(doc, normal, negrita, cursiva, escudo, `Informe de gestión editorial · ${datos.etiquetaPeriodo}`)
  l.nuevaPagina()

  // --- Cover block --------------------------------------------------------------------------
  if (escudo) l.pagina.drawImage(escudo, { x: MARGEN, y: l.y - 58, width: 58, height: 58 * (escudo.height / escudo.width) })
  l.pagina.drawText('UNIVERSIDAD', { x: MARGEN + 70, y: l.y - 22, size: 9, font: normal, color: AZUL })
  l.pagina.drawText('CESMAG', { x: MARGEN + 70, y: l.y - 46, size: 26, font: negrita, color: AZUL })
  l.pagina.drawText('HOMBRES NUEVOS PARA TIEMPOS NUEVOS', { x: ANCHO - MARGEN - normal.widthOfTextAtSize('HOMBRES NUEVOS PARA TIEMPOS NUEVOS', 8), y: l.y - 30, size: 8, font: normal, color: GRIS })
  l.espacio(76)
  l.pagina.drawRectangle({ x: MARGEN, y: l.y - 4, width: UTIL, height: 4, color: AZUL })
  l.espacio(44)
  l.texto('Informe de gestión editorial', { size: 28, font: negrita, color: AZUL })
  l.espacio(30)
  l.parrafo('Dependencia de Editorial', { size: 13, color: TEXTO })
  l.parrafo(alcance, { size: 11.5, color: GRIS })
  l.parrafo(`${datos.etiquetaPeriodo} · Elaborado el ${fechaLarga(fecha)}`, { size: 11.5, color: GRIS })
  l.espacio(18)

  let n = 1
  // --- Summary and key figures ------------------------------------------------------------
  l.seccion(n++, 'Resumen ejecutivo')
  const resumen = redactarResumen(datos.etiquetaPeriodo, datos.revistas)
  const alto = resumen.reduce((s, p) => s + envolver(p, normal, 11.5, UTIL - 36).length * 17.8 + 8, 24)
  l.asegurar(alto)
  l.pagina.drawRectangle({ x: MARGEN, y: l.y - alto, width: UTIL, height: alto, color: FONDO })
  l.pagina.drawRectangle({ x: MARGEN, y: l.y - alto, width: 4, height: alto, color: AZUL })
  l.espacio(14)
  for (const p of resumen) {
    l.parrafo(p, { x: MARGEN + 20, ancho: UTIL - 40, size: 11.5 })
    l.espacio(8)
  }
  l.espacio(18)

  const t = totales(datos.revistas)
  l.seccion(n++, ambas ? 'Indicadores principales de ambas revistas' : 'Indicadores principales')
  l.tarjetas([
    { valor: String(t.postulados), etiqueta: 'Artículos postulados' },
    { valor: String(t.aprobados), etiqueta: 'Artículos aprobados' },
    { valor: String(t.rechazados), etiqueta: 'Artículos rechazados' },
    { valor: String(t.entregadas), etiqueta: 'Evaluaciones entregadas' },
    { valor: String(t.constancias), etiqueta: 'Constancias emitidas' },
    { valor: String(t.dias), etiqueta: 'Días promedio por evaluación' },
  ])

  // --- Each journal on its own pages ---------------------------------------------------------
  for (const r of datos.revistas) {
    const color = ambas ? SERIE[r.sigla] : UNICA
    l.nuevaPagina()
    l.pagina.drawRectangle({ x: MARGEN, y: l.y - 36, width: UTIL, height: 36, color })
    l.pagina.drawText(`${n++}.  ${r.nombre}`, { x: MARGEN + 14, y: l.y - 23, size: 13, font: negrita, color: rgb(1, 1, 1) })
    l.espacio(50)
    l.seccion(null, 'Resumen de la revista', color)
    for (const p of redactarResumen(datos.etiquetaPeriodo, [r])) {
      l.parrafo(p, { size: 11.5 })
      l.espacio(6)
    }
    l.espacio(8)
    l.tarjetas(
      [
        { valor: String(r.postulados), etiqueta: 'Artículos postulados' },
        { valor: String(r.aprobados), etiqueta: 'Artículos aprobados' },
        { valor: String(r.rechazados), etiqueta: 'Artículos rechazados' },
        { valor: String(r.entregadas), etiqueta: 'Evaluaciones entregadas' },
        { valor: String(r.constancias), etiqueta: 'Constancias emitidas' },
        { valor: String(r.dias), etiqueta: 'Días promedio por evaluación' },
      ],
      color,
    )
    l.seccion(null, 'Cantidad por etapa del proceso', color)
    const e = etapas(r)
    l.barras(e.map((x) => ({ etiqueta: x.etiqueta, valores: [{ n: x.n, color }] })), Math.max(...e.map((x) => x.n)))
    l.espacio(4)
    l.asegurar(190)
    l.seccion(null, 'Conceptos de los pares evaluadores', color)
    const c = conceptosDe(r)
    if (c.total === 0) l.parrafo('No hay conceptos registrados en este periodo.', { color: GRIS })
    else {
      l.parrafo(`${cantidad(c.total, 'concepto registrado', 'conceptos registrados')} en el periodo.`, { size: 10.5, color: GRIS })
      l.espacio(4)
      l.barras(
        c.filas.map((k) => ({ etiqueta: k.nombre, valores: [{ n: k.n, color, texto: `${k.n} · ${Math.round((k.n / c.total) * 100)} %` }] })),
        c.total,
      )
    }
  }

  // --- Comparison (both journals) ----------------------------------------------------------
  if (ambas) {
    l.nuevaPagina()
    l.seccion(n++, 'Comparativo entre las dos revistas')
    const [a, b] = datos.revistas as [DatosRevista, DatosRevista]
    l.leyenda([
      { nombre: a.nombre, color: SERIE[a.sigla] },
      { nombre: b.nombre, color: SERIE[b.sigla] },
    ])
    const ea = etapas(a)
    const eb = etapas(b)
    l.barras(
      ea.map((x, i) => ({
        etiqueta: x.etiqueta,
        valores: [
          { n: x.n, color: SERIE[a.sigla] },
          { n: eb[i]?.n ?? 0, color: SERIE[b.sigla] },
        ],
      })),
      Math.max(...ea.map((x) => x.n), ...eb.map((x) => x.n)),
    )
    l.espacio(14)
    l.subtitulo('Cifras del periodo')
    const corto = (r: DatosRevista) => (r.sigla === 'reep' ? 'Educación y Pedagogía' : 'Investigium IRE')
    l.tabla(
      ['INDICADOR', corto(a).toUpperCase(), corto(b).toUpperCase(), 'TOTAL'],
      [
        ['Artículos postulados', String(a.postulados), String(b.postulados), String(t.postulados)],
        ['Artículos aprobados', String(a.aprobados), String(b.aprobados), String(t.aprobados)],
        ['Artículos rechazados', String(a.rechazados), String(b.rechazados), String(t.rechazados)],
        ['Evaluaciones entregadas', String(a.entregadas), String(b.entregadas), String(t.entregadas)],
        ['Constancias emitidas', String(a.constancias), String(b.constancias), String(t.constancias)],
        ['Días promedio de evaluación', String(a.dias), String(b.dias), String(t.dias)],
      ],
      [215, 120, 100, UTIL - 435],
    )
  }

  // --- Notes ------------------------------------------------------------------------------------
  l.asegurar(125)
  l.seccion(n++, 'Notas sobre los datos')
  for (const nota of [
    'Los artículos postulados, aprobados y rechazados se cuentan por su fecha de postulación dentro del semestre y según su estado actual.',
    'Las evaluaciones entregadas y los conceptos se cuentan por la fecha de entrega.',
    'Las constancias emitidas se cuentan por la fecha de su primer envío.',
    'Los días promedio de evaluación van desde la asignación del par hasta la entrega de su evaluación; para ambas revistas, el promedio se pondera por el número de evaluaciones.',
  ]) {
    l.parrafo(`•  ${nota}`, { size: 10.5, color: GRIS, x: MARGEN + 6, ancho: UTIL - 12 })
    l.espacio(3)
  }
  l.espacio(10)
  l.parrafo('Informe generado por el Sistema de Gestión Editorial de la Universidad CESMAG.', { size: 9.5, font: cursiva, color: GRIS })

  // Footer with the page number, once the total is known.
  const paginas = doc.getPages()
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEN, y: PIE }, end: { x: ANCHO - MARGEN, y: PIE }, thickness: 0.6, color: LINEA })
    p.drawText('Universidad CESMAG · Dependencia de Editorial', { x: MARGEN, y: PIE - 16, size: 8.5, font: normal, color: GRIS })
    const num = `Página ${i + 1} de ${paginas.length}`
    p.drawText(num, { x: ANCHO - MARGEN - normal.widthOfTextAtSize(num, 8.5), y: PIE - 16, size: 8.5, font: normal, color: GRIS })
  })
  return doc.save()
}
