/*
 * almacenSesion — conserva la sesión entre recargas de la misma pestaña: el perfil (nunca la contraseña) y el
 * token de sesión, que el backend necesita en cada petición. El almacenamiento puede estar bloqueado, por eso
 * cada acceso va protegido. Solo se usa sessionStorage, que el navegador borra al cerrar la pestaña: el sistema
 * no ofrece «mantener la sesión iniciada».
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
    /* almacenamiento no disponible: la sesión simplemente no sobrevivirá a una recarga */
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
    /* se ignora */
  }
}
