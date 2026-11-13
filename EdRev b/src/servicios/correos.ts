/*
 * correos — the mail log of the model (D12) stores only «invitacion» or «agradecimiento» and the
 * result. The page also shows «2.º intento» and «Reenvío por corrección», and whether a bounced or
 * failed mail was already handled; all of it is derived here from the order of the mails of each
 * evaluation. Queuing a mail = inserting it «en-cola» (the mail service picks it up).
 */
import type { Cliente } from '../db.js'
import { siglaDe } from '../lib/http.js'
import { iso } from '../lib/mapeo.js'

export interface FilaCorreo {
  id_correo: number
  id_evaluacion: number
  tipo: 'invitacion' | 'agradecimiento'
  destinatario: string
  fecha_envio: Date
  resultado: 'en-cola' | 'enviado' | 'rebotado' | 'fallido'
  id_articulo: number
  id_revista: number
  numero_ojs: string
}

const FALLO = ['rebotado', 'fallido']

/** Mails with their page type and «atendido», in the order the page lists them (newest first). */
export function correosApi(filas: FilaCorreo[]) {
  const porEvaluacion = new Map<string, FilaCorreo[]>()
  for (const f of [...filas].sort((a, b) => +a.fecha_envio - +b.fecha_envio || a.id_correo - b.id_correo)) {
    const clave = `${f.id_evaluacion}-${f.tipo}`
    porEvaluacion.set(clave, [...(porEvaluacion.get(clave) ?? []), f])
  }
  const derivados = new Map<number, { tipo: string; atendido: boolean }>()
  for (const lista of porEvaluacion.values()) {
    lista.forEach((f, i) => {
      const anterior = lista[i - 1]
      const tipo =
        f.tipo === 'agradecimiento'
          ? 'agradecimiento'
          : i === 0
            ? 'invitacion'
            : anterior && FALLO.includes(anterior.resultado)
              ? 'reenvio'
              : 'segundo-intento'
      derivados.set(f.id_correo, { tipo, atendido: FALLO.includes(f.resultado) && i < lista.length - 1 })
    })
  }
  return [...filas]
    .sort((a, b) => +b.fecha_envio - +a.fecha_envio || b.id_correo - a.id_correo)
    .map((f) => ({
      id: String(f.id_correo),
      revista: siglaDe(f.id_revista),
      articuloId: String(f.id_articulo),
      numeroOjs: f.numero_ojs,
      asignacionId: String(f.id_evaluacion),
      tipo: derivados.get(f.id_correo)?.tipo ?? f.tipo,
      destinatario: f.destinatario,
      asunto:
        f.tipo === 'invitacion' ? 'Invitación a evaluar un artículo' : 'Gracias por su evaluación · constancia adjunta',
      fechaEnvio: iso(f.fecha_envio),
      estado: f.resultado,
      atendido: derivados.get(f.id_correo)?.atendido ?? false,
    }))
}

export const SELECCION_CORREOS = `
  SELECT c.*, e.id_articulo, a.id_revista, a.numero_ojs
    FROM correo c
    JOIN evaluacion e ON e.id_evaluacion = c.id_evaluacion
    JOIN articulo a ON a.id_articulo = e.id_articulo`

export async function encolar(
  c: Cliente,
  idEvaluacion: number,
  tipo: 'invitacion' | 'agradecimiento',
  destinatario: string,
): Promise<'en-cola'> {
  await c.query(
    `INSERT INTO correo (id_evaluacion, tipo, destinatario, resultado) VALUES ($1, $2, $3, 'en-cola')`,
    [idEvaluacion, tipo, destinatario],
  )
  return 'en-cola'
}
