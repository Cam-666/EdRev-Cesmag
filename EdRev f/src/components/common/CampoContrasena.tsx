/*
 * CampoContrasena — password field with an eye toggle inside the box, at its right end: closed
 * eye while the password is hidden, open eye while it is shown.
 * Covers: RNF-11 (label, error linked to the field), HU-28.
 */
import { useState } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { CampoTexto } from './CampoTexto'

export type CampoContrasenaProps = Omit<
  ComponentPropsWithRef<typeof CampoTexto>,
  'type' | 'accionEtiqueta' | 'accionInterna'
>

export function CampoContrasena(props: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false)
  return (
    <CampoTexto
      {...props}
      type={visible ? 'text' : 'password'}
      accionInterna={
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-texto-secundario hover:text-texto-principal"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {visible ? (
              <>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.1-.9" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </>
            )}
          </svg>
        </button>
      }
    />
  )
}
