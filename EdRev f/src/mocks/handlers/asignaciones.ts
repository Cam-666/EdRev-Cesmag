/*
 * MSW handlers for assigning peers to an article and following their answer: preview of the
 * invitation, assignment (which sends the invitation by itself), resend / reminder, the peer's
 * answer, delivery mark and concept. Simulates the mail sending: it records a sent mail and, when
 * the address bounces, keeps the assignment so it can be fixed and resent (RF-27).
 * Covers: RF-15, RF-17, RF-19..RF-29. Permissions are enforced here as the real API will.
 */
import { http, HttpResponse } from 'msw'
import { autoresDeArticulo } from './pares'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error } from './util'
import { cuentas, plantillaDe } from '../db'
import { NOMBRE_EN_CORREO } from '../plantillas'
import { rellenar } from '@/lib/plantillas'
import { detectarConflicto } from '@/lib/dominio/conflicto'
import type { Articulo } from '@/types/articulo'
import type { EstadoCorreo, TipoCorreo } from '@/types/historial'
import type {
  Asignacion,
  ConceptoPar,
  ParEvaluador,
  ResultadoAsignacion,
  RespuestaPar,
  VistaPreviaInvitacion,
} from '@/types/par'
import type { Revista } from '@/types/revista'

/** Addresses ending like this bounce, so the failed-send flow can be demonstrated (RF-27). */
const DOMINIO_QUE_REBOTA = '@invalido.test'

function contradictorios(a: Asignacion | undefined, b: Asignacion | undefined): boolean {
  if (!a?.concepto || !b?.concepto) return false
  return (
    (a.concepto === 'publicable' && b.concepto === 'no-publicable') ||
    (a.concepto === 'no-publicable' && b.concepto === 'publicable')
  )
}

function asignadas(base: SeedRevista, articuloId: string): Asignacion[] {
  return base.asignaciones
    .filter((a) => a.articuloId === articuloId)
    .sort((x, y) => x.orden - y.orden)
}

type Validacion =
  | { ok: true; orden: 1 | 2 | 3; esDesempate: boolean }
  | { ok: false; estado: number; mensaje: string }

/** RF-19 (max three, ordered), RF-15 (blocked peers get no invitation), RF-21 (tiebreaker). */
function validar(base: SeedRevista, articulo: Articulo, par: ParEvaluador): Validacion {
  const actuales = asignadas(base, articulo.id)
  if (actuales.length >= 3) {
    return { ok: false, estado: 409, mensaje: 'El artículo ya tiene los tres pares permitidos' }
  }
  if (par.bloqueo) {
    return {
      ok: false,
      estado: 409,
      mensaje: 'El par está bloqueado y no recibe nuevas invitaciones',
    }
  }
  if (actuales.some((a) => a.parId === par.id)) {
    return { ok: false, estado: 409, mensaje: 'El par ya está asignado a este artículo' }
  }
  const orden = (actuales.length + 1) as 1 | 2 | 3
  return { ok: true, orden, esDesempate: orden === 3 && contradictorios(actuales[0], actuales[1]) }
}

function correoDe(
  base: SeedRevista,
  revista: Revista,
  articulo: Articulo,
  par: ParEvaluador,
  tipo: TipoCorreo,
  asunto: string,
  estado: EstadoCorreo,
) {
  const rebota = par.correo.toLowerCase().endsWith(DOMINIO_QUE_REBOTA)
  const final: EstadoCorreo = rebota ? 'rebotado' : estado
  base.correos.unshift({
    id: `${revista}-cor-n${base.correos.length + 1}`,
    revista,
    articuloId: articulo.id,
    tipo,
    destinatario: par.correo,
    asunto,
    fechaEnvio: ahoraIso(),
    estado: final,
  })
  return final
}

function auditar(
  base: SeedRevista,
  revista: Revista,
  articuloId: string,
  tipo: 'asignacion' | 'entrega' | 'fallo' | 'bloqueo' | 'edicion' | 'revision',
  accion: string,
  usuario: string,
): void {
  base.auditoria.unshift({
    id: `${revista}-aud-n${base.auditoria.length + 1}`,
    revista,
    articuloId,
    tipo,
    accion,
    fecha: ahoraIso(),
    usuario,
  })
}

function textosInvitacion(revista: Revista, par: ParEvaluador, articulo: Articulo) {
  const variables = {
    revista: NOMBRE_EN_CORREO[revista],
    par: par.nombre,
    articulo: articulo.titulo,
  }
  return {
    asunto: rellenar(plantillaDe('invitacion').asunto ?? '', variables),
    cuerpo: rellenar(plantillaDe('invitacion').cuerpo, variables),
  }
}

