/*
 * MarcaIre — marca de la Revista Investigium IRE dentro de la barra superior, como el encabezado propio de la
 * revista: «Revista INVESTIGIUM[IRE] | Ciencias Sociales y Humanas» en blanco con la «IRE» en rojo, sobre la parte
 * oscura del degradado (el acento conserva un contraste de al menos 3:1 como texto grande). Por debajo del
 * punto de quiebre xl pasa a un título blanco compacto.
 */
import { REVISTAS } from '@/types/revista'

export function MarcaIre() {
  const datos = REVISTAS.ire
  return (
    <>
      <p className="relative min-w-0 flex-1 truncate text-titulo-16 xl:hidden">
        {datos.tituloBarra}
      </p>
      <div className="relative hidden min-w-0 flex-1 items-center gap-4 xl:flex">
        <span className="sr-only">{datos.nombre}</span>
        <div aria-hidden="true" className="leading-none">
          <p className="text-cuerpo-13 italic">Revista</p>
          <p className="text-titulo-20 font-bold tracking-tight">
            INVESTIGIUM<span className="text-revista-acento">IRE</span>
          </p>
        </div>
        <span aria-hidden="true" className="h-8 w-px shrink-0 bg-texto-inverso opacity-60" />
        <p aria-hidden="true" className="truncate text-titulo-16 font-normal">
          Ciencias Sociales y Humanas
        </p>
      </div>
    </>
  )
}
