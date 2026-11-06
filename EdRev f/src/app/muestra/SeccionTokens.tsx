/*
 * SeccionTokens — part of the design-system showcase (development only).
 * Covers: RNF-11, RNF-12.
 */
import { Seccion } from './Seccion'

const COLORES: Array<{ nombre: string; clase: string }> = [
  { nombre: 'cesmag-azul', clase: 'bg-cesmag-azul' },
  { nombre: 'cesmag-azul-panel', clase: 'bg-cesmag-azul-panel' },
  { nombre: 'cesmag-azul-oscuro', clase: 'bg-cesmag-azul-oscuro' },
  { nombre: 'cesmag-rojo', clase: 'bg-cesmag-rojo' },
  { nombre: 'neutro-0', clase: 'bg-neutro-0' },
  { nombre: 'neutro-50', clase: 'bg-neutro-50' },
  { nombre: 'neutro-100', clase: 'bg-neutro-100' },
  { nombre: 'neutro-200', clase: 'bg-neutro-200' },
  { nombre: 'neutro-300', clase: 'bg-neutro-300' },
  { nombre: 'neutro-400 (decorativo)', clase: 'bg-neutro-400' },
  { nombre: 'neutro-600', clase: 'bg-neutro-600' },
  { nombre: 'neutro-800', clase: 'bg-neutro-800' },
  { nombre: 'neutro-900', clase: 'bg-neutro-900' },
  { nombre: 'estado-exito', clase: 'bg-estado-exito' },
  { nombre: 'estado-alerta', clase: 'bg-estado-alerta' },
  { nombre: 'estado-error', clase: 'bg-estado-error' },
  { nombre: 'estado-info', clase: 'bg-estado-info' },
]

const TIPOGRAFIA: Array<{ nombre: string; clase: string }> = [
  { nombre: 'Display 32/40', clase: 'text-display' },
  { nombre: 'Título 24', clase: 'text-titulo-24' },
  { nombre: 'Título 20', clase: 'text-titulo-20' },
  { nombre: 'Título 16', clase: 'text-titulo-16' },
  { nombre: 'Cuerpo 15', clase: 'text-cuerpo-15' },
  { nombre: 'Cuerpo 15 énfasis', clase: 'text-cuerpo-15-enfasis' },
  { nombre: 'Cuerpo 13', clase: 'text-cuerpo-13' },
  { nombre: 'Etiqueta 13', clase: 'text-etiqueta-13' },
  { nombre: 'Micro 11', clase: 'text-micro-11 uppercase' },
]

export function SeccionTokens() {
  return (
    <>
      <Seccion titulo="Colores (tokens)">
        <ul className="grid grid-cols-4 gap-3">
          {COLORES.map((c) => (
            <li key={c.nombre} className="flex items-center gap-2 text-cuerpo-13">
              <span className={`h-8 w-8 rounded-md border border-borde-fuerte ${c.clase}`} />
              {c.nombre}
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Tipografía (Inter)">
        <ul className="flex flex-col gap-2">
          {TIPOGRAFIA.map((t) => (
            <li key={t.nombre} className={t.clase}>
              {t.nombre} — Registro editorial de artículos
            </li>
          ))}
        </ul>
      </Seccion>
    </>
  )
}
