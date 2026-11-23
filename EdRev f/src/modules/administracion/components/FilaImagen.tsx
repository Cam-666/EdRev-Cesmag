/*
 * FilaImagen — una imagen de una plantilla de constancia (encabezado, pie o firma): su archivo actual y los
 * controles para subir un PNG o JPG desde el computador o quitarlo. Una imagen muy grande (una foto de 20 MB, por
 * ejemplo) se reduce en el navegador antes de subirla, a un tamaño de buena calidad para imprimir: así la constancia
 * en PDF no pesa decenas de MB y el servicio de correo no la rechaza como adjunto.
 */
import { useId, useState } from 'react'
import { useQuitarImagen, useSubirImagen } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ImagenPlantilla, ParteImagen, Plantilla } from '@/types/plantilla'

/** Lado mayor con el que se guarda la imagen: alcanza para imprimir el membrete a 300 ppp. */
const LADO_MAXIMO = 2400
const LIMITE_SIN_REDUCIR = 1.5 * 1024 * 1024

/** La imagen reducida para la constancia, o la misma si ya es liviana o el navegador no puede reducirla. */
async function reducir(archivo: File): Promise<File> {
  if (archivo.size <= LIMITE_SIN_REDUCIR || typeof createImageBitmap !== 'function') return archivo
  try {
    const imagen = await createImageBitmap(archivo)
    const k = Math.min(1, LADO_MAXIMO / imagen.width, LADO_MAXIMO / imagen.height)
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(imagen.width * k)
    lienzo.height = Math.round(imagen.height * k)
    const contexto = lienzo.getContext('2d')
    if (!contexto) return archivo
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
    // Un PNG sigue siendo PNG (conserva la transparencia); una foto JPG se guarda como JPG de buena calidad.
    const tipo = archivo.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const reducida = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, tipo, 0.92))
    return reducida && reducida.size < archivo.size
      ? new File([reducida], archivo.name, { type: tipo })
      : archivo
  } catch {
    return archivo
  }
}

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
  /** La imagen que tiene la plantilla ahora, si la hay. */
  actual: ImagenPlantilla | null
}) {
  const id = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preparando, setPreparando] = useState(false)
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
          cargando={subir.isPending || preparando}
          aria-label={`Subir ${titulo.toLowerCase()}`}
          onClick={async () => {
            if (!archivo) return
            setPreparando(true)
            const lista = await reducir(archivo)
            setPreparando(false)
            subir.mutate(
              { id: plantilla.id, parte, archivo: lista },
              { onSuccess: () => setArchivo(null) },
            )
          }}
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
