/*
 * MSW handlers for the sent-mail log of a journal: list with counters, retry (the queue and the
 * failed ones) and "corregir y reenviar" (fix the address of the peer and send again). A failed
 * mail whose resend went out becomes "reintentado"; nothing is lost (RNF-02).
 * Covers: RF-26, RF-27, RF-28, RNF-02. Retrying is allowed to Administradora and Auxiliar.
 */
import { http, HttpResponse } from 'msw'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error } from './util'
import type { CorreoEnviado, EstadoCorreo } from '@/types/historial'
import type { Revista } from '@/types/revista'

const DOMINIO_QUE_REBOTA = '@invalido.test'

function rebota(correo: string): boolean {
  return correo.toLowerCase().endsWith(DOMINIO_QUE_REBOTA)
}

function conArticulo(base: SeedRevista, c: CorreoEnviado) {
  const articulo = base.articulos.find((a) => a.id === c.articuloId)
  return { ...c, numeroOjs: articulo?.numeroOjs ?? c.articuloId }
}

function auditar(
  base: SeedRevista,
  revista: Revista,
  articuloId: string,
  tipo: 'fallo' | 'edicion' | 'asignacion',
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
 * Sends `correo` again. Queued mails are delivered; a bounced one is delivered only if its address
 * now works, and then it is marked "reintentado" while a new delivered entry records the resend.
 */
function reintentar(
  base: SeedRevista,
  revista: Revista,
  correo: CorreoEnviado,
  usuario: string,
): EstadoCorreo {
  if (rebota(correo.destinatario)) {
    correo.estado = 'rebotado'
    return 'rebotado'
  }
  if (correo.estado === 'en-cola') {
    correo.estado = 'entregado'
    correo.fechaEnvio = ahoraIso()
    return 'entregado'
  }
  correo.estado = 'reintentado'
  base.correos.unshift({
    ...correo,
    id: `${revista}-cor-n${base.correos.length + 1}`,
    fechaEnvio: ahoraIso(),
    estado: 'entregado',
  })
  auditar(
    base,
    revista,
    correo.articuloId,
    'asignacion',
    'Reintentó el envío de un correo',
    usuario,
  )
  return 'entregado'
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
      entregados: todos.filter((x) => x.estado === 'entregado').length,
      rebotados: todos.filter((x) => x.estado === 'rebotado').length,
      enCola: todos.filter((x) => x.estado === 'en-cola').length,
    })
  }),

  http.post('*/api/:revista/correos/reintentar-fallidos', ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const pendientes = c.base.correos.filter(
      (x) => x.estado === 'rebotado' || x.estado === 'en-cola',
    )
    const resultados = pendientes.map((x) => reintentar(c.base, c.revista, x, c.usuario.nombre))
    return HttpResponse.json({
      reintentados: resultados.length,
      entregados: resultados.filter((r) => r === 'entregado').length,
      siguenFallando: resultados.filter((r) => r === 'rebotado').length,
    })
  }),

  http.post('*/api/:revista/correos/:id/reintentar', ({ params, request }) => {
    const c = contexto(params, request, 'asignar-pares')
    if (!c.ok) return c.respuesta
    const correo = c.base.correos.find((x) => x.id === params.id)
    if (!correo) return error(404, 'Correo no encontrado')
    if (correo.estado !== 'rebotado' && correo.estado !== 'en-cola') {
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
    const { correo: nueva } = (await request.json()) as { correo: string }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nueva.trim()))
      return error(422, 'Escriba un correo válido')

    // The address belongs to the peer: fixing it fixes every later send to that peer.
    const par = c.base.pares.find(
      (p) => p.correo.toLowerCase() === correo.destinatario.toLowerCase(),
    )
    if (par) par.correo = nueva.trim()
    correo.destinatario = nueva.trim()
    auditar(
      c.base,
      c.revista,
      correo.articuloId,
      'edicion',
      'Corrigió el correo del par',
      c.usuario.nombre,
    )
    const estado = reintentar(c.base, c.revista, correo, c.usuario.nombre)
    if (estado === 'rebotado') return error(409, 'La nueva dirección también rebota')
    return HttpResponse.json({ estado })
  }),
]
