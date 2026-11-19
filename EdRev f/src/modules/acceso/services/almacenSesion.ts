/*
 * almacenSesion — keeps the session across reloads of the same tab: the profile (never the
 * password) and the session token, which the backend needs on every request. Storage can be
 * blocked, so every access is guarded. Only sessionStorage, which the browser clears when the tab
 * is closed: the system offers no "keep me signed in" (RNF-05, D15).
 */
import type { Usuario } from '@/types/usuario'

const CLAVE = 'edrev.sesion'
const CLAVE_TOKEN = 'edrev.token'

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

export function guardarSesion(usuario: Usuario, token?: string): void {
  try {
    window.localStorage.removeItem(CLAVE)
    window.sessionStorage.setItem(CLAVE, JSON.stringify(usuario))
    if (token) window.sessionStorage.setItem(CLAVE_TOKEN, token)
  } catch {
    /* storage unavailable: the session just will not survive a reload */
  }
}

export function leerSesion(): Usuario | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE)
    if (!crudo) return null
    const valor: unknown = JSON.parse(crudo)
    return esUsuario(valor) ? valor : null
  } catch {
    return null
  }
}

export function leerToken(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

export function borrarSesion(): void {
  try {
    window.sessionStorage.removeItem(CLAVE)
    window.sessionStorage.removeItem(CLAVE_TOKEN)
    window.localStorage.removeItem(CLAVE)
  } catch {
    /* ignore */
  }
}
