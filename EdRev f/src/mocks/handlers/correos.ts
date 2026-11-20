/*
 * Manejadores MSW del registro de correos enviados de una revista: listado con contadores, reintento (la cola y los
 * correos que falló el servicio) y «corregir y reenviar» (corregir la dirección del par y enviar de nuevo como un
 * correo nuevo). Resultados: en cola, enviado, rebotado, fallido; no se pierde nada. Reintentar está permitido a
 * la Administradora y a la Auxiliar.
 */
import { http, HttpResponse } from 'msw'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error } from './util'
import type {
  CorreoEnviado,
  EstadoCorreo,
  RespuestaAlCorreo,
  RespuestaDelPar,
  TipoAuditoria,
} from '@/types/historial'
import type { Revista } from '@/types/revista'

const DOMINIO_QUE_REBOTA = '@invalido.test'

function rebota(correo: string): boolean {
  return correo.toLowerCase().endsWith(DOMINIO_QUE_REBOTA)
}

function respuestaDe(base: SeedRevista, c: CorreoEnviado): RespuestaAlCorreo | null {
  if (c.tipo === 'agradecimiento' || c.tipo === 'constancia') return null
  const asignacion = base.asignaciones.find((a) => a.id === c.asignacionId)
  if (!asignacion) return null
  const par = base.pares.find((p) => p.id === asignacion.parId)
  const respuesta: RespuestaDelPar =
    asignacion.estado === 'invitado' || asignacion.estado === 'segundo-intento'
      ? 'sin-respuesta-aun'
      : asignacion.estado === 'sin-respuesta'
        ? 'sin-respuesta'
        : asignacion.estado === 'no-acepto'
          ? par?.bloqueo?.motivo === 'no-desea'
            ? 'no-desea'
            : 'no-acepto'
          : 'acepto'
  return { respuesta, fecha: respuesta === 'sin-respuesta-aun' ? null : (asignacion.fechaRespuesta ?? null), medio: null }
}

function conArticulo(base: SeedRevista, c: CorreoEnviado) {
  const articulo = base.articulos.find((a) => a.id === c.articuloId)
  return { ...c, numeroOjs: articulo?.numeroOjs ?? c.articuloId, respuestaPar: respuestaDe(base, c) }
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

/**
 * Un correo en cola o fallido se envía de nuevo tal cual (mismo registro, fecha nueva). Uno rebotado necesita
 * primero la dirección corregida: ese reenvío es un correo nuevo y el rebotado queda «atendido».
 */
function reintentar(
  base: SeedRevista,
  revista: Revista,
  correo: CorreoEnviado,
  usuario: string,
): EstadoCorreo {
  correo.fechaEnvio = ahoraIso()
  correo.estado = rebota(correo.destinatario) ? 'rebotado' : 'enviado'
  auditar(base, revista, correo.articuloId, 'envio', 'Reintentó el envío de un correo', usuario)
  return correo.estado
}

export const handlersCorreos = [
  http.get('*/api/:revista/correos', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const tipo = url.searchParams.get('tipo')
    const estado = url.searchParams.get('estado')
    const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1))
    const porPagina = Math.max(1, Number(url.searchParams.get('porPagina') ?? 10))

    const todos = c.base.correos
    const filtrados = todos
      .filter((x) => !tipo || x.tipo === tipo)
      .filter((x) => !estado || x.estado === estado)
      .sort((a, b) => b.fechaEnvio.localeCompare(a.fechaEnvio))
    return HttpResponse.json({
      items: filtrados
        .slice((pagina - 1) * porPagina, pagina * porPagina)
        .map((x) => conArticulo(c.base, x)),
      total: filtrados.length,
      enviados: todos.filter((x) => x.estado === 'enviado').length,
      rebotados: todos.filter((x) => x.estado === 'rebotado' && !x.atendido).length,
      fallidos: todos.filter((x) => x.estado === 'fallido' && !x.atendido).length,
      enCola: todos.filter((x) => x.estado === 'en-cola').length,
    })
  }),

  http.post('*/api/:revista/correos/reintentar-fallidos', ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    // Los envíos fallidos del servicio de correo y la cola; los rebotados necesitan una dirección corregida.
    const pendientes = c.base.correos.filter(
      (x) => (x.estado === 'fallido' && !x.atendido) || x.estado === 'en-cola',
    )
    const resultados = pendientes.map((x) => reintentar(c.base, c.revista, x, c.usuario.nombre))
    return HttpResponse.json({
      reintentados: resultados.length,
      enviados: resultados.filter((r) => r === 'enviado').length,
      siguenFallando: resultados.filter((r) => r !== 'enviado').length,
    })
  }),

  http.post('*/api/:revista/correos/:id/reintentar', ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const correo = c.base.correos.find((x) => x.id === params.id)
    if (!correo) return error(404, 'Correo no encontrado')
    if ((correo.estado !== 'fallido' && correo.estado !== 'en-cola') || correo.atendido) {
      return error(409, 'Este correo no necesita reintento')
    }
    const estado = reintentar(c.base, c.revista, correo, c.usuario.nombre)
    if (estado === 'rebotado') {
      return error(409, 'La dirección sigue rebotando: corríjala y vuelva a enviar')
    }
    return HttpResponse.json({ estado })
  }),

  http.post('*/api/:revista/correos/:id/corregir', async ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const correo = c.base.correos.find((x) => x.id === params.id)
    if (!correo) return error(404, 'Correo no encontrado')
    if (correo.tipo === 'mensaje') {
      return error(409, 'Corrija el correo en la ficha de la persona y vuelva a enviarle el mensaje')
    }
    if ((correo.estado !== 'rebotado' && correo.estado !== 'fallido') || correo.atendido) {
      return error(409, 'Solo se corrige un envío que rebotó o falló')
    }
    const { correo: nueva } = (await request.json()) as { correo: string }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nueva.trim()))
      return error(422, 'Escriba un correo válido')

    // La dirección es del par: corregirla corrige todos los envíos posteriores a ese par.
    const par = c.base.pares.find(
      (p) => p.correo.toLowerCase() === correo.destinatario.toLowerCase(),
    )
    if (par) par.correo = nueva.trim()
    auditar(
      c.base,
      c.revista,
      correo.articuloId,
      'edicion',
      'Corrigió el correo del par',
      c.usuario.nombre,
    )
    // El reenvío es un correo nuevo («Reenvío por corrección»); no es un intento nuevo.
    const destinatario = nueva.trim()
    const estado: EstadoCorreo = rebota(destinatario) ? 'rebotado' : 'enviado'
    correo.atendido = true
    c.base.correos.unshift({
      ...correo,
      id: `${c.revista}-cor-n${c.base.correos.length + 1}`,
      tipo: correo.tipo === 'agradecimiento' || correo.tipo === 'constancia' ? correo.tipo : 'reenvio',
      destinatario,
      fechaEnvio: ahoraIso(),
      estado,
      atendido: false,
    })
    auditar(
      c.base,
      c.revista,
      correo.articuloId,
      'envio',
      'Reenvió el correo corregido',
      c.usuario.nombre,
    )
    if (estado === 'rebotado') return error(409, 'La nueva dirección también rebota')
    return HttpResponse.json({ estado })
  }),
]
