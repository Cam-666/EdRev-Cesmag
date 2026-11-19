/*
 * plantillas — the initial mail / constancia templates and the sender accounts, in ONE data file
 * (RNF-19). In the mock API they are loaded into the database, where Administración → Plantillas
 * edits them; in the real system the dependency edits them the same way, without touching code.
 *
 *  - Invitation (RF-25): only the journal, the request number, the peer with its profession, its
 *    university and the article title vary; no attachments (the documents are sent from the OJS
 *    once the peer accepts).
 *  - Thank-you mail (RF-31): carries the constancia as an attachment.
 *  - Constancia (RF-30), a file template: the text (with alignment and bold) between a header and a
 *    footer image, with the signature image where {{firma}} is; the peer, the article, the journal,
 *    its ISSN and indexations, the date and the year change; no sequence number.
 * Each journal has its own three templates (RF-45).
 */
import type { CuentaRemitente, ImagenesPlantilla, Plantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

const BASE: Array<Omit<Plantilla, 'id' | 'revista' | 'imagenes' | 'fin'>> = [
  {
    uso: 'invitacion',
    clase: 'correo',
    nombre: 'Invitación a evaluar',
    asunto: 'Invitación a evaluar un artículo · {{revista}}',
    cuerpo:
      'Apreciado(a) {{par}}, {{profesion}} de la {{universidad}}:\n\nLa {{revista}} lo(a) invita a participar como par evaluador del artículo «{{articulo}}» (solicitud {{numero}}). Si acepta, recibirá los documentos desde el OJS.\n\nResponda con un clic:\n\n{{botones}}\n\nCordialmente,',
    variables: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo', 'botones'],
    enUso: true,
  },
  {
    uso: 'agradecimiento',
    clase: 'correo',
    nombre: 'Agradecimiento',
    asunto: 'Gracias por su evaluación · {{revista}}',
    cuerpo:
      'Apreciado(a) {{par}}:\n\nAgradecemos su participación como par evaluador del artículo «{{articulo}}». Adjuntamos su constancia.\n\nCordialmente,',
    variables: ['revista', 'par', 'articulo'],
    enUso: true,
  },
  {
    uso: 'constancia',
    clase: 'archivo',
    nombre: 'Constancia de participación',
    asunto: null,
    cuerpo:
      '[centro]**LA EDITORA DE LA {{REVISTA}}**\n**ISSN {{issn}} (en línea)**\n\n[centro]**CERTIFICA QUE**\n\n[justificado]**{{PAR}}** participó como evaluador(a) académico(a) del artículo titulado **«{{articulo}}»**, postulado para publicación en una de las ediciones correspondientes al año {{anio}} de la {{revista}}.\n\n[justificado]Su participación se desarrolló en el marco del proceso editorial de evaluación por pares bajo la modalidad de doble ciego, y constituyó un valioso aporte al aseguramiento de la calidad, el rigor y la pertinencia científica de los contenidos publicados por la Revista.\n\n[justificado]Cabe destacar que la {{revista}} se encuentra indexada y referenciada en reconocidos sistemas de información, directorios y bases de datos académicas, entre ellos: {{indexaciones}}.\n\n[justificado]La presente certificación se expide a solicitud del interesado(a), para los fines académicos y profesionales que estime pertinentes.\n\nSan Juan de Pasto, {{fecha}}.\n\nCordialmente,\n\n[centro]{{firma}}\n\n[centro]Editor(a) de la {{revista}}',
    variables: ['revista', 'REVISTA', 'par', 'PAR', 'articulo', 'issn', 'indexaciones', 'fecha', 'anio', 'firma'],
    enUso: true,
  },
]

/** Header, footer and signature images of each journal's constancia. */
const IMAGENES: Record<Revista, ImagenesPlantilla> = {
  reep: {
    encabezado: { nombre: 'Encabezado', tamano: 94_208 },
    pie: { nombre: 'Pie de página', tamano: 88_064 },
    firma: { nombre: 'Firma', tamano: 20_480 },
  },
  ire: {
    encabezado: { nombre: 'Encabezado', tamano: 93_184 },
    pie: { nombre: 'Pie de página', tamano: 88_064 },
    firma: { nombre: 'Firma', tamano: 21_504 },
  },
}

/** ISSN and indexations of each journal (they go in its constancia; edited in Configuración). */
export const DATOS_REVISTA_INICIALES: Record<Revista, { issn: string; indexaciones: string }> = {
  reep: {
    issn: '2590-7476',
    indexaciones:
      'Publindex (categoría B), Redalyc, EBSCO, ERIH PLUS, Dialnet, DOAJ, REDIB, LATINDEX, Actualidad Iberoamericana, EZB, LatinREV, REDIPE, MIAR, LivRe y Ulrichsweb de ProQuest',
  },
  ire: {
    issn: '2357-5239',
    indexaciones:
      'Publindex (categoría C), Redalyc, EBSCO, ERIH PLUS, Dialnet, DOAJ, REDIB, LATINDEX, Actualidad Iberoamericana, EZB, LatinREV, REDIPE, MIAR, LivRe y Ulrichsweb de ProQuest',
  },
}

/** Each journal starts with its own invitation, thank-you mail and constancia (RF-45). */
export const PLANTILLAS_INICIALES: Plantilla[] = (['reep', 'ire'] as const).flatMap((revista) =>
  BASE.map((p) => ({
    ...p,
    id: `${revista}-${p.uso}`,
    revista,
    fin: p.uso ?? 'invitacion',
    imagenes: p.uso === 'constancia' ? { ...IMAGENES[revista] } : null,
  })),
)

/** Sender address of each journal (a verified sender in the mail service). */
export const CUENTAS_INICIALES: CuentaRemitente[] = [
  { revista: 'reep', remitente: 'editorial.eyp@gmail.com' },
  { revista: 'ire', remitente: 'editorial.ire@gmail.com' },
]

export const NOMBRE_EN_CORREO: Record<Revista, string> = {
  reep: 'Revista Electrónica en Educación y Pedagogía',
  ire: 'Revista Investigium IRE Ciencias Sociales y Humanas',
}

/** Fixed parts of the constancia: letterhead and signature (not editable text). */
export const UNIVERSIDAD_MEMBRETE = 'UNIVERSIDAD CESMAG'
export const FIRMA_CONSTANCIA = 'Ma. Camila Mendoza · Dependencia de Editorial'
