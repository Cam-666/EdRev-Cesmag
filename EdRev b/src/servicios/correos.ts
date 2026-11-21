/*
 * correos — el registro de correos de la base guarda solo «invitacion», «agradecimiento» o «constancia» y el
 * resultado. La página además muestra «2.º intento» y «Reenvío por corrección», y si un correo rebotado o
 * fallido ya fue atendido; todo eso se deduce aquí del orden de los correos de cada evaluación.
 * Encolar un correo es insertarlo «en-cola» (el servicio de correo lo recoge).
 */
import type { Cliente } from '../db.js'
import { siglaDe } from '../lib/http.js'
import { iso } from '../lib/mapeo.js'

export type TipoGuardado = 'invitacion' | 'agradecimiento' | 'constancia'

export interface FilaCorreo {
  id_correo: number
  id_evaluacion: number
  tipo: TipoGuardado
  destinatario: string
  fecha_envio: Date
  resultado: 'en-cola' | 'enviado' | 'rebotado' | 'fallido'
  id_articulo: number
  id_revista: number
  numero_ojs: string
  /** Lo que respondió el par a la invitación (para los correos de invitación). */
  estado_par: string
  motivo_bloqueo: string | null
  fecha_respuesta: Date | null
  texto_respuesta: string | null
}

export type RespuestaDelPar = 'sin-respuesta-aun' | 'acepto' | 'no-acepto' | 'no-desea' | 'sin-respuesta'

/** La respuesta del par a una invitación, con las palabras de la página. */
function respuestaDe(f: FilaCorreo) {
  const respuesta: RespuestaDelPar =
    f.estado_par === 'invitado'
      ? 'sin-respuesta-aun'
      : f.estado_par === 'sin-respuesta'
        ? 'sin-respuesta'
        : f.estado_par === 'no-acepto'
          ? f.motivo_bloqueo === 'no-participa'
            ? 'no-desea'
            : 'no-acepto'
          : 'acepto'
  return {
    respuesta,
    fecha: iso(f.fecha_respuesta),
    // Los botones del correo dejan «El par respondió desde el correo» en el historial.
    medio: f.texto_respuesta
      ? f.texto_respuesta.startsWith('El par respondió desde el correo')
        ? ('correo' as const)
        : ('manual' as const)
      : null,
  }
}

const FALLO = ['rebotado', 'fallido']

const ASUNTO: Record<TipoGuardado, string> = {
  invitacion: 'Invitación a evaluar un artículo',
  agradecimiento: 'Gracias por su evaluación · constancia adjunta',
  constancia: 'Constancia de participación como par evaluador',
}

/** Correos con su tipo para la página y «atendido», en el orden en que los lista la página (el más nuevo primero). */
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
        f.tipo === 'agradecimiento' || f.tipo === 'constancia'
          ? f.tipo
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
      asunto: ASUNTO[f.tipo],
      fechaEnvio: iso(f.fecha_envio),
      estado: f.resultado,
      atendido: derivados.get(f.id_correo)?.atendido ?? false,
      // Solo las invitaciones (y sus segundos intentos o reenvíos) esperan respuesta.
      respuestaPar: f.tipo === 'invitacion' ? respuestaDe(f) : null,
    }))
}

export const SELECCION_CORREOS = `
  SELECT c.*, e.id_articulo, e.estado_par, a.id_revista, a.numero_ojs, p.motivo_bloqueo,
         (SELECT au.fecha FROM auditoria au
           WHERE au.tabla_afectada = 'evaluacion' AND au.id_registro = e.id_evaluacion::text
             AND au.accion IN ('respuesta', 'bloqueo') ORDER BY au.fecha DESC LIMIT 1) AS fecha_respuesta,
         (SELECT au.detalle->>'texto' FROM auditoria au
           WHERE au.tabla_afectada = 'evaluacion' AND au.id_registro = e.id_evaluacion::text
             AND au.accion IN ('respuesta', 'bloqueo') ORDER BY au.fecha DESC LIMIT 1) AS texto_respuesta
    FROM correo c
    JOIN evaluacion e ON e.id_evaluacion = c.id_evaluacion
    JOIN articulo a ON a.id_articulo = e.id_articulo
    JOIN par_evaluador p ON p.id_par = e.id_par`

export async function encolar(
  c: Cliente,
  idEvaluacion: number,
  tipo: TipoGuardado,
  destinatario: string,
  eleccion?: { plantillaId?: number; asunto?: string; cuerpo?: string },
): Promise<'en-cola'> {
  await c.query(
    `INSERT INTO correo (id_evaluacion, tipo, destinatario, resultado, id_plantilla, asunto_propio, cuerpo_propio)
     VALUES ($1, $2, $3, 'en-cola', $4, $5, $6)`,
    [idEvaluacion, tipo, destinatario, eleccion?.plantillaId ?? null, eleccion?.asunto ?? null, eleccion?.cuerpo ?? null],
  )
  return 'en-cola'
}
