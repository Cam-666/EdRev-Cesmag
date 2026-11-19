/*
 * ImagenesConstancia — the header, the footer and the signature of a constancia template: images
 * (PNG or JPG) uploaded from the computer. The signature goes where the text has {{firma}}. A
 * button shows the constancia as a PDF with sample data. Covers: RF-30, RF-45, HU-30.
 */
import { useId } from 'react'
import { FilaImagen } from './FilaImagen'
import { useVistaPreviaPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ParteImagen, Plantilla } from '@/types/plantilla'

const PARTES: Array<{ parte: ParteImagen; titulo: string }> = [
  { parte: 'encabezado', titulo: 'Encabezado' },
  { parte: 'pie', titulo: 'Pie de página' },
  { parte: 'firma', titulo: 'Firma' },
]

export function ImagenesConstancia({ plantilla }: { plantilla: Plantilla }) {
  const titulo = useId()
  const vista = useVistaPreviaPlantilla()
  const faltan = PARTES.filter((p) => !plantilla.imagenes?.[p.parte]).map((p) =>
    p.titulo.toLowerCase(),
  )
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
      {faltan.length > 0 && (
        <Alerta tipo="advertencia">
          Esta constancia no tiene {faltan.join(', ')}: el PDF se genera sin{' '}
          {faltan.length === 1 ? 'esa parte' : 'esas partes'}.
        </Alerta>
      )}
      <ul className="flex flex-col gap-3">
        {PARTES.map((p) => (
          <FilaImagen
            key={p.parte}
            plantilla={plantilla}
            actual={plantilla.imagenes?.[p.parte] ?? null}
            {...p}
          />
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
          Ver archivo en PDF
        </Boton>
      </div>
    </section>
  )
}
