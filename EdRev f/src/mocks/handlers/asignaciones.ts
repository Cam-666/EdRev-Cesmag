/*
 * Manejadores MSW para asignar pares a un artículo y seguir su respuesta: asignación de un par disponible o de un
 * candidato nuevo (los dos envían la invitación solos), reenvío, la respuesta del par, la marca de entrega y el
 * concepto. Simulan el envío de correo: registran un correo enviado y, cuando la dirección rebota, conservan la
 * asignación para poder corregirla y reenviar. Los permisos se aplican aquí como los aplicará la API real.
 */
import { http, HttpResponse } from 'msw'
import { autoresDeArticulo } from './pares'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error } from './util'
import { plantillaEnUso, todasLasAsignaciones } from '../db'
import { NOMBRE_EN_CORREO } from '../plantillas'
import { rellenar } from '@/lib/plantillas'
import { puedeAsignarPares } from '@/lib/dominio/comite'
import { mismaInstitucion } from '@/lib/dominio/conflicto'
import { enCurso, MAX_PARES_ACTIVOS, ocupaCupo, reglaPares } from '@/lib/dominio/pares'
import { avisoParExistente, buscarParExistente, formaExistente } from '@/lib/dominio/parExistente'
import { resultadoDePares } from '@/lib/dominio/resultadoPares'
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

/** Las direcciones que terminan así rebotan, para poder mostrar el flujo de envío fallido. */
const DOMINIO_QUE_REBOTA = '@invalido.test'

function asignadas(base: SeedRevista, articuloId: string): Asignacion[] {
  return base.asignaciones
    .filter((a) => a.articuloId === articuloId)
    .sort((x, y) => x.orden - y.orden)
}

type Validacion =
  { ok: true; orden: number; esDesempate: boolean } | { ok: false; estado: number; mensaje: string }

/**
 * Los pares se asignan cuando el comité aprobó el artículo (ronda más reciente). Como máximo tres pares que
 * aceptaron o entregaron; los que declinan o no responden no ocupan lugar, así la dependencia sigue invitando
 * mientras los demás avanzan. Un par bloqueado no recibe invitación.
 */
function validarArticulo(base: SeedRevista, articulo: Articulo): Validacion | null {
  if (!puedeAsignarPares(articulo)) {
    return {
      ok: false,
      estado: 409,
      mensaje: 'El comité aún no aprueba el artículo: no se pueden asignar pares',
    }
  }
  // Dos pares por artículo; un tercero solo cuando sus conceptos no coinciden.
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
  // La base de pares es común: una evaluación en curso en cualquiera de las dos revistas cuenta.
  if (todasLasAsignaciones().some((a) => a.parId === par.id && enCurso(a))) {
    return { ok: false, estado: 409, mensaje: 'El par tiene otra evaluación en curso' }
  }
  // No se asigna un par de la misma institución que alguno de los autores.
  const igual = mismaInstitucion(par, autoresDeArticulo(base, articulo.id))
  if (igual) return { ok: false, estado: 409, mensaje: igual }
  return { ok: true, orden: actuales.length + 1, esDesempate: reglaPares(actuales).desempate }
}

