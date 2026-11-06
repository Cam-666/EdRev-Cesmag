/*
 * CampoContrasena — password field with a "Mostrar / Ocultar" toggle next to the label.
 * Covers: RNF-11 (label, error linked to the field), HU-28.
 */
import { useState } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { CampoTexto } from './CampoTexto'

export type CampoContrasenaProps = Omit<
  ComponentPropsWithRef<typeof CampoTexto>,
  'type' | 'accionEtiqueta'
>

export function CampoContrasena(props: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false)
  return (
    <CampoTexto
      {...props}
      type={visible ? 'text' : 'password'}
      accionEtiqueta={
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="rounded-sm text-etiqueta-13 text-texto-enlace"
        >
          {visible ? 'Ocultar' : 'Mostrar'} <span className="sr-only">contraseña</span>
        </button>
      }
    />
  )
}
