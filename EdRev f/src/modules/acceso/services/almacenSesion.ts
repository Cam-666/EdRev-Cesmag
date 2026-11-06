/*
 * almacenSesion — keeps the logged-in profile across reloads. Only the non-sensitive profile is
 * stored (never the password); the token lives in memory. Storage can be blocked, so every access
 * is guarded. `mantener` chooses localStorage (survives closing the browser) over sessionStorage.
 */
import type { Usuario } from '@/types/usuario'

const CLAVE = 'edrev.sesion'

function esUsuario(valor: unknown): valor is Usuario {
  if (typeof valor !== 'object' || valor === null) return false
  const v = valor as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.nombre === 'string' &&
    typeof v.correo === 'string' &&
    (v.perfil === 'administrador' || v.perfil === 'auxiliar')
  )
}

export function guardarSesion(usuario: Usuario, mantener: boolean): void {
  try {
    const destino = mantener ? window.localStorage : window.sessionStorage
    const otro = mantener ? window.sessionStorage : window.localStorage
    otro.removeItem(CLAVE)
    destino.setItem(CLAVE, JSON.stringify(usuario))
  } catch {
    /* storage unavailable: the session just will not survive a reload */
  }
}

export function leerSesion(): Usuario | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE) ?? window.localStorage.getItem(CLAVE)
    if (!crudo) return null
    const valor: unknown = JSON.parse(crudo)
    return esUsuario(valor) ? valor : null
  } catch {
    return null
  }
}

export function borrarSesion(): void {
  try {
    window.sessionStorage.removeItem(CLAVE)
    window.localStorage.removeItem(CLAVE)
  } catch {
    /* ignore */
  }
}
