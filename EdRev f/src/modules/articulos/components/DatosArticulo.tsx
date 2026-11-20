/*
 * DatosArticulo — tarjeta «Datos del artículo» de la pestaña Resumen: número de OJS, revista, tipo, número de
 * publicación, fecha de postulación y estado. Cada dato vive solo en esta pestaña.
 */
import { ETIQUETA_TIPO } from '../config/listas'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { etiquetaPublicacion } from '@/lib/dominio/publicacion'
import { formatearFecha } from '@/lib/format'
import { REVISTAS } from '@/types/revista'
import type { ArticuloDetalle } from '@/types/articulo'

export interface DatosArticuloProps {
  articulo: ArticuloDetalle
}

export function DatosArticulo({ articulo }: DatosArticuloProps) {
  const campos: Array<[string, React.ReactNode]> = [
    ['Número de OJS', articulo.numeroOjs],
    ['Revista', REVISTAS[articulo.revista].nombreCorto],
    ['Tipo de artículo', ETIQUETA_TIPO[articulo.tipo]],
    [
      'Publicación',
      articulo.publicacion ? etiquetaPublicacion(articulo.publicacion) : 'Sin asignar',
    ],
    ['Postulado', formatearFecha(articulo.fechaPostulacion)],
    ['Estado', <DistintivoEstado key="estado" estado={articulo.estado} />],
  ]
  return (
    <section
      aria-labelledby="titulo-datos"
      className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h2 id="titulo-datos" className="text-titulo-16">
        Datos del artículo
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        {campos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="text-micro-11 uppercase text-texto-secundario">{etiqueta}</dt>
            <dd className="text-cuerpo-15 text-texto-principal">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
