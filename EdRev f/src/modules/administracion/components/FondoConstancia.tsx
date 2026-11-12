/*
 * FondoConstancia — the PDF background of a constancia template (letterhead, design and the
 * Administradora's signature) on which the system writes the text. Shows the current file and
 * uploads a new one; only PDF files are accepted. Covers: RF-30, RF-45, HU-30 (criterion 3).
 */
import { useId, useState } from 'react'
import { useSubirFondo } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import type { Plantilla } from '@/types/plantilla'

export interface FondoConstanciaProps {
  plantilla: Plantilla
}

function tamano(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

export function FondoConstancia({ plantilla }: FondoConstanciaProps) {
  const id = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subido, setSubido] = useState(false)
  const subir = useSubirFondo()
  const fondo = plantilla.fondoPdf

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
    >
      <h3 id={`${id}-titulo`} className="text-titulo-16">
        PDF de fondo
      </h3>
      <p className="text-cuerpo-15">
        {fondo ? `${fondo.nombre} · ${tamano(fondo.tamano)}` : 'Sin PDF de fondo'}
      </p>
      {subir.isError && (
        <Alerta tipo="error">{mensajeDeApi(subir.error, 'No fue posible subir el PDF.')}</Alerta>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={`${id}-archivo`} className="flex flex-col gap-1 text-etiqueta-13">
          Nuevo PDF de fondo
          <input
            id={`${id}-archivo`}
            type="file"
            accept="application/pdf,.pdf"
            className="text-cuerpo-13"
            onChange={(e) => {
              setSubido(false)
              setArchivo(e.target.files?.[0] ?? null)
            }}
          />
        </label>
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={!archivo}
          cargando={subir.isPending}
          onClick={() =>
            archivo &&
            subir.mutate({ id: plantilla.id, archivo }, { onSuccess: () => setSubido(true) })
          }
        >
          Subir PDF
        </Boton>
      </div>
      <p role="status" className="text-cuerpo-13 text-estado-exito">
        {subido ? 'PDF de fondo actualizado.' : ''}
      </p>
    </section>
  )
}
