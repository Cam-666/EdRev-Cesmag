/*
 * plantillas — the mail templates and the sender account of each journal, in ONE data file
 * (RNF-19): in the real system the dependency edits them from Administración → Plantillas.
 * The invitation only varies the journal name, the peer's name and the article title (RF-25), and
 * carries no attachments (the documents are sent from the OJS once the peer accepts).
 */
import type { Revista } from '@/types/revista'

export interface PlantillaCorreo {
  asunto: string
  cuerpo: string
}

export const PLANTILLA_INVITACION: PlantillaCorreo = {
  asunto: 'Invitación a evaluar un artículo · {{revista}}',
  cuerpo:
    'Apreciado(a) {{par}}:\n\nLa {{revista}} lo(a) invita a participar como par evaluador del artículo «{{articulo}}». Si acepta, recibirá los documentos desde el OJS.\n\nDependencia de Editorial',
}

/** Provisional Gmail accounts in this first phase; institutional ones when authorized (HU-17). */
export const CUENTA_REMITENTE: Record<Revista, string> = {
  reep: 'editorial.eyp@gmail.com',
  ire: 'editorial.ire@gmail.com',
}

export const NOMBRE_EN_CORREO: Record<Revista, string> = {
  reep: 'Revista Electrónica en Educación y Pedagogía',
  ire: 'Revista Investigium IRE Ciencias Sociales y Humanas',
}

export function rellenar(texto: string, variables: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => variables[clave] ?? `{{${clave}}}`)
}
