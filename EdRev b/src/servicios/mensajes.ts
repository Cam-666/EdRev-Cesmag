/*
 * mensajes (servicio) — un correo que la dependencia envía a mano a un par evaluador o a un autor, eligiendo una
 * plantilla de tipo «mensaje». No pertenece a una evaluación (por eso no se guarda en `correo`): queda en la tabla
 * `mensaje` con el texto tal como se envió, y aparece en «Correos enviados» de la revista desde la que salió.
 *
 * Cómo funciona:
 * 1. La persona elige la revista (de ahí sale el remitente y las plantillas) y una plantilla.
 * 2. `vistaPrevia` arma el correo con los datos de la persona y lo muestra tal como lo recibirá.
 * 3. `enviarMensaje` lo guarda «en cola»; la tarea de fondo de servicios/envioCorreos lo envía (por Brevo o
 *    simulado, según CORREO_MODO) y marca su resultado.
 * Los datos que una plantilla de mensaje puede usar: revista, nombre, universidad, profesión, fecha y año.
 */
import { config } from '../config.js'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { aHtml } from '../lib/formato.js'
import { CORREO_VALIDO, ErrorHttp, siglaDe } from '../lib/http.js'
import { iso } from '../lib/mapeo.js'
import { escudoEmbebido, marcoInstitucional } from '../lib/marcoCorreo.js'

export interface Destino {
  tipo: 'par' | 'autor'
  id: number
}

interface Persona {
  nombre: string
  correo: string | null
  universidad: string | null
  profesion: string | null
}

async function persona(d: Destino): Promise<Persona> {
  const { rows } =
    d.tipo === 'par'
      ? await pool.query<Persona>(
          'SELECT nombre, correo, universidad, profesion FROM par_evaluador WHERE id_par = $1',
          [d.id],
        )
      : await pool.query<Persona>(
          'SELECT nombre, correo, filiacion AS universidad, NULL::text AS profesion FROM autor WHERE id_autor = $1',
          [d.id],
        )
  const fila = rows[0]
  if (!fila) throw new ErrorHttp(404, d.tipo === 'par' ? 'Par evaluador no encontrado' : 'Autor no encontrado')
  return fila
}

async function revistaDe(id: number): Promise<{ nombre: string; correo_remitente: string }> {
  const { rows } = await pool.query<{ nombre: string; correo_remitente: string }>(
    'SELECT nombre, correo_remitente FROM revista WHERE id_revista = $1',
    [id],
  )
  if (!rows[0]) throw new ErrorHttp(404, 'Revista no encontrada')
  return rows[0]
}

interface PlantillaMensaje {
  id_plantilla: number
  nombre: string
  asunto: string
  cuerpo: string
}

async function plantillaDe(revista: number, id: number): Promise<PlantillaMensaje> {
  const { rows } = await pool.query<PlantillaMensaje>(
    `SELECT id_plantilla, nombre, COALESCE(asunto, '') AS asunto, cuerpo FROM plantilla
      WHERE id_plantilla = $1 AND id_revista = $2 AND fin = 'mensaje'`,
    [id, revista],
  )
  if (!rows[0]) throw new ErrorHttp(404, 'La plantilla no existe en esa revista o no es una plantilla de mensaje')
  if (!rows[0].cuerpo.trim()) throw new ErrorHttp(422, 'La plantilla aún no tiene texto: redáctela en Plantillas')
  return rows[0]
}

const rellenar = (texto: string, v: Record<string, string>) => texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '')

function datosDe(revista: string, p: Persona): Record<string, string> {
  return {
    revista,
    nombre: p.nombre,
    universidad: p.universidad ?? '',
    profesion: p.profesion ?? '',
    fecha: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: config.zonaHoraria }),
    anio: String(new Date().getFullYear()),
  }
}

/** Las plantillas de mensaje de una revista que ya tienen texto, para elegir al enviar. */
export async function plantillasDeMensaje(revista: number) {
  const { rows } = await pool.query<{ id_plantilla: number; nombre: string }>(
    `SELECT id_plantilla, nombre FROM plantilla
      WHERE id_revista = $1 AND fin = 'mensaje' AND btrim(cuerpo) <> '' ORDER BY nombre`,
    [revista],
  )
  return rows.map((r) => ({ id: String(r.id_plantilla), nombre: r.nombre }))
}

