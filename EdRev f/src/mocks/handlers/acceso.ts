/*
 * Manejadores MSW del acceso: ingreso con contador de intentos y bloqueo de 15 minutos, recuperación de
 * contraseña (siempre responde 202 para que no se pueda averiguar qué cuentas existen) y los enlaces de
 * contraseña: el que recibe una cuenta nueva y el de recuperación. Un enlace dura 30 minutos y sirve una sola
 * vez. Cada cuenta tiene su propia contraseña; una cuenta nueva no puede ingresar hasta definirla.
 * Simulan el backend; la interfaz solo ve HTTP.
 */
import { http, HttpResponse } from 'msw'
import { CONTRASENA_DEMO } from '../seed/credenciales'
import { usuarios } from '../db'
import { tokenMock } from '../token'
import { POLITICA_ACCESO } from '@/modules/acceso/config/politicaAcceso'
import type {
  CredencialesIngreso,
  DetalleErrorEnlace,
  DetalleErrorIngreso,
  EnlaceContrasena,
  MotivoEnlace,
  RespuestaEnvioEnlace,
} from '@/types/acceso'

interface Enlace {
  usuarioId: string
  motivo: MotivoEnlace
  venceEn: number
  usado: boolean
}

const intentos = new Map<string, number>()
const bloqueos = new Map<string, number>()
const enlaces = new Map<string, Enlace>()
/** Contraseñas definidas con un enlace; mientras tanto las cuentas de ejemplo usan la contraseña de demostración. */
const contrasenas = new Map<string, string>()
let secuencia = 0

/** Borra los contadores, enlaces y contraseñas en memoria (se usa entre pruebas). */
export function reiniciarEstadoAcceso(): void {
  intentos.clear()
  bloqueos.clear()
  enlaces.clear()
  contrasenas.clear()
  secuencia = 0
}

/** Emite un enlace de un solo uso para definir una contraseña y devuelve su ruta en la aplicación. */
export function crearEnlace(usuarioId: string, motivo: MotivoEnlace): string {
  secuencia += 1
  const token = `${motivo.slice(0, 3)}-${secuencia}-${Date.now().toString(36)}`
  // Cualquier enlace anterior de la misma cuenta deja de servir.
  for (const e of enlaces.values()) if (e.usuarioId === usuarioId) e.usado = true
  enlaces.set(token, {
    usuarioId,
    motivo,
    venceEn: Date.now() + POLITICA_ACCESO.enlaceCaducaMinutos * 60_000,
    usado: false,
  })
  return `/acceso/contrasena?token=${encodeURIComponent(token)}`
}

/** Una cuenta nueva recibe una contraseña aleatoria que nadie conoce hasta que su dueño define la suya. */
export function bloquearContrasena(usuarioId: string): void {
  contrasenas.set(usuarioId, `sin-definir-${Math.random().toString(36).slice(2)}`)
}

function error(estado: number, detalle: DetalleErrorIngreso) {
  return HttpResponse.json(detalle, { status: estado })
}

function errorEnlace(estado: number, motivo: DetalleErrorEnlace['motivo']) {
  const detalle: DetalleErrorEnlace = { motivo }
  return HttpResponse.json(detalle, { status: estado })
}

function enlaceVigente(token: string): Enlace | DetalleErrorEnlace['motivo'] {
  const enlace = enlaces.get(token)
  if (!enlace) return 'invalido'
  if (enlace.usado) return 'usado'
  if (enlace.venceEn <= Date.now()) return 'vencido'
  return enlace
}

export const handlersAcceso = [
  http.post('*/api/auth/login', async ({ request }) => {
    const { correo, contrasena } = (await request.json()) as CredencialesIngreso
    const clave = correo.trim().toLowerCase()

    const bloqueadoHasta = bloqueos.get(clave)
    if (bloqueadoHasta !== undefined && bloqueadoHasta > Date.now()) {
      return error(423, {
        motivo: 'bloqueada',
        bloqueadoHasta: new Date(bloqueadoHasta).toISOString(),
      })
    }

    const usuario = usuarios().find((u) => u.correo === clave)
    if (usuario?.estado === 'inhabilitado') return error(403, { motivo: 'inhabilitada' })

    const esperada = usuario ? (contrasenas.get(usuario.id) ?? CONTRASENA_DEMO) : null
    if (!usuario || contrasena !== esperada) {
      const intento = (intentos.get(clave) ?? 0) + 1
      if (intento >= POLITICA_ACCESO.intentosMaximos) {
        const hasta = Date.now() + POLITICA_ACCESO.bloqueoMinutos * 60_000
        intentos.delete(clave)
        bloqueos.set(clave, hasta)
        return error(423, { motivo: 'bloqueada', bloqueadoHasta: new Date(hasta).toISOString() })
      }
      intentos.set(clave, intento)
      return error(401, {
        motivo: 'credenciales',
        intento,
        maximo: POLITICA_ACCESO.intentosMaximos,
      })
    }

    intentos.delete(clave)
    usuario.ultimoIngreso = new Date().toISOString()
    return HttpResponse.json({ usuario, token: tokenMock(usuario.id) })
  }),

  // Siempre 202, exista o no la cuenta.
  http.post('*/api/auth/recuperar', async ({ request }) => {
    const { correo } = (await request.json()) as { correo: string }
    const usuario = usuarios().find(
      (u) => u.correo === correo.trim().toLowerCase() && u.estado === 'activo',
    )
    const cuerpo: RespuestaEnvioEnlace = usuario
      ? { enlaceDemo: crearEnlace(usuario.id, 'recuperacion') }
      : {}
    return HttpResponse.json(cuerpo, { status: 202 })
  }),

  http.get('*/api/auth/enlaces/:token', ({ params }) => {
    const enlace = enlaceVigente(String(params.token))
    if (typeof enlace === 'string') return errorEnlace(enlace === 'invalido' ? 404 : 410, enlace)
    const usuario = usuarios().find((u) => u.id === enlace.usuarioId)
    if (!usuario || usuario.estado !== 'activo') return errorEnlace(404, 'invalido')
    const cuerpo: EnlaceContrasena = {
      motivo: enlace.motivo,
      nombre: usuario.nombre,
      correo: usuario.correo,
    }
    return HttpResponse.json(cuerpo)
  }),

  http.post('*/api/auth/enlaces/:token', async ({ params, request }) => {
    const enlace = enlaceVigente(String(params.token))
    if (typeof enlace === 'string') return errorEnlace(enlace === 'invalido' ? 404 : 410, enlace)
    const { contrasena } = (await request.json()) as { contrasena: string }
    const segura =
      contrasena.length >= POLITICA_ACCESO.contrasenaMinima &&
      /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(contrasena) &&
      /\d/.test(contrasena)
    if (!segura) {
      return HttpResponse.json(
        { mensaje: 'La contraseña necesita al menos 8 caracteres, con letras y números' },
        { status: 422 },
      )
    }
    contrasenas.set(enlace.usuarioId, contrasena)
    enlace.usado = true
    intentos.clear()
    return new HttpResponse(null, { status: 204 })
  }),
]