export const handlersAsignaciones = [
  http.get('*/api/:revista/articulos/:id/asignaciones/vista-previa', ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const par = c.base.pares.find((p) => p.id === new URL(request.url).searchParams.get('parId'))
    if (!par) return error(404, 'Par evaluador no encontrado')
    const v = validar(c.base, articulo, par)
    if (!v.ok) return error(v.estado, v.mensaje)

    const { asunto, cuerpo } = textosInvitacion(c.revista, par, articulo)
    const vista: VistaPreviaInvitacion = {
      de: cuentas().find((x) => x.revista === c.revista)?.provisional ?? '',
      para: par.correo,
      asunto,
      cuerpo,
      adjuntos: 'Sin adjuntos: se envían desde el OJS cuando el par acepta.',
      orden: v.orden,
      esDesempate: v.esDesempate,
      conflicto: detectarConflicto(par, autoresDeArticulo(c.base, articulo.id)),
    }
    return HttpResponse.json(vista)
  }),

  http.post('*/api/:revista/articulos/:id/asignaciones', async ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const { parId } = (await request.json()) as { parId: string }
    const par = c.base.pares.find((p) => p.id === parId)
    if (!par) return error(404, 'Par evaluador no encontrado')
    const v = validar(c.base, articulo, par)
    if (!v.ok) return error(v.estado, v.mensaje)

    const asignacion: Asignacion = {
      id: `${articulo.id}-p${v.orden}`,
      articuloId: articulo.id,
      parId: par.id,
      orden: v.orden,
      esDesempate: v.esDesempate,
      estado: 'invitado',
      fechaInvitacion: ahoraIso(),
      fechaRespuesta: null,
      fechaEntrega: null,
      intento: 1,
      concepto: null,
    }
    c.base.asignaciones.push(asignacion)
    if (articulo.estado === 'postulado' || articulo.estado === 'en-revision') {
      articulo.estado = 'en-evaluacion'
    }

    // The invitation goes out by itself when the assignment is saved (RF-24).
    const { asunto } = textosInvitacion(c.revista, par, articulo)
    const estadoCorreo = correoDe(
      c.base,
      c.revista,
      articulo,
      par,
      'invitacion',
      asunto,
      'entregado',
    )
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'asignacion',
      v.esDesempate ? `Asignó el par ${v.orden} como desempate` : `Asignó el par ${v.orden}`,
      c.usuario.nombre,
    )
    if (estadoCorreo === 'rebotado') {
      auditar(
        c.base,
        c.revista,
        articulo.id,
        'fallo',
        'Envío fallido: la dirección rebotó',
        'Sistema',
      )
    }
    const cuerpo: ResultadoAsignacion = {
      asignacion,
      correo: { estado: estadoCorreo, destinatario: par.correo },
    }
    return HttpResponse.json(cuerpo, { status: 201 })
  }),

  http.post('*/api/:revista/asignaciones/:id/reenviar', async ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const asignacion = c.base.asignaciones.find((a) => a.id === params.id)
    if (!asignacion) return error(404, 'Asignación no encontrada')
    const { tipo } = (await request.json()) as { tipo: 'reenvio' | 'recordatorio' }
    if (asignacion.estado !== 'invitado' && asignacion.estado !== 'segundo-intento') {
      return error(409, 'El par ya respondió: no hay invitación que reenviar')
    }
    const par = c.base.pares.find((p) => p.id === asignacion.parId)
    const articulo = c.base.articulos.find((a) => a.id === asignacion.articuloId)
    if (!par || !articulo) return error(404, 'Asignación incompleta')
    if (par.bloqueo) return error(409, 'El par está bloqueado y no recibe nuevas invitaciones')

    const recordatorio = tipo === 'recordatorio'
    const asunto = recordatorio
      ? 'Recordatorio: invitación a evaluar un artículo'
      : 'Reenvío de la invitación a evaluar'
    // A reminder is queued (simulated, RF-29 is still "En revisión"); a resend goes out now.
    const estado = correoDe(
      c.base,
      c.revista,
      articulo,
      par,
      tipo,
      asunto,
      recordatorio ? 'en-cola' : 'entregado',
    )
    if (!recordatorio && asignacion.estado === 'invitado') {
      asignacion.estado = 'segundo-intento'
      asignacion.intento = 2
    }
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'asignacion',
      recordatorio
        ? `Programó el recordatorio al par ${asignacion.orden}`
        : `Reenvió la invitación al par ${asignacion.orden}`,
      c.usuario.nombre,
    )
    if (estado === 'rebotado') {
      auditar(
        c.base,
        c.revista,
        articulo.id,
        'fallo',
        'Envío fallido: la dirección rebotó',
        'Sistema',
      )
    }
    const cuerpo: ResultadoAsignacion = { asignacion, correo: { estado, destinatario: par.correo } }
    return HttpResponse.json(cuerpo)
  }),

  http.post('*/api/:revista/asignaciones/:id/respuesta', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-respuesta')
    if (!c.ok) return c.respuesta
    const asignacion = c.base.asignaciones.find((a) => a.id === params.id)
    if (!asignacion) return error(404, 'Asignación no encontrada')
    const par = c.base.pares.find((p) => p.id === asignacion.parId)
    if (!par) return error(404, 'Par evaluador no encontrado')
    const { respuesta } = (await request.json()) as { respuesta: RespuestaPar }
    if (asignacion.estado !== 'invitado' && asignacion.estado !== 'segundo-intento') {
      return error(409, 'El par ya respondió esta invitación')
    }

    const ahora = ahoraIso()
    if (respuesta === 'acepto') {
      asignacion.estado = 'acepto'
      asignacion.fechaRespuesta = ahora
      auditar(
        c.base,
        c.revista,
        asignacion.articuloId,
        'asignacion',
        `Registró que el par ${asignacion.orden} aceptó`,
        c.usuario.nombre,
      )
    } else if (respuesta === 'no-acepto') {
      // RF-15: a peer who says they do not want to take part goes to the blocked list.
      asignacion.estado = 'no-acepto'
      asignacion.fechaRespuesta = ahora
      par.bloqueo = { motivo: 'no-desea', fecha: ahora.slice(0, 10) }
      auditar(
        c.base,
        c.revista,
        asignacion.articuloId,
        'bloqueo',
        `Bloqueó al par ${asignacion.orden}: no desea participar`,
        c.usuario.nombre,
      )
    } else {
      // RF-15: blocked after the second attempt without an answer.
      if (asignacion.estado !== 'segundo-intento') {
        return error(409, 'El bloqueo por falta de respuesta se aplica tras el segundo intento')
      }
      asignacion.estado = 'no-acepto'
      par.bloqueo = { motivo: 'sin-respuesta', fecha: ahora.slice(0, 10) }
      auditar(
        c.base,
        c.revista,
        asignacion.articuloId,
        'bloqueo',
        `Bloqueó al par ${asignacion.orden} tras el 2.º intento`,
        'Sistema',
      )
    }
    return HttpResponse.json(asignacion)
  }),

  http.post('*/api/:revista/asignaciones/:id/entrega', async ({ params, request }) => {
    const c = contexto(params, request, 'marcar-entrega')
    if (!c.ok) return c.respuesta
    const asignacion = c.base.asignaciones.find((a) => a.id === params.id)
    if (!asignacion) return error(404, 'Asignación no encontrada')
    const { fecha } = (await request.json()) as { fecha: string }
    if (asignacion.estado !== 'acepto') {
      return error(409, 'Solo se marca la entrega de un par que aceptó la invitación')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > ahoraIso().slice(0, 10)) {
      return error(422, 'La fecha de entrega no puede ser futura')
    }
    if (fecha < asignacion.fechaInvitacion.slice(0, 10)) {
      return error(422, 'La fecha de entrega no puede ser anterior a la invitación')
    }
    asignacion.estado = 'entrego'
    asignacion.fechaEntrega = `${fecha}T12:00:00`
    // Delivered evaluation => its constancia is now pending (RF-34).
    if (!c.base.constancias.some((k) => k.asignacionId === asignacion.id)) {
      c.base.constancias.push({
        id: `${asignacion.id}-k`,
        asignacionId: asignacion.id,
        estado: 'pendiente',
        fechaEmision: null,
        origen: 'sistema',
      })
    }
    auditar(
      c.base,
      c.revista,
      asignacion.articuloId,
      'entrega',
      `Marcó la entrega del par ${asignacion.orden}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(asignacion)
  }),

  http.post('*/api/:revista/asignaciones/:id/concepto', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-concepto')
    if (!c.ok) return c.respuesta
    const asignacion = c.base.asignaciones.find((a) => a.id === params.id)
    if (!asignacion) return error(404, 'Asignación no encontrada')
    if (asignacion.estado !== 'entrego') {
      return error(409, 'Registre primero la entrega de la evaluación')
    }
    const { concepto } = (await request.json()) as { concepto: ConceptoPar }
    asignacion.concepto = concepto
    auditar(
      c.base,
      c.revista,
      asignacion.articuloId,
      'revision',
      `Registró el concepto del par ${asignacion.orden}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(asignacion)
  }),
]