/** El correo tal como lo recibirá la persona (con el marco institucional), sin enviarlo. */
export async function vistaPrevia(revista: number, destino: Destino, idPlantilla: number) {
  const [p, rev, plantilla] = await Promise.all([persona(destino), revistaDe(revista), plantillaDe(revista, idPlantilla)])
  const v = datosDe(rev.nombre, p)
  return {
    para: { nombre: p.nombre, correo: p.correo?.trim() || null },
    de: rev.correo_remitente,
    asunto: rellenar(plantilla.asunto, v),
    html: marcoInstitucional({
      tipo: 'mensaje',
      revista: rev.nombre,
      contacto: rev.correo_remitente,
      contenido: aHtml(rellenar(plantilla.cuerpo, v)),
      escudo: escudoEmbebido(),
    }),
  }
}

/** Guarda el mensaje «en cola»: la tarea de fondo lo envía. */
export async function enviarMensaje(revista: number, destino: Destino, idPlantilla: number, actor: number) {
  const [p, rev, plantilla] = await Promise.all([persona(destino), revistaDe(revista), plantillaDe(revista, idPlantilla)])
  const correo = p.correo?.trim().toLowerCase() ?? ''
  if (!CORREO_VALIDO.test(correo)) {
    throw new ErrorHttp(409, `${p.nombre} no tiene un correo válido registrado: corríjalo en su ficha antes de enviarle un mensaje`)
  }
  const v = datosDe(rev.nombre, p)
  const asunto = rellenar(plantilla.asunto, v) || `Mensaje de ${rev.nombre}`
  const cuerpo = rellenar(plantilla.cuerpo, v)
  return enTransaccion(async (c) => {
    const { rows } = await c.query<{ id_mensaje: number }>(
      `INSERT INTO mensaje (id_revista, id_plantilla, id_par, id_autor, id_usuario, destinatario, nombre, asunto, cuerpo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id_mensaje`,
      [
        revista,
        plantilla.id_plantilla,
        destino.tipo === 'par' ? destino.id : null,
        destino.tipo === 'autor' ? destino.id : null,
        actor,
        correo,
        p.nombre,
        asunto,
        cuerpo,
      ],
    )
    const id = rows[0]?.id_mensaje ?? 0
    await auditar(c, {
      usuario: actor,
      tabla: 'mensaje',
      idRegistro: id,
      accion: 'envio',
      texto: `Envió el mensaje «${plantilla.nombre}» a ${p.nombre} (${correo})`,
      revista,
    })
    return { id: `m${id}`, estado: 'en-cola' as const, destinatario: correo, nombre: p.nombre }
  })
}

interface FilaMensaje {
  id_mensaje: number
  id_revista: number
  destinatario: string
  nombre: string
  id_par: number | null
  asunto: string
  fecha_envio: Date
  resultado: 'en-cola' | 'enviado' | 'rebotado' | 'fallido'
  atendido: boolean
}

/**
 * Los mensajes de una revista con la misma forma que los correos del registro (tipo «mensaje», sin artículo).
 * Un mensaje rebotado o fallido está «atendido» cuando se le envió después otro igual a la misma persona.
 */
export async function mensajesDeRevista(revista: number) {
  const { rows } = await pool.query<FilaMensaje>(
    `SELECT m.id_mensaje, m.id_revista, m.destinatario, m.nombre, m.id_par, m.asunto, m.fecha_envio, m.resultado,
            EXISTS (SELECT 1 FROM mensaje m2 WHERE m2.id_mensaje > m.id_mensaje
                      AND m2.id_par IS NOT DISTINCT FROM m.id_par AND m2.id_autor IS NOT DISTINCT FROM m.id_autor
                      AND m2.id_plantilla IS NOT DISTINCT FROM m.id_plantilla) AS atendido
       FROM mensaje m WHERE m.id_revista = $1`,
    [revista],
  )
  return rows.map((m) => ({
    id: `m${m.id_mensaje}`,
    revista: siglaDe(m.id_revista),
    articuloId: '',
    numeroOjs: '',
    asignacionId: '',
    tipo: 'mensaje',
    destinatario: m.destinatario,
    nombreDestinatario: m.nombre,
    dirigidoA: (m.id_par === null ? 'autor' : 'par') as 'par' | 'autor',
    asunto: m.asunto,
    fechaEnvio: iso(m.fecha_envio),
    estado: m.resultado,
    atendido: m.atendido,
    respuestaPar: null,
  }))
}
