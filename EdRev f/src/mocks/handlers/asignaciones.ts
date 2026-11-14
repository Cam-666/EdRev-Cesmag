/*
 * MSW handlers for assigning peers to an article and following their answer: assignment of an
 * available peer or of a brand-new candidate (both send the invitation by themselves), resend /
 * reminder, the peer's answer, delivery mark and concept. Simulates the mail sending: it records a sent mail and, when
 * the address bounces, keeps the assignment so it can be fixed and resent (RF-27).
 * Covers: RF-15, RF-17, RF-19..RF-29. Permissions are enforced here as the real API will.
 */
import { http, HttpResponse } from 'msw'
import { autoresDeArticulo } from './pares'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error } from './util'
import { plantillaEnUso, todasLasAsignaciones } from '../db'
import { NOMBRE_EN_CORREO } from '../plantillas'
import { rellenar } from '@/lib/plantillas'
import { puedeAsignarPares } from '@/lib/dominio/comite'
import { detectarConflicto, mismaInstitucion } from '@/lib/dominio/conflicto'
import { enCurso, MAX_PARES_ACTIVOS, ocupaCupo, reglaPares } from '@/lib/dominio/pares'
import type { Articulo } from '@/types/articulo'
import type { CorreoEnviado, EstadoCorreo, TipoAuditoria, TipoCorreo } from '@/types/historial'
import type {
  Asignacion,
  ConceptoPar,
  DatosAsignacion,
  ParEvaluador,
  ResultadoAsignacion,
  RespuestaPar,
} from '@/types/par'
import type { Revista } from '@/types/revista'

/** Addresses ending like this bounce, so the failed-send flow can be demonstrated (RF-27). */
const DOMINIO_QUE_REBOTA = '@invalido.test'

function asignadas(base: SeedRevista, articuloId: string): Asignacion[] {
  return base.asignaciones
    .filter((a) => a.articuloId === articuloId)
    .sort((x, y) => x.orden - y.orden)
}

type Validacion =
  { ok: true; orden: number; esDesempate: boolean } | { ok: false; estado: number; mensaje: string }

/**
 * RF-19: peers are assigned once the committee approved the article (most recent round). At most
 * three peers who accepted or delivered; those who decline or do not answer take no place, so the
 * dependency keeps inviting while the others go on. RF-15: blocked peers get no invitation.
 */
function validarArticulo(base: SeedRevista, articulo: Articulo): Validacion | null {
  if (!puedeAsignarPares(articulo)) {
    return {
      ok: false,
      estado: 409,
      mensaje: 'El comité aún no aprueba el artículo: no se pueden asignar pares',
    }
  }
  // Two peers per article; a third only when their concepts do not coincide (RF-19, RF-21).
  const regla = reglaPares(asignadas(base, articulo.id))
  if (!regla.puede) {
    return { ok: false, estado: 409, mensaje: regla.motivo ?? 'El artículo ya tiene sus pares' }
  }
  return null
}

function validar(base: SeedRevista, articulo: Articulo, par: ParEvaluador): Validacion {
  const delArticulo = validarArticulo(base, articulo)
  if (delArticulo) return delArticulo
  if (par.bloqueo) {
    return {
      ok: false,
      estado: 409,
      mensaje: 'El par está bloqueado y no recibe nuevas invitaciones',
    }
  }
  if (!par.correo) {
    return {
      ok: false,
      estado: 422,
      mensaje: 'El par no tiene correo: regístrelo antes de invitarlo',
    }
  }
  const actuales = asignadas(base, articulo.id)
  if (actuales.some((a) => a.parId === par.id)) {
    return { ok: false, estado: 409, mensaje: 'El par ya está asignado a este artículo' }
  }
  // The base of peers is common: an evaluation in progress in either journal counts.
  if (todasLasAsignaciones().some((a) => a.parId === par.id && enCurso(a))) {
    return { ok: false, estado: 409, mensaje: 'El par tiene otra evaluación en curso' }
  }
  // RF-17: a peer of the same institution as an author is not assigned.
  const igual = mismaInstitucion(par, autoresDeArticulo(base, articulo.id))
  if (igual) return { ok: false, estado: 409, mensaje: igual }
  return { ok: true, orden: actuales.length + 1, esDesempate: reglaPares(actuales).desempate }
}

