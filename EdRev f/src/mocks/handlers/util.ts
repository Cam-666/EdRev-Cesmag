/*
 * Helpers shared by the mock handlers: journal from the URL, acting user from the token,
 * permission check and error responses.
 */
import { format } from 'date-fns'
import { HttpResponse } from 'msw'
import { baseDe } from '../db'
import type { SeedRevista } from '../seed/fabrica'
import { USUARIOS_SEED } from '../seed/usuarios'
import { idUsuarioDeAutorizacion } from '../token'
import { puede } from '@/modules/acceso/config/permisos'
import type { Accion } from '@/modules/acceso/config/permisos'
import { esRevista } from '@/types/revista'
import type { Revista } from '@/types/revista'
import type { Usuario } from '@/types/usuario'

export function ahoraIso(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
}

export function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function error(estado: number, mensaje: string) {
  return HttpResponse.json({ mensaje }, { status: estado })
}

type Contexto =
  | { ok: true; revista: Revista; base: SeedRevista; usuario: Usuario }
  | { ok: false; respuesta: Response }

/** Validates the journal segment and the session; optionally the permission needed. */
export function contexto(
  params: Record<string, string | readonly string[] | undefined>,
  request: Request,
  accion?: Accion,
): Contexto {
  const revista = params.revista
  if (typeof revista !== 'string' || !esRevista(revista)) {
    return { ok: false, respuesta: error(404, 'Revista no encontrada') }
  }
  const id = idUsuarioDeAutorizacion(request.headers.get('Authorization'))
  const usuario = USUARIOS_SEED.find((u) => u.id === id && u.estado === 'activo')
  if (!usuario) return { ok: false, respuesta: error(401, 'No autenticado') }
  if (accion && !puede(usuario.perfil, accion)) {
    return { ok: false, respuesta: error(403, 'Sin permiso para esta acción') }
  }
  return { ok: true, revista, base: baseDe(revista), usuario }
}
