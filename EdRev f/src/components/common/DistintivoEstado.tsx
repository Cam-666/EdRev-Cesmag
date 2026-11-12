/*
 * DistintivoEstado — status badge. Always symbol + text, never color alone.
 * Covers: RNF-12 (independence of color), RF-22 (par status), RF-26 (mail result).
 * Base set: the 8 states of the design. Extras: assignment and mail variants (decision 5).
 */
import { cn } from '@/lib/cn'

export type EstadoDistintivo =
  // The eight base states
  | 'postulado'
  | 'en-revision'
  | 'en-evaluacion'
  | 'aprobado'
  | 'rechazado'
  | 'archivado'
  | 'bloqueado'
  | 'pendiente'
  // Committee round result (RF-06)
  | 'ajustes'
  // Assignment status (RF-22)
  | 'invitado'
  | 'segundo-intento'
  | 'acepto'
  | 'no-acepto'
  | 'sin-respuesta'
  | 'entrego'
  // Peer availability
  | 'disponible'
  | 'conflicto'
  // Account status
  | 'activo'
  | 'inhabilitado'
  // Constancia / mail result
  | 'emitida'
  | 'entregado'
  | 'rebotado'
  | 'reintentado'
  | 'en-cola'

type Tono = 'exito' | 'alerta' | 'error' | 'info' | 'neutro'

interface Definicion {
  texto: string
  simbolo: string
  tono: Tono
}

export const DEFINICIONES_ESTADO: Record<EstadoDistintivo, Definicion> = {
  postulado: { texto: 'Postulado', simbolo: '○', tono: 'neutro' },
  'en-revision': { texto: 'En revisión', simbolo: '◐', tono: 'info' },
  'en-evaluacion': { texto: 'En evaluación', simbolo: '◑', tono: 'info' },
  aprobado: { texto: 'Aprobado', simbolo: '✓', tono: 'exito' },
  rechazado: { texto: 'Rechazado', simbolo: '✕', tono: 'error' },
  archivado: { texto: 'Archivado', simbolo: '▣', tono: 'neutro' },
  bloqueado: { texto: 'Bloqueado', simbolo: '⊘', tono: 'error' },
  pendiente: { texto: 'Pendiente', simbolo: '!', tono: 'alerta' },
  ajustes: { texto: 'Requiere ajustes', simbolo: '!', tono: 'alerta' },
  invitado: { texto: 'Invitado', simbolo: '✉', tono: 'alerta' },
  'segundo-intento': { texto: '2.º intento', simbolo: '↻', tono: 'alerta' },
  acepto: { texto: 'Aceptó', simbolo: '✓', tono: 'info' },
  'no-acepto': { texto: 'No aceptó', simbolo: '✕', tono: 'error' },
  'sin-respuesta': { texto: 'Sin respuesta', simbolo: '⊘', tono: 'error' },
  entrego: { texto: 'Entregó', simbolo: '✓', tono: 'exito' },
  disponible: { texto: 'Disponible', simbolo: '✓', tono: 'exito' },
  conflicto: { texto: 'Conflicto posible', simbolo: '!', tono: 'alerta' },
  activo: { texto: 'Activo', simbolo: '✓', tono: 'exito' },
  inhabilitado: { texto: 'Inhabilitado', simbolo: '⊘', tono: 'neutro' },
  emitida: { texto: 'Emitida', simbolo: '✓', tono: 'exito' },
  entregado: { texto: 'Entregado', simbolo: '✓', tono: 'exito' },
  rebotado: { texto: 'Rebotado', simbolo: '✕', tono: 'error' },
  reintentado: { texto: 'Reintentado', simbolo: '↻', tono: 'info' },
  'en-cola': { texto: 'En cola', simbolo: '◷', tono: 'alerta' },
}

const TONOS: Record<Tono, string> = {
  exito: 'bg-estado-exito-fondo text-estado-exito',
  alerta: 'bg-estado-alerta-fondo text-estado-alerta',
  error: 'bg-estado-error-fondo text-estado-error',
  info: 'bg-estado-info-fondo text-estado-info',
  neutro: 'bg-superficie-sutil text-neutro-800',
}

export interface DistintivoEstadoProps {
  estado: EstadoDistintivo
  className?: string
}

export function DistintivoEstado({ estado, className }: DistintivoEstadoProps) {
  const { texto, simbolo, tono } = DEFINICIONES_ESTADO[estado]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-etiqueta-13',
        TONOS[tono],
        className,
      )}
    >
      <span aria-hidden="true">{simbolo}</span>
      {texto}
    </span>
  )
}
