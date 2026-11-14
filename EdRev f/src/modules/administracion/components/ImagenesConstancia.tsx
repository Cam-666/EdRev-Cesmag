/*
 * ImagenesConstancia — the header, the footer and the signature of a constancia template: images
 * (PNG or JPG) uploaded from the computer. The signature goes where the text has {{firma}}. A
 * button shows the constancia as a PDF with sample data. Covers: RF-30, RF-45, HU-30.
 */
import { useId, useState } from 'react'
import { useQuitarImagen, useSubirImagen, useVistaPreviaPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ParteImagen, Plantilla } from '@/types/plantilla'

const PARTES: Array<{ parte: ParteImagen; titulo: string }> = [
  { parte: 'encabezado', titulo: 'Encabezado' },
  { parte: 'pie', titulo: 'Pie de página' },
  { parte: 'firma', titulo: 'Firma' },
]

function tamano(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

function Fila({
  plantilla,
  parte,
  titulo,
}: {
  plantilla: Plantilla
  parte: ParteImagen
  titulo: string
}) {
  const id = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const subir = useSubirImagen()
  const quitar = useQuitarImagen()
  const actual = plantilla.imagenes?.[parte] ?? null
  const fallo = subir.isError ? subir.error : quitar.isError ? quitar.error : null

  return (
    <li className="flex flex-col gap-2 border-t border-borde-base pt-3 first:border-t-0 first:pt-0">
      <p className="text-etiqueta-13">{titulo}</p>
      <p className="text-cuerpo-13 text-texto-secundario">
        {actual ? `${actual.nombre} · ${tamano(actual.tamano)}` : 'Sin imagen'}
      </p>
      {fallo && (
        <Alerta tipo="error">{mensajeDeApi(fallo, 'No fue posible guardar la imagen.')}</Alerta>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={id} className="flex flex-col gap-1 text-cuerpo-13">
          <span className="sr-only">{`Imagen de ${titulo.toLowerCase()}`}</span>
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
        </label>
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={!archivo}
          cargando={subir.isPending}
          aria-label={`Subir ${titulo.toLowerCase()}`}
          onClick={() =>
            archivo &&
            subir.mutate({ id: plantilla.id, parte, archivo }, { onSuccess: () => setArchivo(null) })
          }
        >
          Subir
        </Boton>
        {actual && (
          <Boton
            variante="neutro"
            tamano="sm"
            cargando={quitar.isPending}
            aria-label={`Quitar ${titulo.toLowerCase()}`}
            onClick={() => quitar.mutate({ id: plantilla.id, parte })}
          >
            Quitar
          </Boton>
        )}
      </div>
    </li>
  )
}

export function ImagenesConstancia({ plantilla }: { plantilla: Plantilla }) {
  const titulo = useId()
  const vista = useVistaPreviaPlantilla()
  return (
    <section
      aria-labelledby={titulo}
      className="flex flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
    >
      <h3 id={titulo} className="text-titulo-16">
        Encabezado, pie de página y firma
      </h3>
      <p className="text-cuerpo-13 text-texto-secundario">
        Imágenes PNG o JPG de hasta 2 MB. La firma aparece donde el texto tiene {'{{firma}}'}.
      </p>
      <ul className="flex flex-col gap-3">
        {PARTES.map((p) => (
          <Fila key={p.parte} plantilla={plantilla} {...p} />
        ))}
      </ul>
      {vista.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(vista.error, 'No fue posible generar la vista previa.')}
        </Alerta>
      )}
      <div>
        <Boton
          variante="secundario"
          tamano="sm"
          cargando={vista.isPending}
          onClick={() => vista.mutate(plantilla.id)}
        >
          Ver constancia en PDF
        </Boton>
      </div>
    </section>
  )
}
