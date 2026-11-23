/*
 * parExistente — detecta que una persona que se registra como par ya está en la base común, por correo o por
 * nombre (los demás datos pueden variar), y redacta el aviso para el usuario: que el par ya está en el sistema
 * y, si es el caso, que está bloqueado. Replica la regla del backend; la usa la API simulada.
 */
import type { ParEvaluador } from '@/types/par'

/** Clave para comparar un texto: sin tildes, mayúsculas ni espacios repetidos ("CESMAG" = "Cesmag"). */
export function claveTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

type ParBase = Pick<ParEvaluador, 'nombre' | 'correo' | 'bloqueo'>

export function buscarParExistente<T extends ParBase>(
  pares: T[],
  nombre: string,
  correo: string,
): T | undefined {
  return pares.find(
    (p) =>
      p.correo.trim().toLowerCase() === correo.trim().toLowerCase() ||
      claveTexto(p.nombre) === claveTexto(nombre),
  )
}

const MOTIVO = {
  'sin-respuesta': 'no respondió a las invitaciones',
  'no-desea': 'manifestó que no desea participar',
} as const

export function avisoParExistente(par: ParBase): string {
  if (par.bloqueo) {
    return (
      `«${par.nombre}» ya se encuentra en el sistema y está bloqueado desde el ${par.bloqueo.fecha.slice(0, 10)} ` +
      `(${MOTIVO[par.bloqueo.motivo]}). No se registra de nuevo; si desea invitarlo otra vez, desbloquéelo desde su ficha.`
    )
  }
  return (
    `«${par.nombre}» ya se encuentra registrado en el sistema (${par.correo}). ` +
    'Búsquelo en la lista de pares y asígnelo desde allí.'
  )
}

/** El texto tal como la base ya lo escribe: "cesmag" se guarda como el "Cesmag" que ya existe. */
export function formaExistente(
  pares: Array<Pick<ParEvaluador, 'universidad' | 'area'>>,
  campo: 'universidad' | 'area',
  texto: string,
): string {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  const cuenta = new Map<string, number>()
  for (const p of pares) {
    if (claveTexto(p[campo]) === claveTexto(limpio))
      cuenta.set(p[campo], (cuenta.get(p[campo]) ?? 0) + 1)
  }
  const [mejor] = [...cuenta.entries()].sort(
    (a, b) => b[1] - a[1] || Number(/[A-ZÁÉÍÓÚÑ]/.test(b[0])) - Number(/[A-ZÁÉÍÓÚÑ]/.test(a[0])),
  )
  return mejor ? mejor[0] : limpio
}
