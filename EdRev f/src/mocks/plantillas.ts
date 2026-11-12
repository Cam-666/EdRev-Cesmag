/*
 * plantillas — the initial mail / constancia templates and the sender accounts, in ONE data file
 * (RNF-19). In the mock API they are loaded into the database, where Administración → Plantillas
 * edits them; in the real system the dependency edits them the same way, without touching code.
 *
 *  - Invitation (RF-25): only the journal, the request number, the peer with its profession, its
 *    university and the article title vary; no attachments (the documents are sent from the OJS
 *    once the peer accepts).
 *  - Thank-you mail (RF-31): carries the constancia as an attachment.
 *  - Constancia (RF-30): the text is written over the journal's PDF background (letterhead,
 *    design and signature); only the peer, the article and the journal change; no sequence number.
 * Each journal has its own three templates (RF-45).
 */
import type { CuentaRemitente, FondoPdf, Plantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

const BASE: Array<Omit<Plantilla, 'id' | 'revista' | 'fondoPdf'>> = [
  {
    uso: 'invitacion',
    nombre: 'Invitación a evaluar',
    asunto: 'Invitación a evaluar un artículo · {{revista}}',
    cuerpo:
      'Apreciado(a) {{par}}, {{profesion}} de la {{universidad}}:\n\nLa {{revista}} lo(a) invita a participar como par evaluador del artículo «{{articulo}}» (solicitud {{numero}}). Si acepta, recibirá los documentos desde el OJS.\n\nDependencia de Editorial',
    variables: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo'],
    enUso: true,
  },
  {
    uso: 'agradecimiento',
    nombre: 'Agradecimiento con constancia',
    asunto: 'Gracias por su evaluación · {{revista}}',
    cuerpo:
      'Apreciado(a) {{par}}:\n\nAgradecemos su participación como par evaluador del artículo «{{articulo}}». Adjuntamos su constancia.\n\nDependencia de Editorial',
    variables: ['revista', 'par', 'articulo'],
    enUso: true,
  },
  {
    uso: 'constancia',
    nombre: 'Constancia de participación',
    asunto: null,
    cuerpo:
      'HACE CONSTAR QUE\n\n{{par}}\n\nparticipó como par evaluador del artículo «{{articulo}}» de la {{revista}} y entregó su concepto.',
    variables: ['revista', 'par', 'articulo'],
    enUso: true,
  },
]

/** PDF background of each journal's constancia (letterhead, design and signature). */
const FONDOS: Record<Revista, FondoPdf> = {
  reep: { nombre: 'constancia-educacion-pedagogia.pdf', tamano: 184_320 },
  ire: { nombre: 'constancia-investigium-ire.pdf', tamano: 176_128 },
}

/** Each journal starts with its own invitation, thank-you mail and constancia (RF-45). */
export const PLANTILLAS_INICIALES: Plantilla[] = (['reep', 'ire'] as const).flatMap((revista) =>
  BASE.map((p) => ({
    ...p,
    id: `${revista}-${p.uso}`,
    revista,
    fondoPdf: p.uso === 'constancia' ? FONDOS[revista] : null,
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
