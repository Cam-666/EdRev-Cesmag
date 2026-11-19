/*
 * FilaImagen — one image of a template (header, footer, signature, or the footer of a mail): its
 * current file, and the controls to upload a PNG or JPG from the computer or to remove it.
 * Covers: RF-30, RF-45, HU-30.
 */
import { useId, useState } from 'react'
import { useQuitarImagen, useSubirImagen } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ImagenPlantilla, ParteImagen, Plantilla } from '@/types/plantilla'

function tamano(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

export function FilaImagen({
  plantilla,
  parte,
  titulo,
  actual,
}: {
  plantilla: Plantilla
  parte: ParteImagen
  titulo: string
  /** The image the template has now, if any. */
  actual: ImagenPlantilla | null
}) {
  const id = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const subir = useSubirImagen()
  const quitar = useQuitarImagen()
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
            subir.mutate(
              { id: plantilla.id, parte, archivo },
              { onSuccess: () => setArchivo(null) },
            )
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
