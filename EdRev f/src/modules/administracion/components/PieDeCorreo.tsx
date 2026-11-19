/*
 * PieDeCorreo — the footer image of a mail template: the signature block of whoever sends the
 * mail (name, position, contact), uploaded as a PNG or JPG. It goes below the text of every mail
 * sent with the template. Covers: RF-25, RF-31, RF-45, HU-30.
 */
import { useId } from 'react'
import { FilaImagen } from './FilaImagen'
import type { Plantilla } from '@/types/plantilla'

export function PieDeCorreo({ plantilla }: { plantilla: Plantilla }) {
  const titulo = useId()
  return (
    <section
      aria-labelledby={titulo}
      className="flex flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
    >
      <h3 id={titulo} className="text-titulo-16">
        Firma del correo
      </h3>
      <p className="text-cuerpo-13 text-texto-secundario">
        Imagen PNG o JPG de hasta 2 MB con la firma de quien envía el correo (nombre, cargo y datos
        de contacto). Aparece al final del mensaje, debajo del texto, cuando el sistema está
        publicado en Internet; mientras se prueba en un computador local los correos no la
        muestran. Si desea una firma que se vea siempre, escríbala como texto al final del
        mensaje.
      </p>
      <ul>
        <FilaImagen
          plantilla={plantilla}
          parte="pie"
          titulo="Imagen de la firma"
          actual={plantilla.imagenPie}
        />
      </ul>
    </section>
  )
}