/** RF-12: a new candidate is saved in the journal's base before being invited. */
function registrarCandidato(
  base: SeedRevista,
  revista: Revista,
  datos: Extract<DatosAsignacion, { nuevo: unknown }>['nuevo'],
): ParEvaluador | { estado: number; mensaje: string } {
  const correo = datos.correo.trim().toLowerCase()
  if (!datos.nombre.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { estado: 422, mensaje: 'Escriba el nombre y un correo válido del candidato' }
  }
  if (base.pares.some((p) => p.correo.toLowerCase() === correo)) {
    return { estado: 409, mensaje: 'Ya existe un par con ese correo en la base de pares' }
  }
  const par: ParEvaluador = {
    id: `${revista}-par-n${base.pares.length + 1}`,
    revista,
    nombre: datos.nombre.trim(),
    profesion: (datos.profesion ?? '').trim(),
    correo,
    universidad: datos.universidad.trim(),
    area: datos.area.trim(),
    bloqueo: null,
  }
  base.pares.push(par)
  return par
}

function correoDe(
  base: SeedRevista,
  revista: Revista,
  articulo: Articulo,
  asignacionId: string,
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
    asignacionId,
    atendido: false,
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
  tipo: TipoAuditoria,
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

/** The last invitation mail of an evaluation (invitation, 2nd attempt or resend). */
export function ultimoCorreo(base: SeedRevista, asignacionId: string): CorreoEnviado | undefined {
  return base.correos
    .filter((x) => x.asignacionId === asignacionId && x.tipo !== 'agradecimiento' && x.tipo !== 'constancia')
    .sort((a, b) => b.fechaEnvio.localeCompare(a.fechaEnvio))[0]
}

function textosInvitacion(revista: Revista, par: ParEvaluador, articulo: Articulo) {
  // RF-25: journal, request number, peer with profession, university and article title.
  const variables = {
    revista: NOMBRE_EN_CORREO[revista],
    numero: articulo.numeroOjs,
    par: par.nombre,
    profesion: par.profesion,
    universidad: par.universidad,
    articulo: articulo.titulo,
  }
  return {
    asunto: rellenar(plantillaEnUso(revista, 'invitacion').asunto ?? '', variables),
    cuerpo: rellenar(plantillaEnUso(revista, 'invitacion').cuerpo, variables),
  }
}

export const handlersAsignaciones = [
  http.post('*/api/:revista/articulos/:id/asignaciones', async ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const datos = (await request.json()) as DatosAsignacion
    let par: ParEvaluador | undefined
    if ('nuevo' in datos) {
      const previa = validarArticulo(c.base, articulo)
      if (previa && !previa.ok) return error(previa.estado, previa.mensaje)
      const nuevo = registrarCandidato(c.base, c.revista, datos.nuevo)
      if ('mensaje' in nuevo) return error(nuevo.estado, nuevo.mensaje)
      par = nuevo
    } else {
      par = c.base.pares.find((p) => p.id === datos.parId)
    }
    if (!par) return error(404, 'Par evaluador no encontrado')
    const v = validar(c.base, articulo, par)
    if (!v.ok) {
      if ('nuevo' in datos) c.base.pares = c.base.pares.filter((p) => p.id !== par?.id)
      return error(v.estado, v.mensaje)
    }

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

    // The invitation goes out by itself when the assignment is saved (RF-24).
    const { asunto } = textosInvitacion(c.revista, par, articulo)
    const estadoCorreo = correoDe(
      c.base,
      c.revista,
      articulo,
      asignacion.id,
      par,
      'invitacion',
      asunto,
      'enviado',
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
      par: { id: par.id, nombre: par.nombre, correo: par.correo },
      conflicto: detectarConflicto(par, autoresDeArticulo(c.base, articulo.id)),
      correo: { estado: estadoCorreo, destinatario: par.correo },
    }
    return HttpResponse.json(cuerpo, { status: 201 })
  }),

  // RF-28: the invitation is resent only when the previous send bounced or failed (usually after
  // correcting the peer's address). It does not count as an attempt for the block. The second
  // attempt itself is automatic (RF-29, D7): there is no reminder.
  http.post('*/api/:revista/asignaciones/:id/reenviar', ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const asignacion = c.base.asignaciones.find((a) => a.id === params.id)
    if (!asignacion) return error(404, 'Asignación no encontrada')
    if (asignacion.estado !== 'invitado' && asignacion.estado !== 'segundo-intento') {
      return error(409, 'El par ya respondió: no hay invitación que reenviar')
    }
    const par = c.base.pares.find((p) => p.id === asignacion.parId)
    const articulo = c.base.articulos.find((a) => a.id === asignacion.articuloId)
    if (!par || !articulo) return error(404, 'Asignación incompleta')
    if (par.bloqueo) return error(409, 'El par está bloqueado y no recibe nuevas invitaciones')
    const anterior = ultimoCorreo(c.base, asignacion.id)
    if (
      !anterior ||
      anterior.atendido ||
      (anterior.estado !== 'rebotado' && anterior.estado !== 'fallido')
    ) {
      return error(409, 'Solo se reenvía cuando el envío anterior rebotó o falló')
    }
    anterior.atendido = true
    const estado = correoDe(
      c.base,
      c.revista,
      articulo,
      asignacion.id,
      par,
      'reenvio',
      'Reenvío de la invitación a evaluar',
      'enviado',
    )
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'envio',
      `Reenvió la invitación al par ${asignacion.orden} tras corregir el envío`,
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
    const cuerpo: ResultadoAsignacion = {
      asignacion,
      par: { id: par.id, nombre: par.nombre, correo: par.correo },
      conflicto: null,
      correo: { estado, destinatario: par.correo },
    }
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
    const articulo = c.base.articulos.find((a) => a.id === asignacion.articuloId)
    if (respuesta === 'acepto') {
      const ocupados = asignadas(c.base, asignacion.articuloId).filter(ocupaCupo).length
      if (ocupados >= MAX_PARES_ACTIVOS) {
        return error(409, 'El artículo ya tiene tres pares que aceptaron')
      }
      asignacion.estado = 'acepto'
      asignacion.fechaRespuesta = ahora
      // RF-22: the article goes to «En evaluación» when the first peer accepts.
      if (articulo?.estado === 'en-revision') articulo.estado = 'en-evaluacion'
      auditar(
        c.base,
        c.revista,
        asignacion.articuloId,
        'respuesta',
        `Registró que el par ${asignacion.orden} aceptó`,
        c.usuario.nombre,
      )
    } else if (respuesta === 'no-acepto') {
      // Declining this invitation does not block the peer: it can be invited again later.
      asignacion.estado = 'no-acepto'
      asignacion.fechaRespuesta = ahora
      auditar(
        c.base,
        c.revista,
        asignacion.articuloId,
        'respuesta',
        `Registró que el par ${asignacion.orden} no aceptó esta invitación`,
        c.usuario.nombre,
      )
    } else if (respuesta === 'no-desea') {
      // RF-15: a peer who does not want to take part any more goes to the blocked list.
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
      // RF-15, RF-29: blocked after the second attempt without an answer.
      if (asignacion.estado !== 'segundo-intento') {
        return error(409, 'El bloqueo por falta de respuesta se aplica tras el segundo intento')
      }
      asignacion.estado = 'sin-respuesta'
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
    // RF-23: the sheet offers to issue the constancia right away.
    const constancia = c.base.constancias.find((k) => k.asignacionId === asignacion.id)
    return HttpResponse.json({ ...asignacion, constanciaId: constancia?.id ?? null })
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
