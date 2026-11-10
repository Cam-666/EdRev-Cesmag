/*
 * MSW handlers for authentication: login with attempt counter and 15-minute lockout, and
 * password recovery (always answers 202 so accounts cannot be enumerated).
 * Covers: HU-28, RF-39. Simulates the backend; the frontend only sees HTTP.
 */
import { http, HttpResponse } from 'msw'
import { CONTRASENA_DEMO } from '../seed/credenciales'
import { usuarios } from '../db'
import { tokenMock } from '../token'
import { POLITICA_ACCESO } from '@/modules/acceso/config/politicaAcceso'
import type { CredencialesIngreso, DetalleErrorIngreso } from '@/types/acceso'

const intentos = new Map<string, number>()
const bloqueos = new Map<string, number>()

/** Clears the in-memory counters (used between tests). */
export function reiniciarEstadoAcceso(): void {
  intentos.clear()
  bloqueos.clear()
}

function error(estado: number, detalle: DetalleErrorIngreso) {
  return HttpResponse.json(detalle, { status: estado })
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

    if (!usuario || contrasena !== CONTRASENA_DEMO) {
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
    return HttpResponse.json({ usuario, token: tokenMock(usuario.id) })
  }),

  http.post('*/api/auth/recuperar', () => HttpResponse.json({}, { status: 202 })),
]