/** Un candidato nuevo se guarda en la base de pares antes de invitarlo. */
function registrarCandidato(
  base: SeedRevista,
  revista: Revista,
  datos: Extract<DatosAsignacion, { nuevo: unknown }>['nuevo'],
): ParEvaluador | { estado: number; mensaje: string } {
  const correo = datos.correo.trim().toLowerCase()
  if (!datos.nombre.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { estado: 422, mensaje: 'Escriba el nombre y un correo válido del candidato' }
  }
  const existente = buscarParExistente(base.pares, datos.nombre, correo)
  if (existente) return { estado: 409, mensaje: avisoParExistente(existente) }
  const par: ParEvaluador = {
    id: `${revista}-par-n${base.pares.length + 1}`,
    revista,
    nombre: datos.nombre.trim(),
    profesion: (datos.profesion ?? '').trim(),
    correo,
    universidad: formaExistente(base.pares, 'universidad', datos.universidad),
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

/** Los conceptos de los pares deciden el artículo: cerrarlo, devolverlo al comité o aprobarlo. */
function aplicarResultado(base: SeedRevista, revista: Revista, articuloId: string, usuario: string): void {
  const articulo = base.articulos.find((a) => a.id === articuloId)
  if (!articulo || (articulo.estado !== 'en-revision' && articulo.estado !== 'en-evaluacion')) return
  const resultado = resultadoDePares(base.asignaciones.filter((a) => a.articuloId === articuloId))
  if (resultado === 'no-publicable') {
    articulo.estado = 'rechazado'
    auditar(base, revista, articuloId, 'cierre', 'Cerró el proceso como rechazado: los pares calificaron el artículo como no publicable', usuario)
  } else if (resultado === 'publicable-con-modificaciones') {
    articulo.estado = 'postulado'
    auditar(base, revista, articuloId, 'revision', 'Devolvió el artículo al comité para una nueva ronda de revisión: los pares lo calificaron como publicable con modificaciones', usuario)
  } else if (resultado === 'publicable' && articulo.publicacion) {
    articulo.estado = 'aprobado'
    auditar(base, revista, articuloId, 'cierre', 'Cerró el proceso como aprobado: los pares lo calificaron como publicable', usuario)
  }
}

/** El último correo de invitación de una evaluación (invitación, 2.º intento o reenvío). */
export function ultimoCorreo(base: SeedRevista, asignacionId: string): CorreoEnviado | undefined {
  return base.correos
    .filter((x) => x.asignacionId === asignacionId && x.tipo !== 'agradecimiento' && x.tipo !== 'constancia')
    .sort((a, b) => b.fechaEnvio.localeCompare(a.fechaEnvio))[0]
}

function textosInvitacion(revista: Revista, par: ParEvaluador, articulo: Articulo) {
  // Revista, número de solicitud, par con su profesión, universidad y título del artículo.
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

/**
 * La respuesta de un par, que comparten la pantalla y los botones del correo de invitación (`porCorreo`: el par
 * respondió por sí mismo, y el historial lo dice). Devuelve el rechazo, o null cuando quedó registrada.
 */
export function aplicarRespuestaMock(
  base: SeedRevista,
  revista: Revista,
  asignacion: Asignacion,
  par: ParEvaluador,
  respuesta: RespuestaPar,
  quien: string,
  porCorreo: boolean,
): { estado: number; mensaje: string } | null {
  if (asignacion.estado !== 'invitado' && asignacion.estado !== 'segundo-intento') {
    return { estado: 409, mensaje: 'El par ya respondió esta invitación' }
  }
  const ahora = ahoraIso()
  const articulo = base.articulos.find((a) => a.id === asignacion.articuloId)
  const origen = porCorreo ? 'Sistema' : quien
  const texto = (registrado: string, porElPar: string) =>
    porCorreo ? `El par ${asignacion.orden} respondió desde el correo: ${porElPar}` : registrado
  if (respuesta === 'acepto') {
    const ocupados = asignadas(base, asignacion.articuloId).filter(ocupaCupo).length
    if (ocupados >= MAX_PARES_ACTIVOS) {
      return { estado: 409, mensaje: 'El artículo ya tiene tres pares que aceptaron' }
    }
    asignacion.estado = 'acepto'
    asignacion.fechaRespuesta = ahora
    // El artículo pasa a «En evaluación» cuando acepta el primer par.
    if (articulo?.estado === 'en-revision') articulo.estado = 'en-evaluacion'
    auditar(base, revista, asignacion.articuloId, 'respuesta', texto(`Registró que el par ${asignacion.orden} aceptó`, 'aceptó la invitación'), origen)
  } else if (respuesta === 'no-acepto') {
    // Declinar esta invitación no bloquea al par: se le puede invitar de nuevo más adelante.
    asignacion.estado = 'no-acepto'
    asignacion.fechaRespuesta = ahora
    auditar(base, revista, asignacion.articuloId, 'respuesta', texto(`Registró que el par ${asignacion.orden} no aceptó esta invitación`, 'no aceptó esta invitación'), origen)
  } else if (respuesta === 'no-desea') {
    // Un par que no desea participar más pasa a la lista de bloqueados.
    asignacion.estado = 'no-acepto'
    asignacion.fechaRespuesta = ahora
    par.bloqueo = { motivo: 'no-desea', fecha: ahora.slice(0, 10) }
    auditar(base, revista, asignacion.articuloId, 'bloqueo', texto(`Bloqueó al par ${asignacion.orden}: no desea participar`, 'no desea participar más'), origen)
  } else {
    // Se bloquea tras el segundo intento sin respuesta.
    if (asignacion.estado !== 'segundo-intento') {
      return { estado: 409, mensaje: 'El bloqueo por falta de respuesta se aplica tras el segundo intento' }
    }
    asignacion.estado = 'sin-respuesta'
    par.bloqueo = { motivo: 'sin-respuesta', fecha: ahora.slice(0, 10) }
    auditar(base, revista, asignacion.articuloId, 'bloqueo', `Bloqueó al par ${asignacion.orden} tras el 2.º intento`, 'Sistema')
  }
  return null
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

    // La invitación sale sola cuando se guarda la asignación.
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
      correo: { estado: estadoCorreo, destinatario: par.correo },
    }
    return HttpResponse.json(cuerpo, { status: 201 })
  }),

  // La invitación se reenvía solo cuando el envío anterior rebotó o falló (normalmente después de corregir la
  // dirección del par). No cuenta como intento para el bloqueo. El segundo intento es automático: no hay recordatorio.
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

    const fallo = aplicarRespuestaMock(c.base, c.revista, asignacion, par, respuesta, c.usuario.nombre, false)
    if (fallo) return error(fallo.estado, fallo.mensaje)
    return HttpResponse.json(asignacion)
  }),

  http.post('*/api/:revista/asignaciones/:id/entrega', async ({ params, request }) => {
    const c = contexto(params, request, 'marcar-entrega')
    if (!c.ok) return c.respuesta
    const asignacion = c.base.asignaciones.find((a) => a.id === params.id)
    if (!asignacion) return error(404, 'Asignación no encontrada')
    const { fecha, concepto } = (await request.json()) as { fecha: string; concepto?: ConceptoPar }
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
    if (concepto) asignacion.concepto = concepto
    // Evaluación entregada => su constancia queda pendiente.
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
    if (concepto) aplicarResultado(c.base, c.revista, asignacion.articuloId, c.usuario.nombre)
    // La ficha ofrece emitir la constancia de inmediato.
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
    aplicarResultado(c.base, c.revista, asignacion.articuloId, c.usuario.nombre)
    return HttpResponse.json(asignacion)
  }),
]
