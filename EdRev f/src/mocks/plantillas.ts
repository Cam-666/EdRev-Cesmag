/*
 * plantillas — the initial mail / constancia templates and the sender accounts, in ONE data file
 * (RNF-19). In the mock API they are loaded into the database, where Administración → Plantillas
 * edits them; in the real system the dependency edits them the same way, without touching code.
 *
 *  - Invitation (RF-25): only the journal name, the peer name and the article title vary; no
 *    attachments (the documents are sent from the OJS once the peer accepts).
 *  - Thank-you mail (RF-31): carries the constancia as an attachment.
 *  - Constancia (RF-30): only the peer name and the article title change; letterhead and signature
 *    are fixed and it carries no sequence number.
 */
import type { CuentaRemitente, Plantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

export const PLANTILLAS_INICIALES: Plantilla[] = [
  {
    id: 'invitacion',
    nombre: 'Invitación a evaluar',
    asunto: 'Invitación a evaluar un artículo · {{revista}}',
    cuerpo:
      'Apreciado(a) {{par}}:\n\nLa {{revista}} lo(a) invita a participar como par evaluador del artículo «{{articulo}}». Si acepta, recibirá los documentos desde el OJS.\n\nDependencia de Editorial',
    variables: ['revista', 'par', 'articulo'],
  },
  {
    id: 'agradecimiento',
    nombre: 'Agradecimiento con constancia',
    asunto: 'Gracias por su evaluación · {{revista}}',
    cuerpo:
      'Apreciado(a) {{par}}:\n\nAgradecemos su participación como par evaluador del artículo «{{articulo}}». Adjuntamos su constancia.\n\nDependencia de Editorial',
    variables: ['revista', 'par', 'articulo'],
  },
  {
    id: 'constancia',
    nombre: 'Constancia de participación',
    asunto: null,
    cuerpo:
      'HACE CONSTAR QUE\n\n{{nombrePar}}\n\nparticipó como par evaluador del artículo «{{articulo}}» y entregó su concepto.',
    variables: ['nombrePar', 'articulo', 'revista'],
  },
]

/** Provisional Gmail accounts in this first phase; institutional ones when authorized (HU-17). */
export const CUENTAS_INICIALES: CuentaRemitente[] = [
  {
    revista: 'reep',
    provisional: 'editorial.eyp@gmail.com',
    institucionalPrevista: 'revistas@unicesmag.edu.co',
    estadoInstitucional: 'pendiente-ti',
  },
  {
    revista: 'ire',
    provisional: 'editorial.ire@gmail.com',
    institucionalPrevista: 'revistas@unicesmag.edu.co',
    estadoInstitucional: 'pendiente-ti',
  },
]

export const NOMBRE_EN_CORREO: Record<Revista, string> = {
  reep: 'Revista Electrónica en Educación y Pedagogía',
  ire: 'Revista Investigium IRE Ciencias Sociales y Humanas',
}

/** Fixed parts of the constancia: letterhead and signature (not editable text). */
export const UNIVERSIDAD_MEMBRETE = 'UNIVERSIDAD CESMAG'
export const FIRMA_CONSTANCIA = 'Ma. Camila Mendoza · Dependencia de Editorial'
