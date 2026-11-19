/*
 * parExistente — detects that a person being registered as a peer is already in the common base,
 * by e-mail or by name (the other data may vary), and writes the notice for the user: that the
 * peer is already in the system and, when so, that it is blocked. Mirrors the backend rule; the
 * mock API uses it. Covers: RF-12, RF-15, HU-08, HU-10.
 */
import type { ParEvaluador } from '@/types/par'

/** Comparison key of a text: without accents, case or repeated spaces ("CESMAG" = "Cesmag"). */
export function claveTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
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

/** The text as the base already spells it: "cesmag" is stored as the existing "Cesmag". */
export function formaExistente(
  pares: Array<Pick<ParEvaluador, 'universidad' | 'area'>>,
  campo: 'universidad' | 'area',
  texto: string,
): string {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  const cuenta = new Map<string, number>()
  for (const p of pares) {
    if (claveTexto(p[campo]) === claveTexto(limpio)) cuenta.set(p[campo], (cuenta.get(p[campo]) ?? 0) + 1)
  }
  const [mejor] = [...cuenta.entries()].sort(
    (a, b) => b[1] - a[1] || Number(/[A-ZÁÉÍÓÚÑ]/.test(b[0])) - Number(/[A-ZÁÉÍÓÚÑ]/.test(a[0])),
  )
  return mejor ? mejor[0] : limpio
}
