/*
 * plantillas — las plantillas iniciales de correo y de constancia y las cuentas remitentes, en UN solo archivo de
 * datos. En la API simulada se cargan en la base, donde Administración → Plantillas las edita; en el sistema real
 * la dependencia las edita igual, sin tocar el código.
 *
 * - Invitación: solo varían la revista, el número de solicitud, el par con su profesión, su universidad y el
 *   título del artículo; no lleva adjuntos (los documentos se envían desde el OJS cuando el par acepta).
 * - Correo de agradecimiento: lleva la constancia como adjunto.
 * - Constancia, una plantilla de archivo: el texto (con alineación y negrita) entre una imagen de encabezado y
 *   una de pie de página, con la imagen de la firma donde está {{firma}}; cambian el par, el artículo, la revista,
 *   su ISSN y sus indexaciones, la fecha y el año; no lleva consecutivo.
 * Cada revista tiene sus propias tres plantillas.
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

/** Imágenes de encabezado, pie de página y firma de la constancia de cada revista. */
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

/** ISSN e indexaciones de cada revista (van en su constancia; se editan en Configuración). */
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

/**
 * Cada revista empieza con su propia invitación, correo de agradecimiento y constancia, y con una plantilla de
 * mensaje para escribirle a mano a un par o a un autor (esa nunca es la predeterminada: se elige al enviar el correo). La invitación y el agradecimiento tienen además
 * una alternativa breve, para poder elegir al asignar un par o emitir una constancia.
 */
export const PLANTILLAS_INICIALES: Plantilla[] = (['reep', 'ire'] as const).flatMap((revista) => [
  ...BASE.map((p) => ({
    ...p,
    id: `${revista}-${p.uso}`,
    revista,
    fin: p.uso ?? 'invitacion',
    imagenes: p.uso === 'constancia' ? { ...IMAGENES[revista] } : null,
  })),
  {
    id: `${revista}-invitacion-breve`,
    revista,
    uso: null,
    fin: 'invitacion' as const,
    clase: 'correo' as const,
    nombre: 'Invitación breve',
    asunto: 'Invitación a evaluar · {{revista}}',
    cuerpo: 'Apreciado(a) {{par}}:\n\nLo(a) invitamos a evaluar el artículo «{{articulo}}».\n\n{{botones}}',
    variables: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo', 'botones'],
    enUso: false,
    imagenes: null,
  },
  {
    id: `${revista}-agradecimiento-breve`,
    revista,
    uso: null,
    fin: 'agradecimiento' as const,
    clase: 'correo' as const,
    nombre: 'Agradecimiento breve',
    asunto: 'Gracias · {{revista}}',
    cuerpo: 'Apreciado(a) {{par}}:\n\nGracias por evaluar «{{articulo}}». Adjuntamos su constancia.',
    variables: ['revista', 'par', 'articulo'],
    enUso: false,
    imagenes: null,
  },
  {
    id: `${revista}-mensaje`,
    revista,
    uso: null,
    fin: 'mensaje' as const,
    clase: 'correo' as const,
    nombre: 'Mensaje general',
    asunto: 'Mensaje de {{revista}}',
    cuerpo:
      'Apreciado(a) {{nombre}}:\n\nLe escribimos desde la Dependencia de Editorial de la {{revista}}.\n\nCordialmente,',
    variables: ['revista', 'nombre', 'universidad', 'profesion', 'fecha', 'anio'],
    enUso: false,
    imagenes: null,
  },
])

/** Dirección remitente de cada revista (un remitente verificado en el servicio de correo). */
export const CUENTAS_INICIALES: CuentaRemitente[] = [
  { revista: 'reep', remitente: 'editorial.eyp@gmail.com' },
  { revista: 'ire', remitente: 'editorial.ire@gmail.com' },
]

export const NOMBRE_EN_CORREO: Record<Revista, string> = {
  reep: 'Revista Electrónica en Educación y Pedagogía',
  ire: 'Revista Investigium IRE Ciencias Sociales y Humanas',
}

/** Partes fijas de la constancia: membrete y firma (no son texto editable). */
export const UNIVERSIDAD_MEMBRETE = 'UNIVERSIDAD CESMAG'
export const FIRMA_CONSTANCIA = 'Ma. Camila Mendoza · Dependencia de Editorial'
